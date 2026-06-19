package com.yourowncrm.repository;

import com.yourowncrm.model.Payment;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    @Query("""
        SELECT p FROM Payment p
        WHERE p.tenantId    = :tenantId
          AND p.paymentDate >= :from
          AND p.paymentDate <= :to
        ORDER BY p.paymentDate DESC
        """)
    List<Payment> findByDateRange(
            @Param("tenantId") UUID tenantId,
            @Param("from")     LocalDate from,
            @Param("to")       LocalDate to);

    @Query("""
        SELECT DISTINCT p FROM Payment p
        JOIN p.invoiceLinks l
        WHERE p.tenantId = :tenantId
          AND l.invoice.id = :invoiceId
        ORDER BY p.paymentDate DESC
        """)
    List<Payment> findByInvoiceId(
            @Param("tenantId")  UUID tenantId,
            @Param("invoiceId") Long invoiceId);

    List<Payment> findByTenantIdOrderByPaymentDateDesc(UUID tenantId);

    @Query("SELECT COALESCE(MAX(CAST(SUBSTRING(p.paymentNumber, 5) AS INTEGER)), 0) FROM Payment p WHERE p.tenantId = :tenantId")
    int findMaxPaymentSequence(@Param("tenantId") UUID tenantId);
}
