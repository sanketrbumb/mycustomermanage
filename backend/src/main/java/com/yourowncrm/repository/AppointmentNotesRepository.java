package com.yourowncrm.repository;

import com.yourowncrm.model.AppointmentNotes;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface AppointmentNotesRepository extends JpaRepository<AppointmentNotes, Long> {
    Optional<AppointmentNotes> findByAppointmentId(Long appointmentId);
}
