package com.yourowncrm.repository;

import com.yourowncrm.model.VisitType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VisitTypeRepository extends JpaRepository<VisitType, Long> {
    Optional<VisitType> findByTenantIdAndNameIgnoreCase(UUID tenantId, String name);
    List<VisitType>     findByTenantIdAndActiveTrue(UUID tenantId);
}
