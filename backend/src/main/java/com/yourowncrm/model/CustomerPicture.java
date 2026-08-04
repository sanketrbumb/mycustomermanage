package com.yourowncrm.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "customer_pictures")
public class CustomerPicture {

    @Id
    @Column(name = "customer_id")
    private Long customerId;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "picture_data", nullable = false, columnDefinition = "TEXT")
    private String pictureData;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public CustomerPicture() {}

    public CustomerPicture(Long customerId, UUID tenantId) {
        this.customerId = customerId;
        this.tenantId = tenantId;
    }

    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }

    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }

    public String getPictureData() { return pictureData; }
    public void setPictureData(String pictureData) { this.pictureData = pictureData; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
