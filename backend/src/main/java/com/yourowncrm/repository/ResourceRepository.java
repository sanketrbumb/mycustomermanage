package com.yourowncrm.repository;

import com.yourowncrm.model.Resource;
import org.springframework.data.jpa.repository.*;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface ResourceRepository extends JpaRepository<Resource, Long> {
    List<Resource> findByTenantIdAndActiveTrue(UUID tenantId);
    List<Resource> findByTenantIdAndLocation_IdAndActiveTrue(UUID tenantId, Long locationId);
}
