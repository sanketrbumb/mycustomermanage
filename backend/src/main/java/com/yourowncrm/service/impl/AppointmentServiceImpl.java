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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
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

    @Autowired
    public AppointmentServiceImpl(AppointmentRepository appointmentRepo,
                                   ResourceRepository resourceRepo,
                                   UserRepository userRepo,
                                   VisitStatusRepository statusRepo,
                                   VisitTypeRepository visitTypeRepo,
                                   LocationRepository locationRepo,
                                   CustomerRepository customerRepo,
                                   ResourceScheduleRepository scheduleRepo) {
        this.appointmentRepo = appointmentRepo;
        this.resourceRepo    = resourceRepo;
        this.userRepo        = userRepo;
        this.statusRepo      = statusRepo;
        this.visitTypeRepo   = visitTypeRepo;
        this.locationRepo    = locationRepo;
        this.customerRepo    = customerRepo;
        this.scheduleRepo    = scheduleRepo;
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
        log.info("Appointment " + appt.getId() + " created for tenant " + tenantId);
        return toResponse(appt);
    }

    // ── UPDATE ────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public AppointmentResponse update(UUID tenantId, Long id, Long userId, AppointmentRequest req) {
        Appointment existing = findOrThrow(tenantId, id);
        validateAndCheckConflicts(tenantId, req);
        buildAppointment(tenantId, req, existing);
        existing.setUpdatedBy(userId);
        existing = appointmentRepo.save(existing);
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
        AvailabilityConflict scheduleConflict = validateResourceSchedule(tenantId, req);
        if (scheduleConflict != null) return scheduleConflict;

        Long excludeId = req.getExcludeAppointmentId() != null ? req.getExcludeAppointmentId() : -1L;

        if (req.getResourceId() != null) {
            List<Appointment> conflicts = appointmentRepo.findConflictingByResource(
                    req.getResourceId(), req.getApptDate(),
                    req.getStartTime(), req.getEndTime(), excludeId);
            if (!conflicts.isEmpty()) {
                Appointment c = conflicts.get(0);
                return AvailabilityConflict.builder()
                        .available(false)
                        .reason("Double-booking conflict with existing appointment")
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
                        .reason("Staff member already booked during this time")
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
        AvailabilityConflict conflict = checkAvailability(tenantId, req);
        if (!conflict.isAvailable()) {
            throw new BusinessException(conflict.getReason()
                    + " — conflicts with appointment #"
                    + conflict.getConflictingAppointmentId()
                    + " (" + conflict.getConflictingCustomerName()
                    + " at " + conflict.getStartTime() + ")");
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
