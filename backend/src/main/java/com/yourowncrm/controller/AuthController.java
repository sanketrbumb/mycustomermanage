package com.yourowncrm.controller;
import com.yourowncrm.dto.request.LoginRequest;
import com.yourowncrm.dto.response.AuthResponse;
import com.yourowncrm.service.UserService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/auth") public class AuthController {
    private final UserService userService;
    @org.springframework.beans.factory.annotation.Autowired
    public AuthController(UserService userService) {
        this.userService = userService;
    }


    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        return userService.login(req);
    }
}
