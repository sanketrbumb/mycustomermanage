package com.yourowncrm.service.impl;

import com.yourowncrm.exception.ResourceNotFoundException;
import com.yourowncrm.model.VisitStatus;
import com.yourowncrm.repository.VisitStatusRepository;
import com.yourowncrm.service.VisitStatusService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class VisitStatusServiceImpl implements VisitStatusService {

    private final VisitStatusRepository repo;

    @Autowired
    public VisitStatusServiceImpl(VisitStatusRepository repo) { this.repo = repo; }

    @Override
    public List<VisitStatus> getAll(UUID tenantId) { return repo.findByTenantIdOrderBySortOrderAsc(tenantId); }

    @Override
    public VisitStatus getById(UUID tenantId, Long id) {
        return repo.findById(id)
            .filter(s -> s.getTenantId().equals(tenantId))
            .orElseThrow(() -> new ResourceNotFoundException("VisitStatus", id));
    }

    @Override
    @Transactional
    public VisitStatus create(UUID tenantId, Map<String, Object> req) {
        VisitStatus s = new VisitStatus();
        s.setTenantId(tenantId);
        s.setName((String) req.get("name"));
        s.setSortOrder(Short.parseShort(req.getOrDefault("sortOrder", "0").toString()));
        s.setTerminal(Boolean.parseBoolean(req.getOrDefault("terminal", "false").toString()));
        s.setChargeable(Boolean.parseBoolean(req.getOrDefault("chargeable", "true").toString()));
        s.setColorHex(req.containsKey("colorHex") ? (String) req.get("colorHex") : "#7a7a7a");
        if (req.containsKey("_createdBy")) s.setCreatedBy((Long) req.get("_createdBy"));
        return repo.save(s);
    }

    @Override
    @Transactional
    public VisitStatus update(UUID tenantId, Long id, Map<String, Object> req) {
        VisitStatus s = getById(tenantId, id);
        if (req.containsKey("name"))       s.setName((String) req.get("name"));
        if (req.containsKey("sortOrder"))  s.setSortOrder(Short.parseShort(req.get("sortOrder").toString()));
        if (req.containsKey("terminal"))   s.setTerminal((Boolean) req.get("terminal"));
        if (req.containsKey("chargeable")) s.setChargeable((Boolean) req.get("chargeable"));
        if (req.containsKey("colorHex"))   s.setColorHex((String) req.get("colorHex"));
        return repo.save(s);
    }

    @Override
    @Transactional
    public void deactivate(UUID tenantId, Long id) { /* VisitStatus has no active flag */ }
}
