package com.yourowncrm.repository;

import com.yourowncrm.model.Location;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LocationRepository extends JpaRepository<Location, Long> {
    Optional<Location> findByTenantIdAndNameIgnoreCase(UUID tenantId, String name);
    List<Location>     findByTenantIdAndActiveTrue(UUID tenantId);
}
