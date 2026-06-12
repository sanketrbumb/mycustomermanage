package com.yourowncrm.service.impl;

import com.yourowncrm.exception.ResourceNotFoundException;
import com.yourowncrm.model.Location;
import com.yourowncrm.repository.LocationRepository;
import com.yourowncrm.service.LocationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class LocationServiceImpl implements LocationService {

    private final LocationRepository repo;

    @Autowired
    public LocationServiceImpl(LocationRepository repo) { this.repo = repo; }

    @Override
    public List<Location> getAll(UUID tenantId) { return repo.findByTenantIdAndActiveTrue(tenantId); }

    @Override
    public Location getById(UUID tenantId, Long id) {
        return repo.findById(id)
            .filter(l -> l.getTenantId().equals(tenantId))
            .orElseThrow(() -> new ResourceNotFoundException("Location", id));
    }

    @Override
    @Transactional
    public Location create(UUID tenantId, Map<String, Object> req) {
        Location l = new Location();
        l.setTenantId(tenantId);
        l.setCode((String) req.get("code"));
        l.setName((String) req.get("name"));
        l.setAddress1((String) req.get("address1"));
        l.setCity((String) req.get("city"));
        l.setState((String) req.get("state"));
        l.setZip((String) req.get("zip"));
        l.setPhone((String) req.get("phone"));
        l.setEmail((String) req.get("email"));
        l.setColorHex(req.containsKey("colorHex") ? (String) req.get("colorHex") : "#1a4a3a");
        l.setActive(true);
        if (req.containsKey("_createdBy")) l.setCreatedBy((Long) req.get("_createdBy"));
        return repo.save(l);
    }

    @Override
    @Transactional
    public Location update(UUID tenantId, Long id, Map<String, Object> req) {
        Location l = getById(tenantId, id);
        if (req.containsKey("name"))     l.setName((String) req.get("name"));
        if (req.containsKey("address1")) l.setAddress1((String) req.get("address1"));
        if (req.containsKey("city"))     l.setCity((String) req.get("city"));
        if (req.containsKey("phone"))    l.setPhone((String) req.get("phone"));
        if (req.containsKey("colorHex")) l.setColorHex((String) req.get("colorHex"));
        return repo.save(l);
    }

    @Override
    @Transactional
    public void deactivate(UUID tenantId, Long id) {
        Location l = getById(tenantId, id);
        l.setActive(false);
        repo.save(l);
    }
}
