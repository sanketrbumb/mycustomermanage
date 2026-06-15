package com.yourowncrm.controller;

import com.yourowncrm.exception.BusinessException;
import com.yourowncrm.model.Location;
import com.yourowncrm.model.ResourceSchedule;
import com.yourowncrm.model.enums.EntityType;
import com.yourowncrm.repository.LocationRepository;
import com.yourowncrm.repository.ResourceScheduleRepository;
import com.yourowncrm.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/resource-schedules")
public class ResourceScheduleController {

    private final ResourceScheduleRepository repo;
    private final LocationRepository         locationRepo;
    private final JwtTokenProvider           jwtProvider;

    @Autowired
    public ResourceScheduleController(ResourceScheduleRepository repo,
                                       LocationRepository locationRepo,
                                       JwtTokenProvider jwtProvider) {
        this.repo         = repo;
        this.locationRepo = locationRepo;
        this.jwtProvider  = jwtProvider;
    }

    /**
     * Returns schedules as plain DTOs (not entities) so the location is
     * always eagerly resolved — avoids lazy-loading serialization issues.
     */
    @GetMapping
    @Transactional(readOnly = true)
    public List<ResourceScheduleResponse> getForEntity(
            @RequestHeader("Authorization") String token,
            @RequestParam String entityType,
            @RequestParam Long entityId) {
        UUID tenantId = jwtProvider.getTenantId(token.substring(7));
        EntityType type = EntityType.valueOf(entityType.toUpperCase());
        List<ResourceSchedule> schedules = repo
                .findByTenantIdAndEntityTypeAndEntityIdOrderByPriorityAsc(tenantId, type, entityId);

        List<ResourceScheduleResponse> out = new ArrayList<>();
        for (ResourceSchedule s : schedules) {
            out.add(toResponse(s));
        }
        return out;
    }

    /**
     * Single-row upsert — kept for backward compatibility with any callers
     * that still post one row at a time. New frontend code should prefer
     * the bulk PUT endpoint below to avoid race conditions when saving
     * many rows at once.
     */
    @PostMapping
    @Transactional
    public ResponseEntity<ResourceScheduleResponse> save(
            @RequestHeader("Authorization") String token,
            @RequestBody Map<String, Object> body) {

        UUID tenantId = jwtProvider.getTenantId(token.substring(7));
        ResourceSchedule schedule = upsertOne(tenantId, body, null);
        boolean isNew = schedule.getId() == null;
        ResourceSchedule saved = repo.save(schedule);
        return isNew
            ? ResponseEntity.status(201).body(toResponse(saved))
            : ResponseEntity.ok(toResponse(saved));
    }

    /**
     * Bulk replace — saves the ENTIRE schedule for one entity in a single
     * transaction. All existing rows for this entity are deleted and
     * replaced with the rows in the request body.
     *
     * This is the preferred endpoint: it eliminates the race condition that
     * occurred when the frontend fired 7-14 parallel POST requests (each of
     * which independently re-read "existing" rows before any of the others
     * had committed, causing location/day data to be lost or overwritten
     * inconsistently — only the last-committing request's data would stick).
     *
     * Request body: { "rows": [ { dayOfWeek, priority, open, openTime,
     *                              closeTime, locationId, startDate, endDate }, ... ] }
     */
    @PutMapping
    @Transactional
    public List<ResourceScheduleResponse> replaceAll(
            @RequestHeader("Authorization") String token,
            @RequestParam String entityType,
            @RequestParam Long entityId,
            @RequestBody Map<String, Object> body) {

        UUID tenantId = jwtProvider.getTenantId(token.substring(7));
        EntityType type = EntityType.valueOf(entityType.toUpperCase());

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) body.get("rows");
        if (rows == null) rows = List.of();

        // Delete all existing rows for this entity, then insert fresh —
        // this is the simplest way to guarantee no stale/duplicate rows
        // remain from previous configurations with different day/priority
        // combinations.
        List<ResourceSchedule> existing = repo
                .findByTenantIdAndEntityTypeAndEntityIdOrderByPriorityAsc(tenantId, type, entityId);
        repo.deleteAll(existing);
        repo.flush();

