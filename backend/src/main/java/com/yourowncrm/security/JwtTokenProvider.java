package com.yourowncrm.security;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;
import java.util.logging.Logger;

@Component
public class JwtTokenProvider {
    private static final Logger log = Logger.getLogger(JwtTokenProvider.class.getName());

    @Value("${app.jwt.secret}") private String jwtSecret;
    @Value("${app.jwt.expiration-ms}") private long jwtExpirationMs;

    private SecretKey key() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(Long userId, String username, String role, UUID tenantId) {
        return Jwts.builder()
            .subject(String.valueOf(userId))
            .claim("username", username)
            .claim("role", role)
            .claim("tenantId", tenantId.toString())
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + jwtExpirationMs))
            .signWith(key())
            .compact();
    }

    public Claims parseToken(String token) {
        return Jwts.parser().verifyWith(key()).build()
            .parseSignedClaims(token).getPayload();
    }

    public boolean validateToken(String token) {
        try { parseToken(token); return true; }
        catch (JwtException | IllegalArgumentException e) {
            log.warning("Invalid JWT: " + e.getMessage());
            return false;
        }
    }

    public Long getUserId(String token) { return Long.valueOf(parseToken(token).getSubject()); }
    public String getUsername(String token) { return parseToken(token).get("username", String.class); }
    public UUID getTenantId(String token) { return UUID.fromString(parseToken(token).get("tenantId", String.class)); }
}
