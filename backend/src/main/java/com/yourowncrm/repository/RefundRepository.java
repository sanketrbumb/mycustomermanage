package com.yourowncrm.repository;

import com.yourowncrm.model.Refund;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface RefundRepository extends JpaRepository<Refund, Long> {

    @Query("""
        SELECT r FROM Refund r
        WHERE r.tenantId = :tenantId
          AND r.refundDate >= :from
          AND r.refundDate <= :to
        ORDER BY r.refundDate DESC, r.id DESC
        """)
    List<Refund> findByDateRange(
            @Param("tenantId") UUID tenantId,
            @Param("from")     LocalDate from,
            @Param("to")       LocalDate to);

    @Query("""
        SELECT r FROM Refund r
        WHERE r.tenantId = :tenantId
        ORDER BY r.refundDate DESC, r.id DESC
        """)
    List<Refund> findAllForTenant(@Param("tenantId") UUID tenantId);

    @Query("SELECT COALESCE(SUM(r.amount), 0) FROM Refund r WHERE r.tenantId = :tenantId AND r.payment.id = :paymentId")
    java.math.BigDecimal totalRefundedForPayment(
            @Param("tenantId")  UUID tenantId,
            @Param("paymentId") Long paymentId);

    @Query("SELECT COALESCE(MAX(CAST(SUBSTRING(r.refundNumber, 5) AS INTEGER)), 0) FROM Refund r WHERE r.tenantId = :tenantId")
    int findMaxRefundSequence(@Param("tenantId") UUID tenantId);
}