        List<ResourceScheduleResponse> out = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            ResourceSchedule s = new ResourceSchedule();
            s.setTenantId(tenantId);
            s.setEntityType(type);
            s.setEntityId(entityId);
            applyRowFields(s, row);
            ResourceSchedule saved = repo.save(s);
            out.add(toResponse(saved));
        }
        return out;
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void delete(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id) {
        repo.deleteById(id);
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    /** Finds an existing row matching (dayOfWeek, priority) or creates a new one, then applies field updates. */
    private ResourceSchedule upsertOne(UUID tenantId, Map<String, Object> body, List<ResourceSchedule> existingOverride) {
        EntityType entityType = EntityType.valueOf(
                body.get("entityType").toString().toUpperCase());
        Long entityId  = Long.valueOf(body.get("entityId").toString());
        int  priority  = body.containsKey("priority")
                ? Integer.parseInt(body.get("priority").toString()) : 0;
        String dowStr  = body.get("dayOfWeek").toString().toUpperCase();
        DayOfWeek dow  = DayOfWeek.valueOf(dowStr);

        List<ResourceSchedule> existing = existingOverride != null ? existingOverride :
            repo.findByTenantIdAndEntityTypeAndEntityIdOrderByPriorityAsc(tenantId, entityType, entityId);

        ResourceSchedule schedule = existing.stream()
            .filter(s -> s.getDayOfWeek() == dow && s.getPriority() == priority)
            .findFirst()
            .orElse(new ResourceSchedule());

        schedule.setTenantId(tenantId);
        schedule.setEntityType(entityType);
        schedule.setEntityId(entityId);
        applyRowFields(schedule, body);
        return schedule;
    }

    /** Applies day/time/location/date-range fields from a request row onto an entity. */
    private void applyRowFields(ResourceSchedule s, Map<String, Object> row) {
        int  priority  = row.containsKey("priority")
                ? Integer.parseInt(row.get("priority").toString()) : 0;
        String dowStr  = row.get("dayOfWeek").toString().toUpperCase();
        DayOfWeek dow  = DayOfWeek.valueOf(dowStr);
        boolean open   = Boolean.parseBoolean(row.getOrDefault("open","true").toString());
        String openT   = row.getOrDefault("openTime","09:00").toString();
        String closeT  = row.getOrDefault("closeTime","18:00").toString();

        s.setPriority((short) priority);
        s.setDayOfWeek(dow);
        s.setOpen(open);
        s.setOpenTime(LocalTime.parse(openT));
        s.setCloseTime(LocalTime.parse(closeT));

        // ── Location FK (per-day) — null = "All Locations" ──────────────────
        Object locIdRaw = row.get("locationId");
        if (locIdRaw != null && !locIdRaw.toString().isBlank() && !locIdRaw.toString().equals("null")) {
            Long locationId = Long.valueOf(locIdRaw.toString());
            Location loc = locationRepo.findById(locationId).orElse(null);
            s.setLocation(loc);
        } else {
            s.setLocation(null);
        }

        // ── Effective date range — startDate required, endDate optional ─────
        Object startRaw = row.get("startDate");
        Object endRaw   = row.get("endDate");

        if (startRaw == null || startRaw.toString().isBlank()) {
            throw new BusinessException("Start date is required for resource schedule rows.");
        }
        LocalDate startDate = LocalDate.parse(startRaw.toString());
        s.setEffectiveFrom(startDate);

        if (endRaw != null && !endRaw.toString().isBlank() && !endRaw.toString().equals("null")) {
            LocalDate endDate = LocalDate.parse(endRaw.toString());
            if (endDate.isBefore(startDate)) {
                throw new BusinessException("End date cannot be before start date.");
            }
            s.setEffectiveTo(endDate);
        } else {
            s.setEffectiveTo(null); // null = always active from startDate onward
        }
    }

    private ResourceScheduleResponse toResponse(ResourceSchedule s) {
        ResourceScheduleResponse r = new ResourceScheduleResponse();
        r.id          = s.getId();
        r.entityType  = s.getEntityType().name();
        r.entityId    = s.getEntityId();
        r.priority    = s.getPriority();
        r.dayOfWeek   = s.getDayOfWeek().name();
        r.open        = s.isOpen();
        r.openTime    = s.getOpenTime().toString();
        r.closeTime   = s.getCloseTime().toString();
        r.startDate   = s.getEffectiveFrom() != null ? s.getEffectiveFrom().toString() : null;
        r.endDate     = s.getEffectiveTo()   != null ? s.getEffectiveTo().toString()   : null;
        if (s.getLocation() != null) {
            r.locationId    = s.getLocation().getId();
            r.locationName  = s.getLocation().getName();
            r.locationColor = s.getLocation().getColorHex();
        }
        return r;
    }

    /** Plain DTO — avoids lazy-loading serialization problems entirely. */
    public static class ResourceScheduleResponse {
        public Long id;
        public String entityType;
        public Long entityId;
        public short priority;
        public String dayOfWeek;
        public boolean open;
        public String openTime;
        public String closeTime;
        public String startDate;
        public String endDate;
        public Long locationId;
        public String locationName;
        public String locationColor;
    }
}
