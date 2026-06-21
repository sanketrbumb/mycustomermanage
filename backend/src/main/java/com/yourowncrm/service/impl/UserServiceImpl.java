package com.yourowncrm.service.impl;

import com.yourowncrm.dto.request.LoginRequest;
import com.yourowncrm.dto.response.AuthResponse;
import com.yourowncrm.exception.BusinessException;
import com.yourowncrm.exception.ResourceNotFoundException;
import com.yourowncrm.model.User;
import com.yourowncrm.model.enums.UserRole;
import com.yourowncrm.repository.LocationRepository;
import com.yourowncrm.repository.TenantRepository;
import com.yourowncrm.repository.UserRepository;
import com.yourowncrm.security.JwtTokenProvider;
import com.yourowncrm.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.logging.Logger;

@Service
public class UserServiceImpl implements UserService {

    private static final org.slf4j.Logger AUDIT = LoggerFactory.getLogger("AUDIT");

    private static final Logger log = Logger.getLogger(UserServiceImpl.class.getName());
    private static final int MAX_FAIL = 5;

    private final UserRepository     userRepo;
    private final TenantRepository   tenantRepo;
    private final LocationRepository locationRepo;
    private final PasswordEncoder    encoder;
    private final JwtTokenProvider   jwtProvider;

    @Autowired
    public UserServiceImpl(UserRepository userRepo, TenantRepository tenantRepo,
                           LocationRepository locationRepo,
                           PasswordEncoder encoder, JwtTokenProvider jwtProvider) {
        this.userRepo     = userRepo;
        this.tenantRepo   = tenantRepo;
        this.locationRepo = locationRepo;
        this.encoder      = encoder;
        this.jwtProvider  = jwtProvider;
    }

    @Override
    @Transactional
    public AuthResponse login(LoginRequest req) {
        var tenant = tenantRepo.findBySlug(req.getTenantSlug())
            .orElseThrow(() -> {
                AUDIT.warn("LOGIN_FAILED user={} tenant={} reason=tenant_not_found",
                        req.getUsername(), req.getTenantSlug());
                return new BusinessException("Organisation not found: " + req.getTenantSlug());
            });
        var user = userRepo.findByTenantIdAndUsername(tenant.getId(), req.getUsername())
            .orElseThrow(() -> {
                AUDIT.warn("LOGIN_FAILED user={} tenant={} reason=user_not_found",
                        req.getUsername(), req.getTenantSlug());
                return new BusinessException("Invalid credentials");
            });

        if (!user.isActive()) {
            AUDIT.warn("LOGIN_FAILED user={} tenant={} reason=account_deactivated",
                    req.getUsername(), req.getTenantSlug());
            throw new BusinessException("Account is deactivated");
        }
        if (user.isLocked()) {
            AUDIT.warn("LOGIN_FAILED user={} tenant={} reason=account_locked",
                    req.getUsername(), req.getTenantSlug());
            throw new BusinessException("Account locked — contact your administrator");
        }

        if (!encoder.matches(req.getPassword(), user.getPasswordHash())) {
            short fails = (short)(user.getFailCount() + 1);
            user.setFailCount(fails);
            if (fails >= MAX_FAIL) {
                user.setLocked(true);
                log.warning("User " + user.getUsername() + " locked after " + fails + " failures");
                AUDIT.warn("ACCOUNT_LOCKED user={} tenant={} failures={}",
                        user.getUsername(), req.getTenantSlug(), fails);
            }
            userRepo.save(user);
            AUDIT.warn("LOGIN_FAILED user={} tenant={} reason=bad_password attempt={}",
                    req.getUsername(), req.getTenantSlug(), fails);
            throw new BusinessException("Invalid credentials");
        }

        user.setFailCount((short) 0);
        user.setLastLoginAt(Instant.now());
        userRepo.save(user);

        AUDIT.info("LOGIN_SUCCESS user={} userId={} tenant={} role={}",
                user.getUsername(), user.getId(), req.getTenantSlug(), user.getRole());

        String token = jwtProvider.generateToken(
            user.getId(), user.getUsername(), user.getRole().name(), tenant.getId());

        AuthResponse res = new AuthResponse();
        res.setAccessToken(token);
        res.setUserId(user.getId());
        res.setUsername(user.getUsername());
        res.setFullName(user.getFirstName() + " " + user.getLastName());
        res.setRole(user.getRole());
        res.setTenantId(tenant.getId().toString());
        res.setTenantName(tenant.getName());
        return res;
    }

