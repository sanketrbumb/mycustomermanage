package com.yourowncrm.repository;

import com.yourowncrm.model.ApptCharge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Repository
public interface ApptChargeRepository extends JpaRepository<ApptCharge, Long> {

    List<ApptCharge> findByTenantIdAndAppointmentIdOrderBySortOrderAsc(UUID tenantId, Long appointmentId);

    @Modifying
    @Transactional
    @Query("DELETE FROM ApptCharge c WHERE c.appointmentId = :apptId AND c.source = :source")
    void deleteByAppointmentIdAndSource(@Param("apptId") Long apptId, @Param("source") String source);

    @Modifying
    @Transactional
    @Query("DELETE FROM ApptCharge c WHERE c.appointmentId = :apptId AND c.tenantId = :tenantId AND c.source = :source")
    void deleteByAppointmentIdAndTenantIdAndSource(
            @Param("apptId") Long apptId,
            @Param("tenantId") UUID tenantId,
            @Param("source") String source);
}
