package com.yourowncrm.controller;

import com.yourowncrm.model.ResourceSchedule;
import com.yourowncrm.model.enums.EntityType;
import com.yourowncrm.repository.ResourceScheduleRepository;
import com.yourowncrm.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/resource-schedules")
public class ResourceScheduleController {

    private final ResourceScheduleRepository repo;
    private final JwtTokenProvider           jwtProvider;

    @Autowired
    public ResourceScheduleController(ResourceScheduleRepository repo,
                                       JwtTokenProvider jwtProvider) {
        this.repo        = repo;
        this.jwtProvider = jwtProvider;
    }

    @GetMapping
    public List<ResourceSchedule> getForEntity(
            @RequestHeader("Authorization") String token,
            @RequestParam String entityType,
            @RequestParam Long entityId) {
        UUID tenantId = jwtProvider.getTenantId(token.substring(7));
        EntityType type = EntityType.valueOf(entityType.toUpperCase());
        return repo.findByTenantIdAndEntityTypeAndEntityIdOrderByPriorityAsc(
                tenantId, type, entityId);
    }

    @PostMapping
    public ResponseEntity<ResourceSchedule> save(
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

        // Set location if provided
        if (body.containsKey("locationId") && body.get("locationId") != null) {
            // Location FK — set entity_id only (avoid full fetch)
            // For now stored as null if not found — safe default
        }

        ResourceSchedule saved = repo.save(schedule);
        return schedule.getId() == null
            ? ResponseEntity.status(201).body(saved)
            : ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void delete(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id) {
        repo.deleteById(id);
    }
}
