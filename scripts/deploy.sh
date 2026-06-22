#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# Your Own CRM — Server Setup & Deployment Script
#
# Run this ONCE on a fresh Ubuntu 22.04 VM (GCP or OCI):
#   curl -fsSL https://your-server/deploy.sh | bash
#
# Or copy to the server and run:
#   chmod +x deploy.sh && sudo ./deploy.sh
#
# What this does:
#   1. Installs Java 17, PostgreSQL 16, Nginx, Certbot
#   2. Creates the database and user
#   3. Sets up the Spring Boot backend as a systemd service
#   4. Configures Nginx to serve Angular and proxy /api/ to Spring Boot
#   5. Installs a TLS certificate via Let's Encrypt
#   6. Sets up the daily backup cron job
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

# ── EDIT THESE BEFORE RUNNING ──────────────────────────────────────
DOMAIN="yourdomain.com"            # Your domain (must point to this server)
DB_PASSWORD="CHANGE_THIS_NOW"      # Strong database password
JWT_SECRET="$(openssl rand -base64 32)"  # Auto-generated JWT secret
APP_DIR="/opt/yourowncrm"
JAR_NAME="yourowncrm-backend.jar"
# ──────────────────────────────────────────────────────────────────

echo "═══ Your Own CRM Server Setup ═══"
echo "Domain: ${DOMAIN}"

# ── 1. System packages ─────────────────────────────────────────────
echo "[1/7] Installing system packages..."
apt-get update -qq
apt-get install -y -qq \
    openjdk-17-jdk \
    postgresql postgresql-contrib \
    nginx \
    certbot python3-certbot-nginx \
    curl wget unzip gzip \
    ufw

# ── 2. Configure firewall ──────────────────────────────────────────
echo "[2/7] Configuring firewall..."
ufw --force enable
ufw allow ssh
ufw allow 'Nginx Full'

# ── 3. PostgreSQL setup ────────────────────────────────────────────
echo "[3/7] Configuring PostgreSQL..."
systemctl enable postgresql
systemctl start postgresql

sudo -u postgres psql -c "
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'yourowncrm') THEN
    CREATE USER yourowncrm WITH PASSWORD '${DB_PASSWORD}';
  END IF;
END\$\$;
"
sudo -u postgres psql -c "
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'yourowncrm') THEN
    CREATE DATABASE yourowncrm OWNER yourowncrm;
  END IF;
END\$\$;
"
sudo -u postgres psql -d yourowncrm -c "GRANT ALL ON SCHEMA public TO yourowncrm;"
echo "PostgreSQL ready."

# ── 4. App directory ───────────────────────────────────────────────
echo "[4/7] Creating app directory structure..."
mkdir -p ${APP_DIR}/{backups,logs,frontend}
chmod 750 ${APP_DIR}

# Create the environment file (secrets go here, not in the JAR)
cat > ${APP_DIR}/.env << ENVEOF
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/yourowncrm
SPRING_DATASOURCE_USERNAME=yourowncrm
SPRING_DATASOURCE_PASSWORD=${DB_PASSWORD}
APP_JWT_SECRET=${JWT_SECRET}
APP_JWT_EXPIRY_MS=86400000

# Email (optional — set your SendGrid key to enable)
APP_EMAIL_SENDGRID_API_KEY=
APP_EMAIL_FROM_ADDRESS=noreply@${DOMAIN}
APP_EMAIL_FROM_NAME=Your Own CRM
APP_EMAIL_ENABLED=false

# Backup
DB_NAME=yourowncrm
DB_USER=yourowncrm
BACKUP_DIR=${APP_DIR}/backups
RETAIN_DAYS=30
ENVEOF
chmod 600 ${APP_DIR}/.env
echo "Environment file created at ${APP_DIR}/.env"
echo "⚠  Edit ${APP_DIR}/.env before starting the app!"

# ── 5. Systemd service ─────────────────────────────────────────────
echo "[5/7] Creating systemd service..."
cat > /etc/systemd/system/yourowncrm.service << SVCEOF
[Unit]
Description=Your Own CRM Backend
Documentation=https://github.com/sanketbumb/mycustomermanage
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=/usr/bin/java \
    -Xms256m -Xmx512m \
    -Dserver.port=8080 \
    -Dspring.profiles.active=prod \
    -jar ${APP_DIR}/${JAR_NAME}
Restart=always
RestartSec=10
StandardOutput=append:${APP_DIR}/logs/yourowncrm.log
StandardError=append:${APP_DIR}/logs/yourowncrm-error.log
SyslogIdentifier=yourowncrm

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
systemctl enable yourowncrm
echo "Systemd service created. Start with: systemctl start yourowncrm"

# ── 6. Nginx config ────────────────────────────────────────────────
echo "[6/7] Configuring Nginx..."
cat > /etc/nginx/sites-available/yourowncrm << NGXEOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    # Angular SPA — serve index.html for all routes
    root ${APP_DIR}/frontend;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    # Static assets — long cache
    location ~* \.(js|css|png|jpg|ico|woff2|woff)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API — proxy to Spring Boot
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host              \$host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 30s;
        proxy_read_timeout    60s;
        proxy_send_timeout    60s;
        client_max_body_size  10m;
    }

    # Security headers
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-Content-Type-Options nosniff;
    add_header Referrer-Policy strict-origin-when-cross-origin;
}
NGXEOF

ln -sf /etc/nginx/sites-available/yourowncrm /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "Nginx configured."

# ── 7. TLS certificate ─────────────────────────────────────────────
echo "[7/7] Obtaining TLS certificate..."
if [ "${DOMAIN}" != "yourdomain.com" ]; then
    certbot --nginx \
        --non-interactive \
        --agree-tos \
        --email "admin@${DOMAIN}" \
        -d "${DOMAIN}" \
        -d "www.${DOMAIN}" \
        --redirect
    echo "TLS certificate installed."
else
    echo "⚠  Skipping TLS — replace 'yourdomain.com' with your real domain."
fi

# ── Backup cron ────────────────────────────────────────────────────
cp ${APP_DIR}/scripts/backup.sh ${APP_DIR}/backup.sh 2>/dev/null || true
chmod +x ${APP_DIR}/backup.sh
(crontab -l 2>/dev/null; echo "0 2 * * * ${APP_DIR}/backup.sh >> ${APP_DIR}/logs/backup.log 2>&1") | crontab -
echo "Daily backup cron installed (runs at 2 AM)."

echo ""
echo "═══════════════════════════════════════════════"
echo "✅  Server setup complete!"
echo ""
echo "NEXT STEPS:"
echo "1. Copy the Spring Boot JAR to: ${APP_DIR}/${JAR_NAME}"
echo "2. Copy the built Angular files to: ${APP_DIR}/frontend/"
echo "3. Edit: ${APP_DIR}/.env (set SendGrid key etc.)"
echo "4. Start the app: systemctl start yourowncrm"
echo "5. Check logs: journalctl -u yourowncrm -f"
echo "═══════════════════════════════════════════════"
