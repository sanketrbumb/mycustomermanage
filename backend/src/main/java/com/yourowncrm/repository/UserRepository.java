package com.yourowncrm.repository;

import com.yourowncrm.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByTenantIdAndUsernameIgnoreCase(UUID tenantId, String username);

    boolean existsByUsernameIgnoreCase(String username);

    @Query("SELECT u FROM User u WHERE u.tenantId = :tenantId AND u.active = TRUE ORDER BY u.lastName, u.firstName")
    java.util.List<User> findActiveByTenantId(@Param("tenantId") UUID tenantId);

    @Query("SELECT u FROM User u WHERE u.tenantId = :tenantId ORDER BY u.lastName, u.firstName")
    java.util.List<User> findAllByTenantId(@Param("tenantId") UUID tenantId);
}
