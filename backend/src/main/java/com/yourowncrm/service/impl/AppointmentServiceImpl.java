package com.yourowncrm.service.impl;

import com.yourowncrm.dto.request.AppointmentRequest;
import com.yourowncrm.dto.response.AppointmentResponse;
import com.yourowncrm.dto.response.AvailabilityConflict;
import com.yourowncrm.exception.BusinessException;
import com.yourowncrm.exception.ResourceNotFoundException;
import com.yourowncrm.model.*;
import com.yourowncrm.model.enums.EntityType;
import com.yourowncrm.repository.*;
import com.yourowncrm.service.AppointmentService;
import com.yourowncrm.service.BillingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.logging.Logger;

@Service
public class AppointmentServiceImpl implements AppointmentService {

    private static final Logger log = Logger.getLogger(AppointmentServiceImpl.class.getName());

    private final AppointmentRepository      appointmentRepo;
    private final ResourceRepository         resourceRepo;
    private final UserRepository             userRepo;
    private final VisitStatusRepository      statusRepo;
    private final VisitTypeRepository        visitTypeRepo;
    private final LocationRepository         locationRepo;
    private final CustomerRepository         customerRepo;
    private final ResourceScheduleRepository scheduleRepo;
    private final ApptChargeRepository       apptChargeRepo;

    // Lazy to break the circular dependency: AppointmentServiceImpl → BillingService
    // → AppointmentRepository → (resolved by Spring proxy at first use)
    @Lazy
    @Autowired
    private BillingService billingService;

    @Autowired
    public AppointmentServiceImpl(AppointmentRepository appointmentRepo,
                                   ResourceRepository resourceRepo,
                                   UserRepository userRepo,
                                   VisitStatusRepository statusRepo,
                                   VisitTypeRepository visitTypeRepo,
                                   LocationRepository locationRepo,
                                   CustomerRepository customerRepo,
                                   ResourceScheduleRepository scheduleRepo,
                                   ApptChargeRepository apptChargeRepo) {
        this.appointmentRepo = appointmentRepo;
        this.resourceRepo    = resourceRepo;
        this.userRepo        = userRepo;
        this.statusRepo      = statusRepo;
        this.visitTypeRepo   = visitTypeRepo;
        this.locationRepo    = locationRepo;
        this.customerRepo    = customerRepo;
        this.scheduleRepo    = scheduleRepo;
        this.apptChargeRepo  = apptChargeRepo;
    }

    // ── READ ──────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<AppointmentResponse> getDailySchedule(UUID tenantId, LocalDate date, Long locationId) {
        return appointmentRepo.findByDateAndTenant(tenantId, date, locationId)
                .stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public AppointmentResponse getById(UUID tenantId, Long id) {
        return toResponse(findOrThrow(tenantId, id));
    }