    @Override
    @Transactional(readOnly=true)
    public List<User> getAll(UUID tenantId) { return userRepo.findByTenantId(tenantId); }

    @Override
    @Transactional(readOnly=true)
    public User getById(UUID tenantId, Long id) {
        return userRepo.findById(id).filter(u -> u.getTenantId().equals(tenantId))
            .orElseThrow(() -> new ResourceNotFoundException("User", id));
    }

    @Override
    @Transactional
    public User create(UUID tenantId, Map<String, Object> req) {
        String username = (String) req.get("username");
        if (userRepo.findByTenantIdAndUsername(tenantId, username).isPresent())
            throw new BusinessException("Username already taken: " + username);
        User u = new User();
        u.setTenantId(tenantId);
        u.setUsername(username);
        String emailVal = (String) req.get("email");
        u.setEmail(emailVal != null && !emailVal.isBlank() ? emailVal : null);
        u.setPasswordHash(encoder.encode((String) req.get("password")));
        u.setFirstName((String) req.get("firstName"));
        u.setLastName((String) req.get("lastName"));
        u.setRole(UserRole.valueOf((String) req.getOrDefault("role", "STAFF")));
        u.setPhone((String) req.get("phone"));
        u.setActive(req.containsKey("active") ? (Boolean) req.get("active") : true);
        if (req.containsKey("canBookAppts")) u.setCanBookAppts((Boolean) req.get("canBookAppts"));
        if (req.containsKey("locationId") && req.get("locationId") != null) {
            Long locId = ((Number) req.get("locationId")).longValue();
            locationRepo.findById(locId).ifPresent(u::setLocation);
        }
        if (req.containsKey("_createdBy")) u.setCreatedBy((Long) req.get("_createdBy"));
        return userRepo.save(u);
    }

    @Override
    @Transactional
    public User update(UUID tenantId, Long id, Map<String, Object> req) {
        User u = getById(tenantId, id);
        if (req.containsKey("firstName")) u.setFirstName((String) req.get("firstName"));
        if (req.containsKey("lastName"))  u.setLastName((String) req.get("lastName"));
        if (req.containsKey("email")) {
            String emailVal = (String) req.get("email");
            u.setEmail(emailVal != null && !emailVal.isBlank() ? emailVal : null);
        }
        if (req.containsKey("locationId")) {
            if (req.get("locationId") == null) {
                u.setLocation(null);
            } else {
                Long locId = ((Number) req.get("locationId")).longValue();
                locationRepo.findById(locId).ifPresent(u::setLocation);
            }
        }
        if (req.containsKey("phone"))     u.setPhone((String) req.get("phone"));
        if (req.containsKey("role"))      u.setRole(UserRole.valueOf((String) req.get("role")));
        if (req.containsKey("locked"))       u.setLocked((Boolean) req.get("locked"));
        if (req.containsKey("active"))       u.setActive((Boolean) req.get("active"));
        if (req.containsKey("canBookAppts")) u.setCanBookAppts((Boolean) req.get("canBookAppts"));
        if (req.containsKey("password") && req.get("password") != null
                && !req.get("password").toString().isEmpty())
            u.setPasswordHash(encoder.encode((String) req.get("password")));
        if (req.containsKey("_updatedBy")) u.setUpdatedBy((Long) req.get("_updatedBy"));
        return userRepo.save(u);
    }

    @Override
    @Transactional
    public void deactivate(UUID tenantId, Long id) {
        User u = getById(tenantId, id);
        u.setActive(false);
        userRepo.save(u);
    }
}
