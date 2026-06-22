package com.yourowncrm.repository;

import com.yourowncrm.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // Used by AuthController / JwtAuthenticationFilter
    Optional<User> findByTenantIdAndUsernameIgnoreCase(UUID tenantId, String username);

    // Old name called by UserServiceImpl — Spring Data generates exact-match query
    Optional<User> findByTenantIdAndUsername(UUID tenantId, String username);

    // Used by PublicController signup
    boolean existsByUsernameIgnoreCase(String username);

    // Active users only — used by staff pickers
    @Query("SELECT u FROM User u WHERE u.tenantId = :tenantId AND u.active = TRUE ORDER BY u.lastName, u.firstName")
    List<User> findActiveByTenantId(@Param("tenantId") UUID tenantId);

    // All users — old name UserServiceImpl calls
    @Query("SELECT u FROM User u WHERE u.tenantId = :tenantId ORDER BY u.lastName, u.firstName")
    List<User> findByTenantId(@Param("tenantId") UUID tenantId);

    // All users — new name used by new code
    @Query("SELECT u FROM User u WHERE u.tenantId = :tenantId ORDER BY u.lastName, u.firstName")
    List<User> findAllByTenantId(@Param("tenantId") UUID tenantId);

    // Used by TenantRepository lookup via vendor customer ID is on Tenant not User;
    // this is a convenience for finding a user by email across a tenant
    Optional<User> findByTenantIdAndEmail(UUID tenantId, String email);
}
