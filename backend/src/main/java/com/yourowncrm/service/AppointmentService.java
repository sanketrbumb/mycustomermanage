package com.yourowncrm.service;

import com.yourowncrm.dto.request.AppointmentRequest;
import com.yourowncrm.dto.response.AppointmentResponse;
import com.yourowncrm.model.Appointment;
import com.yourowncrm.dto.response.AvailabilityConflict;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface AppointmentService {
    List<AppointmentResponse> getDailySchedule(UUID tenantId, LocalDate date, Long locationId);
    AppointmentResponse       getById(UUID tenantId, Long id);
    AppointmentResponse       create(UUID tenantId, Long userId, AppointmentRequest req);
    AppointmentResponse       update(UUID tenantId, Long id, Long userId, AppointmentRequest req);
    void                      cancel(UUID tenantId, Long id, Long userId);
    AvailabilityConflict      checkAvailability(UUID tenantId, AppointmentRequest req);

    AppointmentResponse toResponsePublic(Appointment a);
}