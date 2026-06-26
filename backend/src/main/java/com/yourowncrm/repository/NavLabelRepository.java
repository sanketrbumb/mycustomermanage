package com.yourowncrm.repository;

import com.yourowncrm.model.NavLabel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NavLabelRepository extends JpaRepository<NavLabel, Long> {
    List<NavLabel>     findByTenantId(UUID tenantId);
    Optional<NavLabel> findByTenantIdAndRoute(UUID tenantId, String route);
}
