package com.yourowncrm.security;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import org.springframework.security.core.GrantedAuthority;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;
    private final PermissionService permissionService;
    private final ServerInstance serverInstance;

    @Autowired
    public JwtAuthenticationFilter(JwtTokenProvider tokenProvider,
                                   PermissionService permissionService,
                                   ServerInstance serverInstance) {
        this.tokenProvider     = tokenProvider;
        this.permissionService = permissionService;
        this.serverInstance    = serverInstance;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req,
                                    HttpServletResponse res,
                                    FilterChain chain) throws ServletException, IOException {
        String token = resolveToken(req);
        if (token != null && tokenProvider.validateToken(token)) {
            // Feature: log out all users on server restart.
            // Tokens issued before this server started carry an old "srv" claim
            // that no longer matches — reject them silently (no authentication set).
            String tokenSrv = tokenProvider.getServerInstanceId(token);
            if (tokenSrv == null || !tokenSrv.equals(serverInstance.getInstanceId())) {
                chain.doFilter(req, res);
                return;
            }

            var claims = tokenProvider.parseToken(token);
            String role = claims.get("role", String.class);
            UUID tenantId = UUID.fromString(claims.get("tenantId", String.class));
            Long userId = Long.valueOf(claims.getSubject());

            Set<String> permissions = permissionService.permissionNamesFor(tenantId, userId);
            List<GrantedAuthority> authorities = new ArrayList<>();
            authorities.add(new SimpleGrantedAuthority("ROLE_" + role));
            for (String perm : permissions) {
                authorities.add(new SimpleGrantedAuthority(perm));
            }

            var auth = new UsernamePasswordAuthenticationToken(
                    claims,
                    null,
                    authorities);
            SecurityContextHolder.getContext().setAuthentication(auth);
        }
        chain.doFilter(req, res);
    }

    private String resolveToken(HttpServletRequest req) {
        String bearer = req.getHeader("Authorization");
        if (StringUtils.hasText(bearer) && bearer.startsWith("Bearer ")) {
            return bearer.substring(7);
        }
        return null;
    }
}
