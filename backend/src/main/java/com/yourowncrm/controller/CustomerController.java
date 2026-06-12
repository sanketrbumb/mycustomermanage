package com.yourowncrm.controller;

import com.yourowncrm.exception.ResourceNotFoundException;
import com.yourowncrm.model.Customer;
import com.yourowncrm.repository.CustomerRepository;
import com.yourowncrm.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    private final CustomerRepository repo;
    private final JwtTokenProvider   jwtProvider;

    @Autowired
    public CustomerController(CustomerRepository repo,
                               JwtTokenProvider jwtProvider) {
        this.repo        = repo;
        this.jwtProvider = jwtProvider;
    }

    @GetMapping
    public List<Customer> search(
            @RequestHeader("Authorization") String t,
            @RequestParam(defaultValue = "") String q) {
        return repo.search(tid(t), q, PageRequest.of(0, 50)).getContent();
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
        req.setCreatedBy(jwtProvider.getUserId(t.substring(7)));
        return ResponseEntity.status(201).body(repo.save(req));
    }

    @PutMapping("/{id}")
    public Customer update(
            @RequestHeader("Authorization") String t,
            @PathVariable Long id,
            @RequestBody Customer req) {
        Customer existing = repo.findById(id)
                .filter(c -> c.getTenantId().equals(tid(t)))
                .orElseThrow(() -> new ResourceNotFoundException("Customer", id));
        req.setId(existing.getId());
        req.setTenantId(existing.getTenantId());
        return repo.save(req);
    }

    private UUID tid(String header) {
        return jwtProvider.getTenantId(header.substring(7));
    }
}
