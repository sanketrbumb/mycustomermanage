package com.yourowncrm.repository;

import com.yourowncrm.model.ChargeCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChargeCodeRepository extends JpaRepository<ChargeCode, Long> {
    Optional<ChargeCode> findByTenantIdAndCodeIgnoreCase(UUID tenantId, String code);
    List<ChargeCode>     findByTenantIdAndActiveTrue(UUID tenantId);
}
