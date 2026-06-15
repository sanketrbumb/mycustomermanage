package com.yourowncrm.controller;
import com.yourowncrm.dto.request.LoginRequest;
import com.yourowncrm.dto.response.AuthResponse;
import com.yourowncrm.security.JwtTokenProvider;
import com.yourowncrm.service.UserService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/auth") public class AuthController {
    private static final Logger AUDIT = LoggerFactory.getLogger("AUDIT");

    private final UserService userService;
    private final JwtTokenProvider jwtProvider;

    @org.springframework.beans.factory.annotation.Autowired
    public AuthController(UserService userService, JwtTokenProvider jwtProvider) {
        this.userService = userService;
        this.jwtProvider = jwtProvider;
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        return userService.login(req);
    }

    /**
     * Logout is stateless (JWT) — there's no server-side session to invalidate.
     * This endpoint exists purely to record a LOGOUT audit entry.
     * The frontend should call this before discarding its token.
     */
    @PostMapping("/logout")
    public void logout(@RequestHeader(value = "Authorization", required = false) String token) {
        if (token != null && token.startsWith("Bearer ")) {
            try {
                Long userId   = jwtProvider.getUserId(token.substring(7));
                String username = jwtProvider.getUsername(token.substring(7));
                AUDIT.info("LOGOUT user={} userId={}", username, userId);
            } catch (Exception e) {
                AUDIT.info("LOGOUT (invalid/expired token)");
            }
        } else {
            AUDIT.info("LOGOUT (no token)");
        }
    }
}
