package com.yourowncrm.controller;

import com.yourowncrm.exception.ResourceNotFoundException;
import com.yourowncrm.model.Customer;
import com.yourowncrm.repository.CustomerRepository;
import com.yourowncrm.security.JwtTokenProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.yourowncrm.model.CustomerPicture;
import com.yourowncrm.repository.CustomerPictureRepository;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;
import java.util.Map;
import java.util.HashMap;
import java.util.Optional;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    private static final Logger AUDIT = LoggerFactory.getLogger("AUDIT");

    private final CustomerRepository repo;
    private final CustomerPictureRepository pictureRepo;
    private final JwtTokenProvider   jwtProvider;

    @Autowired
    public CustomerController(CustomerRepository repo,
                               CustomerPictureRepository pictureRepo,
                               JwtTokenProvider jwtProvider) {
        this.repo        = repo;
        this.pictureRepo = pictureRepo;
        this.jwtProvider = jwtProvider;
    }

    @GetMapping
    public List<Customer> search(
            @RequestHeader("Authorization") String t,
            @RequestParam(defaultValue = "") String q) {
        String queryPattern = "%" + q.trim() + "%";
        return repo.search(tid(t), queryPattern, PageRequest.of(0, 50)).getContent();
    }

    @GetMapping("/{id}")
    public Customer getById(
            @RequestHeader("Authorization") String t,
            @PathVariable Long id) {
        return repo.findById(id)
                   .filter(c -> c.getTenantId().equals(tid(t)))
                   .orElseThrow(() -> new ResourceNotFoundException("Customer", id));
    }

    @PostMapping
    public ResponseEntity<Customer> create(
            @RequestHeader("Authorization") String t,
            @RequestBody Customer req) {
        req.setTenantId(tid(t));
        req.setActive(true);
        Long userId = jwtProvider.getUserId(t.substring(7));
        req.setCreatedBy(userId);
        Customer saved = repo.save(req);
        AUDIT.info("CUSTOMER_CREATED customerId={} tenantId={} userId={} name=\"{} {}\"",
                   saved.getId(), saved.getTenantId(), userId, saved.getFirstName(), saved.getLastName());
        return ResponseEntity.status(201).body(saved);
    }

    @PutMapping("/{id}")
    public Customer update(
            @RequestHeader("Authorization") String t,
            @PathVariable Long id,
            @RequestBody Customer req) {
        Customer existing = repo.findById(id)
                .filter(c -> c.getTenantId().equals(tid(t)))
                .orElseThrow(() -> new ResourceNotFoundException("Customer", id));
        
        Long userId = jwtProvider.getUserId(t.substring(7));
        
        List<String> changes = new java.util.ArrayList<>();
        addIfChanged(changes, "firstName", existing.getFirstName(), req.getFirstName());
        addIfChanged(changes, "middleName", existing.getMiddleName(), req.getMiddleName());
        addIfChanged(changes, "lastName", existing.getLastName(), req.getLastName());
        addIfChanged(changes, "preferredName", existing.getPreferredName(), req.getPreferredName());
        addIfChanged(changes, "email", existing.getEmail(), req.getEmail());
        addIfChanged(changes, "phone", existing.getPhone(), req.getPhone());
        addIfChanged(changes, "dob", existing.getDob(), req.getDob());
        addIfChanged(changes, "gender", existing.getGender(), req.getGender());
        addIfChanged(changes, "address1", existing.getAddress1(), req.getAddress1());
        addIfChanged(changes, "address2", existing.getAddress2(), req.getAddress2());
        addIfChanged(changes, "city", existing.getCity(), req.getCity());
        addIfChanged(changes, "state", existing.getState(), req.getState());
        addIfChanged(changes, "zip", existing.getZip(), req.getZip());
        addIfChanged(changes, "membershipType", existing.getMembershipType(), req.getMembershipType());
        addIfChanged(changes, "referralSource", existing.getReferralSource(), req.getReferralSource());
        addIfChanged(changes, "emergencyContact", existing.getEmergencyContact(), req.getEmergencyContact());
        addIfChanged(changes, "emergencyPhone", existing.getEmergencyPhone(), req.getEmergencyPhone());
        addIfChanged(changes, "allergies", existing.getAllergies(), req.getAllergies());
        addIfChanged(changes, "medicalNotes", existing.getMedicalNotes(), req.getMedicalNotes());
        addIfChanged(changes, "consentOnFile", existing.isConsentOnFile(), req.isConsentOnFile());
        addIfChanged(changes, "active", existing.isActive(), req.isActive());
        
        if (!changes.isEmpty()) {
            AUDIT.info("CUSTOMER_UPDATED customerId={} tenantId={} userId={} changes=[{}]",
                       existing.getId(), existing.getTenantId(), userId, String.join(", ", changes));
        }

        req.setId(existing.getId());
        req.setTenantId(existing.getTenantId());
        return repo.save(req);
    }

    private <T> String compare(String fieldName, T oldVal, T newVal) {
        if (oldVal == null && newVal == null) return null;
        if (oldVal != null && oldVal.equals(newVal)) return null;
        if (oldVal == null && newVal instanceof String && ((String) newVal).isEmpty()) return null;
        return fieldName + "=\"" + (oldVal == null ? "" : oldVal) + "\"->\"" + (newVal == null ? "" : newVal) + "\"";
    }

    private <T> void addIfChanged(List<String> changes, String fieldName, T oldVal, T newVal) {
        String diff = compare(fieldName, oldVal, newVal);
        if (diff != null) {
            changes.add(diff);
        }
    }

    @GetMapping("/{id}/picture")
    public ResponseEntity<Map<String, String>> getPicture(
            @RequestHeader("Authorization") String t,
            @PathVariable Long id) {
        repo.findById(id)
            .filter(c -> c.getTenantId().equals(tid(t)))
            .orElseThrow(() -> new ResourceNotFoundException("Customer", id));

        Optional<CustomerPicture> pic = pictureRepo.findByCustomerIdAndTenantId(id, tid(t));
        Map<String, String> res = new HashMap<>();
        res.put("pictureData", pic.map(CustomerPicture::getPictureData).orElse(null));
        return ResponseEntity.ok(res);
    }

    @Transactional
    @PutMapping("/{id}/picture")
    public ResponseEntity<Void> updatePicture(
            @RequestHeader("Authorization") String t,
            @PathVariable Long id,
            @RequestBody Map<String, String> req) {
        UUID tenantId = tid(t);
        repo.findById(id)
            .filter(c -> c.getTenantId().equals(tenantId))
            .orElseThrow(() -> new ResourceNotFoundException("Customer", id));

        String pictureData = req.get("pictureData");
        if (pictureData == null || pictureData.trim().isEmpty()) {
            pictureRepo.deleteByCustomerIdAndTenantId(id, tenantId);
        } else {
            CustomerPicture pic = pictureRepo.findByCustomerIdAndTenantId(id, tenantId)
                                             .orElse(new CustomerPicture(id, tenantId));
            pic.setPictureData(pictureData);
            pic.setUpdatedAt(java.time.Instant.now());
            pictureRepo.save(pic);
        }
        return ResponseEntity.ok().build();
    }

    private UUID tid(String header) {
        return jwtProvider.getTenantId(header.substring(7));
    }
}
