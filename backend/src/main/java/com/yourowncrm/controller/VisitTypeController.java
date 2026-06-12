package com.yourowncrm.controller;
import com.yourowncrm.model.VisitType;
import com.yourowncrm.security.JwtTokenProvider;
import com.yourowncrm.service.VisitTypeService;

import org.springframework.data.domain.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController @RequestMapping("/api/visit-types") public class VisitTypeController {
    private final VisitTypeService service;
    private final JwtTokenProvider jwtProvider;
    @org.springframework.beans.factory.annotation.Autowired
    public VisitTypeController(VisitTypeService service, JwtTokenProvider jwtProvider) {
        this.service = service;
        this.jwtProvider = jwtProvider;
    }


    @GetMapping
    public List<VisitType> getAll(@RequestHeader("Authorization") String t) {
        return service.getAll(tid(t));
    }
    @GetMapping("/{id}")
    public VisitType getById(@RequestHeader("Authorization") String t, @PathVariable Long id) {
        return service.getById(tid(t), id);
    }
    @PostMapping
    public ResponseEntity<VisitType> create(@RequestHeader("Authorization") String t,
                                       @RequestBody Map<String,Object> req) {
        return ResponseEntity.status(201).body(service.create(tid(t), req));
    }
    @PutMapping("/{id}")
    public VisitType update(@RequestHeader("Authorization") String t,
                       @PathVariable Long id, @RequestBody Map<String,Object> req) {
        return service.update(tid(t), id, req);
    }
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@RequestHeader("Authorization") String t, @PathVariable Long id) {
        service.deactivate(tid(t), id);
    }
    
    private UUID tid(String h) { return jwtProvider.getTenantId(h.substring(7)); }
}
