#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# Your Own CRM — Daily PostgreSQL Backup Script
#
# SETUP:
# 1. Copy this file to /opt/yourowncrm/backup.sh
# 2. chmod +x /opt/yourowncrm/backup.sh
# 3. Edit the variables below
# 4. Test it: sudo -u postgres /opt/yourowncrm/backup.sh
# 5. Schedule via cron:
#       crontab -e
#       # Run daily at 2 AM
#       0 2 * * * /opt/yourowncrm/backup.sh >> /var/log/yourowncrm-backup.log 2>&1
#
# OPTIONAL — upload to cloud storage:
#   GCP: install gcloud CLI, set UPLOAD_TO_GCS=true, set GCS_BUCKET
#   OCI: install oci CLI, set UPLOAD_TO_OCI=true, set OCI_BUCKET
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────
DB_NAME="${DB_NAME:-yourowncrm}"
DB_USER="${DB_USER:-yourowncrm}"
BACKUP_DIR="${BACKUP_DIR:-/opt/yourowncrm/backups}"
RETAIN_DAYS="${RETAIN_DAYS:-30}"            # Delete backups older than this
COMPRESS=true                               # gzip the dump

# Cloud upload (optional — set to true to enable)
UPLOAD_TO_GCS="${UPLOAD_TO_GCS:-false}"
GCS_BUCKET="${GCS_BUCKET:-gs://yourowncrm-backups}"

UPLOAD_TO_OCI="${UPLOAD_TO_OCI:-false}"
OCI_BUCKET="${OCI_BUCKET:-yourowncrm-backups}"
OCI_NAMESPACE="${OCI_NAMESPACE:-}"          # Object storage namespace

# Notification (optional)
NOTIFY_EMAIL="${NOTIFY_EMAIL:-}"            # Set to email address to notify on failure
# ──────────────────────────────────────────────────────────────────

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="${DB_NAME}_${TIMESTAMP}.sql"
FILEPATH="${BACKUP_DIR}/${FILENAME}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

log "═══ Your Own CRM Backup Starting ═══"
log "Database: ${DB_NAME}"
log "Destination: ${BACKUP_DIR}"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# ── Dump the database ──────────────────────────────────────────────
log "Running pg_dump..."
pg_dump \
    --username="${DB_USER}" \
    --format=plain \
    --no-password \
    --encoding=UTF8 \
    "${DB_NAME}" > "${FILEPATH}"

DUMP_SIZE=$(du -sh "${FILEPATH}" | cut -f1)
log "Dump complete: ${DUMP_SIZE}"

# ── Compress ───────────────────────────────────────────────────────
if [ "${COMPRESS}" = "true" ]; then
    gzip "${FILEPATH}"
    FILEPATH="${FILEPATH}.gz"
    FILENAME="${FILENAME}.gz"
    COMPRESSED_SIZE=$(du -sh "${FILEPATH}" | cut -f1)
    log "Compressed: ${COMPRESSED_SIZE}"
fi

# ── Upload to GCS ──────────────────────────────────────────────────
if [ "${UPLOAD_TO_GCS}" = "true" ]; then
    log "Uploading to Google Cloud Storage: ${GCS_BUCKET}..."
    if command -v gsutil &>/dev/null; then
        gsutil cp "${FILEPATH}" "${GCS_BUCKET}/${FILENAME}"
        log "GCS upload complete."
    else
        log "WARNING: gsutil not found. Install the gcloud CLI to enable GCS uploads."
    fi
fi

# ── Upload to OCI Object Storage ───────────────────────────────────
if [ "${UPLOAD_TO_OCI}" = "true" ]; then
    log "Uploading to OCI Object Storage: ${OCI_BUCKET}..."
    if command -v oci &>/dev/null; then
        oci os object put \
            --namespace "${OCI_NAMESPACE}" \
            --bucket-name "${OCI_BUCKET}" \
            --name "backups/${FILENAME}" \
            --file "${FILEPATH}" \
            --force
        log "OCI upload complete."
    else
        log "WARNING: oci CLI not found. Install it to enable OCI uploads."
    fi
fi

# ── Prune old local backups ────────────────────────────────────────
log "Pruning backups older than ${RETAIN_DAYS} days..."
DELETED=$(find "${BACKUP_DIR}" -name "${DB_NAME}_*.sql*" -mtime +${RETAIN_DAYS} -print -delete | wc -l)
log "Deleted ${DELETED} old backup(s)."

# ── List current backups ───────────────────────────────────────────
log "Current backups in ${BACKUP_DIR}:"
ls -lh "${BACKUP_DIR}" | grep "${DB_NAME}_" || true

log "═══ Backup Complete: ${FILENAME} ═══"