    // ── CREATE ────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public AppointmentResponse create(UUID tenantId, Long userId, AppointmentRequest req) {
        validateAndCheckConflicts(tenantId, req);
        Appointment appt = buildAppointment(tenantId, req, new Appointment());
        userRepo.findById(userId).ifPresent(appt::setCreatedBy);
        appt = appointmentRepo.save(appt);
        syncVisitTypeCharge(appt);
        log.info("Appointment " + appt.getId() + " created for tenant " + tenantId);
        return toResponse(appt);
    }

    // ── UPDATE ────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public AppointmentResponse update(UUID tenantId, Long id, Long userId, AppointmentRequest req) {
        Appointment existing = findOrThrow(tenantId, id);

        // Capture the OLD status before we overwrite it
        VisitStatus oldStatus = existing.getVisitStatus();

        validateAndCheckConflicts(tenantId, req);
        buildAppointment(tenantId, req, existing);
        existing.setUpdatedBy(userId);
        existing = appointmentRepo.save(existing);
        syncVisitTypeCharge(existing);

        VisitStatus newStatus = existing.getVisitStatus();

        // ── Auto-generate invoice when visit transitions to a terminal+chargeable status ──
        // e.g. "Completed", "Done" — but NOT "Cancelled" or "No Show" (not chargeable)
        boolean wasNotTerminal  = !oldStatus.isTerminal();
        boolean isNowTerminal   = newStatus.isTerminal() && newStatus.isChargeable();
        boolean hasNoInvoiceYet = existing.getInvoice() == null;

        if (wasNotTerminal && isNowTerminal && hasNoInvoiceYet) {
            try {
                billingService.generateInvoiceFromAppointment(tenantId, id, userId);
                log.info("Auto-generated invoice for appointment " + id
                         + " on status change to '" + newStatus.getName() + "'");
            } catch (Exception e) {
                // Non-fatal — invoice can be created manually from the billing screen
                log.warning("Could not auto-generate invoice for appointment " + id
                            + ": " + e.getMessage());
            }
            // Re-fetch to pick up the newly linked invoice
            existing = findOrThrow(tenantId, id);
        }

        log.info("Appointment " + id + " updated by user " + userId);
        return toResponse(existing);
    }

    // ── CANCEL ────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public void cancel(UUID tenantId, Long id, Long userId) {
        Appointment appt = findOrThrow(tenantId, id);
        if (appt.getVisitStatus().isTerminal()) {
            throw new BusinessException("Cannot cancel a terminal appointment (status: "
                    + appt.getVisitStatus().getName() + ")");
        }
        VisitStatus cancelled = statusRepo
                .findByTenantIdAndNameIgnoreCase(tenantId, "Cancelled")
                .orElseThrow(() -> new BusinessException("Cancelled visit status not configured"));
        appt.setVisitStatus(cancelled);
        appointmentRepo.save(appt);
        log.info("Appointment " + id + " cancelled by user " + userId);
    }

    // ── AVAILABILITY CHECK ────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public AvailabilityConflict checkAvailability(UUID tenantId, AppointmentRequest req) {
        Long excludeId = req.getExcludeAppointmentId() != null ? req.getExcludeAppointmentId() : -1L;

        // ── 1. Outside working hours — overridable warning ──────────────────
        if (!req.isAllowOutsideHours()) {
            AvailabilityConflict scheduleConflict = validateResourceSchedule(tenantId, req);
            if (scheduleConflict != null) return scheduleConflict;
        }

        // ── 2. Double-booking on resource — overridable warning ─────────────
        if (!req.isAllowDoubleBook()) {
            if (req.getResourceId() != null) {
                List<Appointment> conflicts = appointmentRepo.findConflictingByResource(
                        req.getResourceId(), req.getApptDate(),
                        req.getStartTime(), req.getEndTime(), excludeId);
                if (!conflicts.isEmpty()) {
                    Appointment c = conflicts.get(0);
                    return AvailabilityConflict.builder()
                            .available(false)
                            .conflictType("DOUBLE_BOOK")
                            .overridable(true)
                            .reason("Double-booking: this resource is already booked")
                            .conflictingAppointmentId(c.getId())
                            .conflictingCustomerName(
                                c.getCustomer().getFirstName() + " " + c.getCustomer().getLastName())
                            .date(c.getApptDate())
                            .startTime(c.getStartTime())
                            .endTime(c.getEndTime())
                            .build();
                }
            }

            if (req.getStaffResourceId() != null) {
                List<Appointment> conflicts = appointmentRepo.findConflictingByStaffResource(
                        req.getStaffResourceId(), req.getApptDate(),
                        req.getStartTime(), req.getEndTime(), excludeId);
                if (!conflicts.isEmpty()) {
                    Appointment c = conflicts.get(0);
                    return AvailabilityConflict.builder()
                            .available(false)
                            .conflictType("DOUBLE_BOOK")
                            .overridable(true)
                            .reason("Double-booking: this staff member is already booked")
                            .conflictingAppointmentId(c.getId())
                            .conflictingCustomerName(
                                c.getCustomer().getFirstName() + " " + c.getCustomer().getLastName())
                            .date(c.getApptDate())
                            .startTime(c.getStartTime())
                            .endTime(c.getEndTime())
                            .build();
                }
            }
        }

        // ── 3. Same patient, same day — overridable warning ──────────────────
        // This check ALWAYS runs (not gated by allow flags) but is always overridable.
        if (req.getCustomerId() != null && req.getApptDate() != null) {
            List<Appointment> existing = appointmentRepo.findActiveByCustomerAndDate(
                    tenantId, req.getCustomerId(), req.getApptDate(), excludeId);
            if (!existing.isEmpty() && !req.isAllowDoubleBook()) {
                Appointment c = existing.get(0);
                return AvailabilityConflict.builder()
                        .available(false)
                        .conflictType("SAME_PATIENT_SAME_DAY")
                        .overridable(true)
                        .reason("This patient already has an appointment on "
                                + req.getApptDate())
                        .conflictingAppointmentId(c.getId())
                        .conflictingCustomerName(
                            c.getCustomer().getFirstName() + " " + c.getCustomer().getLastName())
                        .date(c.getApptDate())
                        .startTime(c.getStartTime())
                        .endTime(c.getEndTime())
                        .build();
            }
        }

        return AvailabilityConflict.builder().available(true).build();
    }

    // ── PRIVATE HELPERS ───────────────────────────────────────────────────

    private void validateAndCheckConflicts(UUID tenantId, AppointmentRequest req) {
        if (req.getEndTime().isBefore(req.getStartTime()) ||
                req.getEndTime().equals(req.getStartTime())) {
            throw new BusinessException("End time must be after start time");
        }
        // checkAvailability already respects allowDoubleBook / allowOutsideHours —
        // if those flags are true, the corresponding checks are skipped entirely
        // and checkAvailability returns available=true, so this will not throw.
        AvailabilityConflict conflict = checkAvailability(tenantId, req);
        if (!conflict.isAvailable()) {
            String msg = conflict.getReason();
            if (conflict.getConflictingAppointmentId() != null) {
                msg += " — conflicts with appointment #" + conflict.getConflictingAppointmentId()
                     + " (" + conflict.getConflictingCustomerName()
                     + " at " + conflict.getStartTime() + ")";
            }
            throw new BusinessException(msg);
        }
    }

    private AvailabilityConflict validateResourceSchedule(UUID tenantId, AppointmentRequest req) {
        EntityType entityType;
        Long entityId;
        if (req.getResourceId() != null) {
            entityType = EntityType.RESOURCE;
            entityId   = req.getResourceId();
        } else {
            entityType = EntityType.STAFF;
            entityId   = req.getStaffResourceId();
        }

        DayOfWeek dow = req.getApptDate().getDayOfWeek();
        List<ResourceSchedule> schedules = scheduleRepo.findEffectiveSchedules(
                entityType, entityId, dow, req.getApptDate());
        if (schedules.isEmpty()) return null;

        ResourceSchedule effective = schedules.get(0);
        if (!effective.isOpen()) {
            return AvailabilityConflict.builder()
                    .available(false)
                    .reason("Resource is not scheduled to work on " + dow)
                    .build();
        }
        if (req.getStartTime().isBefore(effective.getOpenTime()) ||
                req.getEndTime().isAfter(effective.getCloseTime())) {
            return AvailabilityConflict.builder()
                    .available(false)
                    .reason("Outside working hours ("
                            + effective.getOpenTime() + " - " + effective.getCloseTime() + ")")
                    .build();
        }
        return null;
    }

    private Appointment buildAppointment(UUID tenantId, AppointmentRequest req, Appointment a) {
        a.setTenantId(tenantId);
        a.setCustomer(customerRepo.findById(req.getCustomerId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer", req.getCustomerId())));
        if (req.getResourceId() != null) {
            Resource res = resourceRepo.findById(req.getResourceId())
                    .orElseThrow(() -> new ResourceNotFoundException("Resource", req.getResourceId()));
            if (!res.isActive())
                throw new BusinessException("Resource '" + res.getName() + "' is inactive and cannot be booked.");
            a.setResource(res);
        } else {
            a.setResource(null);
        }
        if (req.getStaffResourceId() != null) {
            com.yourowncrm.model.User staffRes = userRepo.findById(req.getStaffResourceId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", req.getStaffResourceId()));
            if (!staffRes.isActive())
                throw new BusinessException("Staff member '" + staffRes.getFirstName() + " " + staffRes.getLastName() + "' is inactive and cannot be booked.");
            a.setStaffResource(staffRes);
        } else {
            a.setStaffResource(null);
        }
        if (req.getStaffId() != null) {
            userRepo.findById(req.getStaffId()).ifPresent(staff -> {
                if (!staff.isActive())
                    throw new BusinessException("Assigned staff '" + staff.getFirstName() + " " + staff.getLastName() + "' is inactive.");
                a.setStaff(staff);
            });
        }
        if (req.getLocationId() != null)
            locationRepo.findById(req.getLocationId()).ifPresent(a::setLocation);
        if (req.getVisitTypeId() != null)
            visitTypeRepo.findById(req.getVisitTypeId()).ifPresent(a::setVisitType);
        a.setVisitStatus(statusRepo.findById(req.getVisitStatusId())
                .orElseThrow(() -> new ResourceNotFoundException("VisitStatus", req.getVisitStatusId())));
        a.setApptDate(req.getApptDate());
        a.setStartTime(req.getStartTime());
        a.setEndTime(req.getEndTime());
        a.setDurationMin((short) ChronoUnit.MINUTES.between(req.getStartTime(), req.getEndTime()));
        a.setChargeAmount(req.getChargeAmount());
        a.setNotes(req.getNotes());
        return a;
    }

    /**
     * Keeps the VISIT_TYPE row in appt_charges in sync with the appointment's
     * visit type and charge amount.  Called after every create/update save.
     */
    private void syncVisitTypeCharge(Appointment appt) {
        apptChargeRepo.deleteByAppointmentIdAndSource(appt.getId(), "VISIT_TYPE");
        VisitType vt = appt.getVisitType();
        if (vt == null) return;

        BigDecimal price = Optional.ofNullable(appt.getChargeAmount())
            .filter(a -> a.compareTo(BigDecimal.ZERO) > 0)
            .orElse(vt.getDefaultPrice() != null ? vt.getDefaultPrice() : BigDecimal.ZERO);

        ApptCharge charge = new ApptCharge();
        charge.setTenantId(appt.getTenantId());
        charge.setAppointmentId(appt.getId());
        charge.setSource("VISIT_TYPE");
        charge.setDescription(vt.getName());
        charge.setChargeCode(vt.getChargeCode() != null ? vt.getChargeCode().getCode() : null);
        charge.setQuantity(BigDecimal.ONE);
        charge.setUnitPrice(price);
        charge.setSortOrder((short) 0);
        apptChargeRepo.save(charge);
    }

    private Appointment findOrThrow(UUID tenantId, Long id) {
        return appointmentRepo.findById(id)
                .filter(a -> a.getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Appointment", id));
    }

    @Override
    public AppointmentResponse toResponsePublic(Appointment a) { return toResponse(a); }

    private AppointmentResponse toResponse(Appointment a) {
        AppointmentResponse r = new AppointmentResponse();
        r.setId(a.getId());
        r.setCustomerId(a.getCustomer().getId());
        r.setCustomerFullName(a.getCustomer().getFirstName() + " " + a.getCustomer().getLastName());
        if (a.getResource() != null) {
            r.setResourceId(a.getResource().getId());
            r.setResourceName(a.getResource().getName());
        }
        if (a.getStaffResource() != null) {
            r.setStaffResourceId(a.getStaffResource().getId());
            r.setStaffResourceName(
                a.getStaffResource().getFirstName() + " " + a.getStaffResource().getLastName());
        }
        if (a.getStaff() != null) {
            r.setStaffId(a.getStaff().getId());
            r.setStaffName(a.getStaff().getFirstName() + " " + a.getStaff().getLastName());
        }
        if (a.getLocation() != null) {
            r.setLocationId(a.getLocation().getId());
            r.setLocationName(a.getLocation().getName());
        }
        if (a.getVisitType() != null) {
            r.setVisitTypeId(a.getVisitType().getId());
            r.setVisitTypeName(a.getVisitType().getName());
        }
        r.setVisitStatusId(a.getVisitStatus().getId());
        r.setVisitStatusName(a.getVisitStatus().getName());
        r.setVisitStatusColor(a.getVisitStatus().getColorHex());
        r.setVisitStatusTerminal(a.getVisitStatus().isTerminal());
        r.setVisitStatusChargeable(a.getVisitStatus().isChargeable());
        r.setApptDate(a.getApptDate());
        r.setStartTime(a.getStartTime());
        r.setEndTime(a.getEndTime());
        r.setDurationMin(a.getDurationMin());
        r.setChargeAmount(a.getChargeAmount());
        r.setNotes(a.getNotes());
        if (a.getInvoice() != null) {
            r.setInvoiceId(a.getInvoice().getId());
            r.setInvoiceNumber(a.getInvoice().getInvoiceNumber());
        }
        r.setCreatedAt(a.getCreatedAt());
        return r;
    }
}
