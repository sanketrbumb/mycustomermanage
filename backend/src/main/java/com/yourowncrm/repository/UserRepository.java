package com.yourowncrm.repository;

import com.yourowncrm.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByTenantIdAndUsername(UUID tenantId, String username);
    Optional<User> findByTenantIdAndEmail(UUID tenantId, String email);
    List<User>     findByTenantIdAndActiveTrue(UUID tenantId);
    List<User>     findByTenantId(UUID tenantId);  // all including inactive
}
