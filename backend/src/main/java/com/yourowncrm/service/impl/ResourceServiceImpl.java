package com.yourowncrm.service.impl;

import com.yourowncrm.exception.BusinessException;
import com.yourowncrm.exception.ResourceNotFoundException;
import com.yourowncrm.model.Resource;
import com.yourowncrm.repository.LocationRepository;
import com.yourowncrm.repository.ResourceRepository;
import com.yourowncrm.service.ResourceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ResourceServiceImpl implements ResourceService {

    private final ResourceRepository repo;
    private final LocationRepository locationRepo;

    @Autowired
    public ResourceServiceImpl(ResourceRepository repo, LocationRepository locationRepo) {
        this.repo = repo;
        this.locationRepo = locationRepo;
    }

    @Override
    public List<Resource> getAll(UUID tenantId) {
        return repo.findByTenantIdAndActiveTrue(tenantId);
    }

    @Override
    public Resource getById(UUID tenantId, Long id) {
        return repo.findById(id)
            .filter(r -> r.getTenantId().equals(tenantId))
            .orElseThrow(() -> new ResourceNotFoundException("Resource", id));
    }

    @Override
    @Transactional
    public Resource create(UUID tenantId, Map<String, Object> req) {
        Long locId = Long.valueOf(req.get("locationId").toString());
        var loc = locationRepo.findById(locId)
            .orElseThrow(() -> new ResourceNotFoundException("Location", locId));
        Resource r = new Resource();
        r.setTenantId(tenantId);
        r.setLocation(loc);
        r.setName((String) req.get("name"));
        r.setType((String) req.get("type"));
        r.setCapacity(req.containsKey("capacity")
            ? Short.parseShort(req.get("capacity").toString()) : (short) 1);
        r.setColorHex(req.containsKey("colorHex") ? (String) req.get("colorHex") : "#2980b9");
        r.setActive(true);
        if (req.containsKey("_createdBy")) r.setCreatedBy((Long) req.get("_createdBy"));
        return repo.save(r);
    }

    @Override
    @Transactional
    public Resource update(UUID tenantId, Long id, Map<String, Object> req) {
        Resource r = getById(tenantId, id);
        if (req.containsKey("name"))     r.setName((String) req.get("name"));
        if (req.containsKey("type"))     r.setType((String) req.get("type"));
        if (req.containsKey("colorHex")) r.setColorHex((String) req.get("colorHex"));
        if (req.containsKey("capacity")) r.setCapacity(Short.parseShort(req.get("capacity").toString()));
        if (req.containsKey("active"))   r.setActive((Boolean) req.get("active"));
        if (req.containsKey("locationId")) {
            locationRepo.findById(Long.valueOf(req.get("locationId").toString()))
                        .ifPresent(r::setLocation);
        }
        return repo.save(r);
    }

    @Override
    @Transactional
    public void deactivate(UUID tenantId, Long id) {
        Resource r = getById(tenantId, id);
        r.setActive(false);
        repo.save(r);
    }
}
