package com.yourowncrm.config;

import com.yourowncrm.model.Tenant;
import com.yourowncrm.model.User;
import com.yourowncrm.model.enums.UserRole;
import com.yourowncrm.repository.TenantRepository;
import com.yourowncrm.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import java.util.UUID;
import java.util.logging.Logger;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = Logger.getLogger(DataSeeder.class.getName());
    private static final UUID DEMO_TENANT_ID =
        UUID.fromString("a0000000-0000-0000-0000-000000000001");

    private final TenantRepository tenantRepo;
    private final UserRepository   userRepo;
    private final PasswordEncoder  passwordEncoder;

    @Autowired
    public DataSeeder(TenantRepository tenantRepo,
                      UserRepository userRepo,
                      PasswordEncoder passwordEncoder) {
        this.tenantRepo      = tenantRepo;
        this.userRepo        = userRepo;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (tenantRepo.findBySlug("demo").isPresent()) {
            log.info("Demo tenant exists — skipping seed.");
            return;
        }

        Tenant tenant = new Tenant();
        tenant.setId(DEMO_TENANT_ID);
        tenant.setName("Your Own CRM");
        tenant.setSlug("demo");
        tenant.setTimezone("America/New_York");
        tenant.setCurrencyCode("USD");
        tenant.setActive(true);
        tenantRepo.save(tenant);
        log.info("Seeded demo tenant.");

        seedUser("admin",   "admin@yourowncrm.com",   "admin123",   "Admin",   "User",    UserRole.SUPER_ADMIN);
        seedUser("manager", "manager@yourowncrm.com", "manager123", "Jane",    "Smith",   UserRole.MANAGER);
        seedUser("staff",   "staff@yourowncrm.com",   "staff123",   "John",    "Doe",     UserRole.STAFF);

        log.info("============================================");
        log.info("Login credentials (organization: demo)");
        log.info("  admin   / admin123");
        log.info("  manager / manager123");
        log.info("  staff   / staff123");
        log.info("============================================");
    }

    private void seedUser(String username, String email, String pwd,
                          String first, String last, UserRole role) {
        User u = new User();
        u.setTenantId(DEMO_TENANT_ID);
        u.setUsername(username);
        u.setEmail(email);
        u.setPasswordHash(passwordEncoder.encode(pwd));
        u.setFirstName(first);
        u.setLastName(last);
        u.setRole(role);
        u.setActive(true);
        u.setLocked(false);
        u.setFailCount((short) 0);
        userRepo.save(u);
    }
}
