package com.yourowncrm.controller;
import com.yourowncrm.model.User;
import com.yourowncrm.security.JwtTokenProvider;
import com.yourowncrm.service.UserService;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController @RequestMapping("/api/users") public class UserController {
    private final UserService userService;
    private final JwtTokenProvider jwtProvider;
    @org.springframework.beans.factory.annotation.Autowired
    public UserController(UserService userService, JwtTokenProvider jwtProvider) {
        this.userService = userService;
        this.jwtProvider = jwtProvider;
    }


    @GetMapping
    public List<User> getAll(@RequestHeader("Authorization") String t) {
        return userService.getAll(tid(t));
    }
    @GetMapping("/{id}")
    public User getById(@RequestHeader("Authorization") String t, @PathVariable Long id) {
        return userService.getById(tid(t), id);
    }
    @PostMapping
    @PreAuthorize("hasAuthority('USER_CREATE')")
    public ResponseEntity<User> create(@RequestHeader("Authorization") String t,
                                       @RequestBody Map<String,Object> req) {
        return ResponseEntity.status(201).body(userService.create(tid(t), injectCreatedBy(t, req)));
    }
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('USER_EDIT')")
    public User update(@RequestHeader("Authorization") String t,
                       @PathVariable Long id, @RequestBody Map<String,Object> req) {
        req.put("_updatedBy", jwtProvider.getUserId(t.substring(7)));
        return userService.update(tid(t), id, req);
    }
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('USER_DEACTIVATE')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivate(@RequestHeader("Authorization") String t, @PathVariable Long id) {
        userService.deactivate(tid(t), id);
    }
    private UUID tid(String h) { return jwtProvider.getTenantId(h.substring(7)); }

    private java.util.Map<String,Object> injectCreatedBy(String token, java.util.Map<String,Object> req) {
        req.put("_createdBy", jwtProvider.getUserId(token.substring(7)));
        return req;
    }
}