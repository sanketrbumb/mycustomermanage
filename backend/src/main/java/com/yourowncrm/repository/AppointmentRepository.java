package com.yourowncrm.repository;

import com.yourowncrm.model.Appointment;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import org.springframework.data.domain.Sort;
import java.util.UUID;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    @Query("""
        SELECT a FROM Appointment a
        WHERE a.tenantId = :tenantId
          AND a.apptDate = :date
          AND (:locationId IS NULL OR a.location.id = :locationId)
        ORDER BY a.startTime
        """)
    List<Appointment> findByDateAndTenant(
            @Param("tenantId")   UUID tenantId,
            @Param("date")       LocalDate date,
            @Param("locationId") Long locationId);

    /** Double-booking check for a physical resource */
    @Query("""
        SELECT a FROM Appointment a
        WHERE a.resource.id = :resourceId
          AND a.apptDate    = :date
          AND a.id         != :excludeId
          AND a.visitStatus.terminal = FALSE
          AND a.startTime  < :endTime
          AND a.endTime    > :startTime
        """)
    List<Appointment> findConflictingByResource(
            @Param("resourceId") Long resourceId,
            @Param("date")       LocalDate date,
            @Param("startTime")  LocalTime startTime,
            @Param("endTime")    LocalTime endTime,
            @Param("excludeId")  Long excludeId);

    /** Double-booking check for a staff-as-resource */
    @Query("""
        SELECT a FROM Appointment a
        WHERE a.staffResource.id = :staffId
          AND a.apptDate         = :date
          AND a.id              != :excludeId
          AND a.visitStatus.terminal = FALSE
          AND a.startTime  < :endTime
          AND a.endTime    > :startTime
        """)
    List<Appointment> findConflictingByStaffResource(
            @Param("staffId")   Long staffId,
            @Param("date")      LocalDate date,
            @Param("startTime") LocalTime startTime,
            @Param("endTime")   LocalTime endTime,
            @Param("excludeId") Long excludeId);

    @Query("""
        SELECT a FROM Appointment a
        WHERE a.customer.id = :customerId
          AND a.tenantId    = :tenantId
        ORDER BY a.apptDate DESC, a.startTime DESC
        """)
    List<Appointment> findByCustomer(
            @Param("tenantId")    UUID tenantId,
            @Param("customerId")  Long customerId);

    @Query("""
        SELECT a FROM Appointment a
        WHERE a.tenantId  = :tenantId
          AND a.apptDate >= :from
          AND a.apptDate <= :to
        ORDER BY a.apptDate, a.startTime
        """)
    List<Appointment> findByDateRange(
            @Param("tenantId") UUID tenantId,
            @Param("from")     LocalDate from,
            @Param("to")       LocalDate to);
    // All visits for a customer
    List<Appointment> findByTenantIdAndCustomerIdOrderByApptDateDescStartTimeDesc(UUID tenantId, Long customerId);

    @org.springframework.data.jpa.repository.Query(
        "SELECT a FROM Appointment a WHERE a.tenantId = :tenantId " +
        "AND a.customer.id = :customerId AND a.apptDate = :apptDate " +
        "AND a.id <> :excludeId AND a.visitStatus.terminal = false"
    )
    List<Appointment> findActiveByCustomerAndDate(
        @org.springframework.data.repository.query.Param("tenantId") UUID tenantId,
        @org.springframework.data.repository.query.Param("customerId") Long customerId,
        @org.springframework.data.repository.query.Param("apptDate") java.time.LocalDate apptDate,
        @org.springframework.data.repository.query.Param("excludeId") Long excludeId);
    java.util.List<Appointment> findByTenantIdAndApptDateBetweenOrderByApptDateAscStartTimeAsc(java.util.UUID tenantId, java.time.LocalDate from, java.time.LocalDate to);
}
