package com.yourowncrm.repository;

import com.yourowncrm.model.VisitStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VisitStatusRepository extends JpaRepository<VisitStatus, Long> {
    Optional<VisitStatus> findByTenantIdAndNameIgnoreCase(UUID tenantId, String name);
    List<VisitStatus>     findByTenantIdOrderBySortOrderAsc(UUID tenantId);
}
