package com.yourowncrm.repository;

import com.yourowncrm.model.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {

    List<Role> findByTenantIdOrderBySystemRoleDescNameAsc(UUID tenantId);

    Optional<Role> findByTenantIdAndName(UUID tenantId, String name);

    boolean existsByTenantIdAndName(UUID tenantId, String name);

    @Query("SELECT COUNT(u) FROM User u WHERE u.tenantId = :tenantId AND u.roleName = :roleName")
    long countUsersWithRole(@Param("tenantId") UUID tenantId, @Param("roleName") String roleName);
}
