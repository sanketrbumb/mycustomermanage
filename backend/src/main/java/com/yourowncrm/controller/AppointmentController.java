package com.yourowncrm.controller;

import com.yourowncrm.dto.request.AppointmentRequest;
import com.yourowncrm.model.ApptCharge;
import com.yourowncrm.model.AppointmentNotes;
import com.yourowncrm.repository.ApptChargeRepository;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {

    private final AppointmentService          service;
    private final JwtTokenProvider            jwtProvider;
    private final AppointmentNotesRepository  notesRepo;
    private final AppointmentRepository       apptRepo;
    private final ApptChargeRepository        chargeRepo;

    @Autowired
    public AppointmentController(AppointmentService service,
                                  JwtTokenProvider jwtProvider,
                                  AppointmentNotesRepository notesRepo,
                                  AppointmentRepository apptRepo,
                                  ApptChargeRepository chargeRepo) {
        this.service     = service;
        this.jwtProvider = jwtProvider;
        this.notesRepo   = notesRepo;
        this.apptRepo    = apptRepo;
        this.chargeRepo  = chargeRepo;
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

    // ── SOAP Notes endpoints ──────────────────────────────────────────────────

    @GetMapping("/{id}/notes")
    public ResponseEntity<AppointmentNotes> getNotes(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id) {
        return notesRepo.findByAppointmentId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/notes")
    public AppointmentNotes saveNotes(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id,
            @RequestBody AppointmentNotes req) {
        UUID tenantId = jwtProvider.getTenantId(token.substring(7));
        Long userId   = jwtProvider.getUserId(token.substring(7));
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
        if (notes.getId() == null) notes.setCreatedBy(userId);
        notes.setUpdatedBy(userId);
        return notesRepo.save(notes);
    }

    // ── Appointment charges endpoints ─────────────────────────────────────────

    /** Returns all charges (VISIT_TYPE + ADDITIONAL) ordered by sort_order. */
    @GetMapping("/{id}/charges")
    public List<ApptCharge> getCharges(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id) {
        UUID tenantId = jwtProvider.getTenantId(token.substring(7));
        return chargeRepo.findByTenantIdAndAppointmentIdOrderBySortOrderAsc(tenantId, id);
    }

    /**
     * Replaces the ADDITIONAL charges for an appointment.
     * Accepts: [ {description, code, qty, unitPrice}, ... ]
     * The VISIT_TYPE charge is managed automatically by the appointment service
     * and is never touched here.
     */
    @PutMapping("/{id}/charges")
    public List<ApptCharge> saveCharges(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id,
            @RequestBody List<Map<String, Object>> rows) {
        UUID tenantId = jwtProvider.getTenantId(token.substring(7));

        chargeRepo.deleteByAppointmentIdAndTenantIdAndSource(id, tenantId, "ADDITIONAL");

        List<ApptCharge> saved = new ArrayList<>();
        for (int i = 0; i < rows.size(); i++) {
            Map<String, Object> row = rows.get(i);
            ApptCharge c = new ApptCharge();
            c.setTenantId(tenantId);
            c.setAppointmentId(id);
            c.setSource("ADDITIONAL");
            c.setDescription(String.valueOf(row.getOrDefault("description", "Service")));
            Object code = row.get("code");
            c.setChargeCode(code != null && !code.toString().isBlank() ? code.toString() : null);
            c.setQuantity(new BigDecimal(String.valueOf(row.getOrDefault("qty", 1))));
            c.setUnitPrice(new BigDecimal(String.valueOf(row.getOrDefault("unitPrice", 0))));
            c.setSortOrder((short) i);
            saved.add(chargeRepo.save(c));
        }
        return chargeRepo.findByTenantIdAndAppointmentIdOrderBySortOrderAsc(tenantId, id);
    }

    // ── All visits by customer ────────────────────────────────────────────────

    @GetMapping("/customer/{customerId}")
    public List<AppointmentResponse> getByCustomer(
            @RequestHeader("Authorization") String token,
            @PathVariable Long customerId) {
        UUID tenantId = jwtProvider.getTenantId(token.substring(7));
        return apptRepo
                .findByTenantIdAndCustomerIdOrderByApptDateDescStartTimeDesc(tenantId, customerId)
                .stream()
                .map(service::toResponsePublic)
                .collect(java.util.stream.Collectors.toList());
    }
}
