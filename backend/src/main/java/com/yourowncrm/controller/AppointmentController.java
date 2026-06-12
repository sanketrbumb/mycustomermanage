package com.yourowncrm.controller;

import com.yourowncrm.dto.request.AppointmentRequest;
import com.yourowncrm.model.AppointmentNotes;
import com.yourowncrm.repository.AppointmentNotesRepository;
import com.yourowncrm.repository.AppointmentRepository;
import com.yourowncrm.dto.response.AppointmentResponse;
import com.yourowncrm.dto.response.AvailabilityConflict;
import com.yourowncrm.security.JwtTokenProvider;
import com.yourowncrm.service.AppointmentService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {

    private final AppointmentService      service;
    private final JwtTokenProvider       jwtProvider;
    private final AppointmentNotesRepository notesRepo;
    private final com.yourowncrm.repository.AppointmentRepository apptRepo;

    @Autowired
    public AppointmentController(AppointmentService service,
                                  JwtTokenProvider jwtProvider,
                                  AppointmentNotesRepository notesRepo,
                                  com.yourowncrm.repository.AppointmentRepository apptRepo) {
        this.service      = service;
        this.jwtProvider  = jwtProvider;
        this.notesRepo    = notesRepo;
        this.apptRepo     = apptRepo;
    }

    @GetMapping("/daily")
    public List<AppointmentResponse> getDailySchedule(
            @RequestHeader("Authorization") String token,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Long locationId) {
        UUID tenantId = jwtProvider.getTenantId(token.substring(7));
        return service.getDailySchedule(tenantId, date, locationId);
    }

    @GetMapping("/{id}")
    public AppointmentResponse getById(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id) {
        return service.getById(jwtProvider.getTenantId(token.substring(7)), id);
    }

    @PostMapping("/check-availability")
    public AvailabilityConflict checkAvailability(
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody AppointmentRequest req) {
        return service.checkAvailability(jwtProvider.getTenantId(token.substring(7)), req);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER','STAFF')")
    public ResponseEntity<AppointmentResponse> create(
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody AppointmentRequest req) {
        UUID tenantId = jwtProvider.getTenantId(token.substring(7));
        Long userId   = jwtProvider.getUserId(token.substring(7));
        return ResponseEntity.status(HttpStatus.CREATED)
                             .body(service.create(tenantId, userId, req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER','STAFF')")
    public AppointmentResponse update(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id,
            @Valid @RequestBody AppointmentRequest req) {
        UUID tenantId = jwtProvider.getTenantId(token.substring(7));
        Long userId   = jwtProvider.getUserId(token.substring(7));
        return service.update(tenantId, id, userId, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER','STAFF')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancel(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id) {
        UUID tenantId = jwtProvider.getTenantId(token.substring(7));
        Long userId   = jwtProvider.getUserId(token.substring(7));
        service.cancel(tenantId, id, userId);
    }

    // ── Notes endpoints ───────────────────────────────────────────────────
    @GetMapping("/{id}/notes")
    public org.springframework.http.ResponseEntity<AppointmentNotes> getNotes(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id) {
        return notesRepo.findByAppointmentId(id)
                .map(org.springframework.http.ResponseEntity::ok)
                .orElse(org.springframework.http.ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/notes")
    public AppointmentNotes saveNotes(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id,
            @RequestBody AppointmentNotes req) {
        java.util.UUID tenantId = jwtProvider.getTenantId(token.substring(7));
        Long userId = jwtProvider.getUserId(token.substring(7));
        AppointmentNotes notes = notesRepo.findByAppointmentId(id)
                .orElse(new AppointmentNotes());
        notes.setAppointmentId(id);
        notes.setTenantId(tenantId);
        notes.setSubjective(req.getSubjective());
        notes.setObjective(req.getObjective());
        notes.setAssessment(req.getAssessment());
        notes.setPlan(req.getPlan());
        notes.setChiefComplaint(req.getChiefComplaint());
        notes.setFollowup(req.getFollowup());
        notes.setTreatment(req.getTreatment());
        notes.setProducts(req.getProducts());
        notes.setTherapistInitials(req.getTherapistInitials());
        notes.setAdditionalCharges(req.getAdditionalCharges());
        if (notes.getId() == null) notes.setCreatedBy(userId);
        notes.setUpdatedBy(userId);
        return notesRepo.save(notes);
    }

    // ── All visits by customer ─────────────────────────────────────────────
    @GetMapping("/customer/{customerId}")
    public java.util.List<com.yourowncrm.dto.response.AppointmentResponse> getByCustomer(
            @RequestHeader("Authorization") String token,
            @PathVariable Long customerId) {
        java.util.UUID tenantId = jwtProvider.getTenantId(token.substring(7));
        return apptRepo
                .findByTenantIdAndCustomerIdOrderByApptDateDescStartTimeDesc(tenantId, customerId)
                .stream()
                .map(service::toResponsePublic)
                .collect(java.util.stream.Collectors.toList());
    }

}