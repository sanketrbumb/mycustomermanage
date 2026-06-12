package com.yourowncrm.model;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * Base class providing createdAt and updatedAt — managed by PostgreSQL triggers.
 * Audit fields (updatedBy, deletedBy, deletedAt) are added per-model only where needed.
 */
@MappedSuperclass
public abstract class BaseEntity {

    @Column(name = "created_at", nullable = false,
            insertable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false,
            insertable = false, updatable = false)
    private Instant updatedAt;

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setCreatedAt(Instant v) { this.createdAt = v; }
    public void setUpdatedAt(Instant v) { this.updatedAt = v; }
}
