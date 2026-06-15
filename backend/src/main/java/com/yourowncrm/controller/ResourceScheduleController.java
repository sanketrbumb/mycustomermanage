package com.yourowncrm.controller;

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
     * always eagerly resolved — avoids lazy-loading serialization issues
     * (null / {} / LazyInitializationException) that previously made
     * location-based color bands on the schedule grid impossible.
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
            ResourceScheduleResponse r = new ResourceScheduleResponse();
            r.id          = s.getId();
            r.entityType  = s.getEntityType().name();
            r.entityId    = s.getEntityId();
            r.priority    = s.getPriority();
            r.dayOfWeek   = s.getDayOfWeek().name();
            r.open        = s.isOpen();
            r.openTime    = s.getOpenTime().toString();
            r.closeTime   = s.getCloseTime().toString();
            if (s.getLocation() != null) {
                r.locationId    = s.getLocation().getId();
                r.locationName  = s.getLocation().getName();
                r.locationColor = s.getLocation().getColorHex();
            }
            out.add(r);
        }
        return out;
    }

    @PostMapping
    @Transactional
    public ResponseEntity<ResourceScheduleResponse> save(
            @RequestHeader("Authorization") String token,
            @RequestBody Map<String, Object> body) {

        UUID tenantId = jwtProvider.getTenantId(token.substring(7));

        EntityType entityType = EntityType.valueOf(
                body.get("entityType").toString().toUpperCase());
        Long entityId  = Long.valueOf(body.get("entityId").toString());
        int  priority  = body.containsKey("priority")
                ? Integer.parseInt(body.get("priority").toString()) : 0;
        String dowStr  = body.get("dayOfWeek").toString().toUpperCase();
        DayOfWeek dow  = DayOfWeek.valueOf(dowStr);
        boolean open   = Boolean.parseBoolean(body.getOrDefault("open","true").toString());
        String openT   = body.getOrDefault("openTime","09:00").toString();
        String closeT  = body.getOrDefault("closeTime","18:00").toString();

        // Upsert: find existing row for this entity + day + priority, or create new
        List<ResourceSchedule> existing =
            repo.findByTenantIdAndEntityTypeAndEntityIdOrderByPriorityAsc(
                tenantId, entityType, entityId);

        ResourceSchedule schedule = existing.stream()
            .filter(s -> s.getDayOfWeek() == dow && s.getPriority() == priority)
            .findFirst()
            .orElse(new ResourceSchedule());

        schedule.setTenantId(tenantId);
        schedule.setEntityType(entityType);
        schedule.setEntityId(entityId);
        schedule.setPriority((short) priority);
        schedule.setDayOfWeek(dow);
        schedule.setOpen(open);
        schedule.setOpenTime(LocalTime.parse(openT));
        schedule.setCloseTime(LocalTime.parse(closeT));

        // ── Location FK — now actually persisted ────────────────────────────
        Object locIdRaw = body.get("locationId");
        if (locIdRaw != null && !locIdRaw.toString().isBlank()) {
            Long locationId = Long.valueOf(locIdRaw.toString());
            Location loc = locationRepo.findById(locationId).orElse(null);
            schedule.setLocation(loc); // null if not found — safe default
        } else {
            schedule.setLocation(null);
        }

        boolean isNew = schedule.getId() == null;
        ResourceSchedule saved = repo.save(schedule);

        ResourceScheduleResponse r = new ResourceScheduleResponse();
        r.id          = saved.getId();
        r.entityType  = saved.getEntityType().name();
        r.entityId    = saved.getEntityId();
        r.priority    = saved.getPriority();
        r.dayOfWeek   = saved.getDayOfWeek().name();
        r.open        = saved.isOpen();
        r.openTime    = saved.getOpenTime().toString();
        r.closeTime   = saved.getCloseTime().toString();
        if (saved.getLocation() != null) {
            r.locationId    = saved.getLocation().getId();
            r.locationName  = saved.getLocation().getName();
            r.locationColor = saved.getLocation().getColorHex();
        }

        return isNew ? ResponseEntity.status(201).body(r) : ResponseEntity.ok(r);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void delete(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id) {
        repo.deleteById(id);
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
        public Long locationId;
        public String locationName;
        public String locationColor;
    }
}
