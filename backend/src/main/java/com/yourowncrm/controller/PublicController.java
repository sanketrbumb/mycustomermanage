package com.yourowncrm.controller;

import com.yourowncrm.exception.BusinessException;
import com.yourowncrm.model.Tenant;
import com.yourowncrm.model.User;
import com.yourowncrm.model.enums.UserRole;
import com.yourowncrm.repository.TenantRepository;
import com.yourowncrm.repository.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/public")
public class PublicController {

    private static final Logger log   = LoggerFactory.getLogger(PublicController.class);
    private static final Logger AUDIT = LoggerFactory.getLogger("AUDIT");

    private final TenantRepository tenantRepo;
    private final UserRepository   userRepo;
    private final PasswordEncoder  encoder;

    @Autowired
    public PublicController(TenantRepository tenantRepo,
                            UserRepository userRepo,
                            PasswordEncoder encoder) {
        this.tenantRepo = tenantRepo;
        this.userRepo   = userRepo;
        this.encoder    = encoder;
    }

    /** Real-time slug availability check — called as the user types in the signup form */
    @GetMapping("/check-slug")
    public Map<String, Object> checkSlug(@RequestParam String slug) {
        String normalised = normaliseSlug(slug);
        boolean available = !tenantRepo.existsBySlug(normalised);
        return Map.of("slug", normalised, "available", available);
    }

    /**
     * Self-serve tenant registration.
     * Creates a Tenant + SUPER_ADMIN user in a single operation.
     * The new admin can then log in and configure locations, staff etc.
     */
    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> signup(@Valid @RequestBody SignupRequest req) {
        String slug = normaliseSlug(req.getOrgSlug());

        if (slug.length() < 3) {
            throw new BusinessException(
                "Organisation URL must be at least 3 characters (letters, numbers, hyphens only).");
        }
        if (tenantRepo.existsBySlug(slug)) {
            throw new BusinessException(
                "That organisation URL is already taken. Please choose a different one.");
        }
        if (userRepo.existsByUsernameIgnoreCase(req.getUsername().trim())) {
            throw new BusinessException(
                "Username '" + req.getUsername().trim() + "' is already in use. Please choose another.");
        }

        // Create tenant
        Tenant tenant = new Tenant();
        tenant.setId(UUID.randomUUID());
        tenant.setName(req.getOrgName().trim());
        tenant.setSlug(slug);
        tenant = tenantRepo.save(tenant);

        // Create SUPER_ADMIN user
        User admin = new User();
        admin.setTenantId(tenant.getId());
        admin.setUsername(req.getUsername().toLowerCase().trim());
        admin.setFirstName(req.getFirstName().trim());
        admin.setLastName(req.getLastName().trim());
        admin.setEmail(req.getEmail().toLowerCase().trim());
        admin.setPhone(req.getPhone() != null ? req.getPhone().trim() : null);
        admin.setPasswordHash(encoder.encode(req.getPassword()));
        admin.setRole(UserRole.SUPER_ADMIN);
        admin.setActive(true);
        admin.setCanBookAppts(true);
        userRepo.save(admin);

        AUDIT.info("NEW_TENANT_SIGNUP org=\"{}\" slug=\"{}\" admin=\"{}\" email=\"{}\"",
                tenant.getName(), slug, req.getUsername(), req.getEmail());
        log.info("New tenant registered: {} (slug: {}, admin: {})",
                tenant.getName(), slug, req.getUsername());

        return Map.of(
            "orgName",  tenant.getName(),
            "slug",     slug,
            "username", admin.getUsername(),
            "message",  "Account created successfully. You can now log in."
        );
    }

    /** Converts any user input into a safe org slug */
    private String normaliseSlug(String input) {
        if (input == null) return "";
        return input.toLowerCase().trim()
                .replaceAll("[^a-z0-9-]", "-")
                .replaceAll("-{2,}", "-")
                .replaceAll("^-+|-+$", "");
    }

    public static class SignupRequest {
        @NotBlank @Size(min = 2, max = 100)
        private String orgName;

        @NotBlank @Size(min = 3, max = 40)
        private String orgSlug;

        @NotBlank @Size(min = 2, max = 50)
        private String firstName;

        @NotBlank @Size(min = 2, max = 50)
        private String lastName;

        @NotBlank @Email
        private String email;

        private String phone;

        @NotBlank @Size(min = 3, max = 30)
        private String username;

        @NotBlank @Size(min = 8, max = 128)
        private String password;

        public String getOrgName()    { return orgName; }
        public String getOrgSlug()    { return orgSlug; }
        public String getFirstName()  { return firstName; }
        public String getLastName()   { return lastName; }
        public String getEmail()      { return email; }
        public String getPhone()      { return phone; }
        public String getUsername()   { return username; }
        public String getPassword()   { return password; }
        public void setOrgName(String v)   { this.orgName = v; }
        public void setOrgSlug(String v)   { this.orgSlug = v; }
        public void setFirstName(String v) { this.firstName = v; }
        public void setLastName(String v)  { this.lastName = v; }
        public void setEmail(String v)     { this.email = v; }
        public void setPhone(String v)     { this.phone = v; }
        public void setUsername(String v)  { this.username = v; }
        public void setPassword(String v)  { this.password = v; }
    }
}
