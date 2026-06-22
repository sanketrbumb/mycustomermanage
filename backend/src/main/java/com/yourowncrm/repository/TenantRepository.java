package com.yourowncrm.repository;

import com.yourowncrm.model.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface TenantRepository extends JpaRepository<Tenant, UUID> {

    /** Slug availability check — used by PublicController signup */
    boolean existsBySlug(String slug);

    /** Find tenant by slug — used for tenant resolution */
    Optional<Tenant> findBySlug(String slug);

    /**
     * Find tenant by their gateway customer ID.
     * Used by WebhookController to map incoming webhook events
     * (which carry vendorCustomerId) back to our tenant record.
     * Indexed via V8 migration: idx_tenant_vendor_customer
     */
    Optional<Tenant> findByVendorCustomerId(String vendorCustomerId);
}
