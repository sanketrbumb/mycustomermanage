package com.yourowncrm.repository;

import com.yourowncrm.model.ResourceSchedule;
import com.yourowncrm.model.enums.EntityType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface ResourceScheduleRepository extends JpaRepository<ResourceSchedule, Long> {

    @Query("""
        SELECT rs FROM ResourceSchedule rs
        WHERE rs.entityType = :entityType
          AND rs.entityId   = :entityId
          AND rs.dayOfWeek  = :dow
          AND (rs.effectiveFrom IS NULL OR rs.effectiveFrom <= :date)
          AND (rs.effectiveTo   IS NULL OR rs.effectiveTo   >= :date)
        ORDER BY rs.priority ASC
        """)
    List<ResourceSchedule> findEffectiveSchedules(
            @Param("entityType") EntityType entityType,
            @Param("entityId")   Long entityId,
            @Param("dow")        DayOfWeek dow,
            @Param("date")       LocalDate date);

    List<ResourceSchedule> findByTenantIdAndEntityTypeAndEntityIdOrderByPriorityAsc(
            UUID tenantId, EntityType entityType, Long entityId);
}
