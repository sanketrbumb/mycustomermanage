package com.yourowncrm.repository;

import com.yourowncrm.model.CustomerPicture;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CustomerPictureRepository extends JpaRepository<CustomerPicture, Long> {
    Optional<CustomerPicture> findByCustomerIdAndTenantId(Long customerId, UUID tenantId);
    void deleteByCustomerIdAndTenantId(Long customerId, UUID tenantId);
}
