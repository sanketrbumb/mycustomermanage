package com.yourowncrm.controller;

import com.yourowncrm.model.State;
import com.yourowncrm.repository.StateRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * GET /api/states?country=US   — active states for a country (default US)
 * GET /api/states               — all active states grouped by country
 *
 * POST/PUT/DELETE /api/states   — admin management (SUPER_ADMIN only)
 */
@RestController
@RequestMapping("/api/states")
public class StateController {

    private final StateRepository repo;

    @Autowired
    public StateController(StateRepository repo) {
        this.repo = repo;
    }

    /** List active states — optionally filtered by country code */
    @GetMapping
    public List<Map<String, String>> list(
            @RequestParam(defaultValue = "US") String country) {
        return repo.findByCountryCodeAndActiveTrueOrderBySortOrderAscNameAsc(
                country.toUpperCase())
            .stream()
            .map(s -> Map.of(
                "code",    s.getCode(),
                "name",    s.getName(),
                "country", s.getCountryCode()
            ))
            .toList();
    }

    /** All active states across all countries */
    @GetMapping("/all")
    public List<Map<String, String>> listAll() {
        return repo.findByActiveTrueOrderByCountryCodeAscSortOrderAscNameAsc()
            .stream()
            .map(s -> Map.of(
                "code",    s.getCode(),
                "name",    s.getName(),
                "country", s.getCountryCode()
            ))
            .toList();
    }

    /** Add a new state (SUPER_ADMIN only) */
    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public State create(@RequestBody State state) {
        return repo.save(state);
    }

    /** Deactivate a state — keeps history intact */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public void deactivate(@PathVariable Long id) {
        repo.findById(id).ifPresent(s -> {
            s.setActive(false);
            repo.save(s);
        });
    }
}
