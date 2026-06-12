package com.yourowncrm.repository;

import com.yourowncrm.model.Invoice;
import com.yourowncrm.model.enums.InvoiceStatus;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    Optional<Invoice> findByTenantIdAndInvoiceNumber(UUID tenantId, String invoiceNumber);

    List<Invoice> findByTenantIdAndStatus(UUID tenantId, InvoiceStatus status);

    @Query("""
        SELECT i FROM Invoice i
        WHERE i.tenantId     = :tenantId
          AND i.invoiceDate >= :from
          AND i.invoiceDate <= :to
        ORDER BY i.invoiceDate DESC
        """)
    List<Invoice> findByDateRange(
            @Param("tenantId") UUID tenantId,
            @Param("from")     LocalDate from,
            @Param("to")       LocalDate to);

    @Query("SELECT COALESCE(MAX(CAST(SUBSTRING(i.invoiceNumber, 5) AS INTEGER)), 0) FROM Invoice i WHERE i.tenantId = :tenantId")
    int findMaxInvoiceSequence(@Param("tenantId") UUID tenantId);
}
