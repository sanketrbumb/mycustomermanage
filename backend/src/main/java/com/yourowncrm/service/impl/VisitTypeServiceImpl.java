package com.yourowncrm.service.impl;

import com.yourowncrm.exception.ResourceNotFoundException;
import com.yourowncrm.model.VisitType;
import com.yourowncrm.repository.ChargeCodeRepository;
import com.yourowncrm.repository.VisitTypeRepository;
import com.yourowncrm.service.VisitTypeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class VisitTypeServiceImpl implements VisitTypeService {

    private final VisitTypeRepository repo;
    private final ChargeCodeRepository ccRepo;

    @Autowired
    public VisitTypeServiceImpl(VisitTypeRepository repo, ChargeCodeRepository ccRepo) {
        this.repo = repo;
        this.ccRepo = ccRepo;
    }

    @Override
    public List<VisitType> getAll(UUID tenantId) { return repo.findByTenantIdAndActiveTrue(tenantId); }

    @Override
    public VisitType getById(UUID tenantId, Long id) {
        return repo.findById(id)
            .filter(v -> v.getTenantId().equals(tenantId))
            .orElseThrow(() -> new ResourceNotFoundException("VisitType", id));
    }

    @Override
    @Transactional
    public VisitType create(UUID tenantId, Map<String, Object> req) {
        VisitType vt = new VisitType();
        vt.setTenantId(tenantId);
        vt.setName((String) req.get("name"));
        vt.setDefaultPrice(new BigDecimal(req.getOrDefault("defaultPrice", "0").toString()));
        vt.setDurationMin(Short.parseShort(req.getOrDefault("durationMin", "60").toString()));
        vt.setColorHex(req.containsKey("colorHex") ? (String) req.get("colorHex") : "#1a4a3a");
        vt.setActive(true);
        if (req.containsKey("chargeCodeId") && req.get("chargeCodeId") != null)
            ccRepo.findById(Long.valueOf(req.get("chargeCodeId").toString())).ifPresent(vt::setChargeCode);
        if (req.containsKey("_createdBy")) vt.setCreatedBy((Long) req.get("_createdBy"));
        return repo.save(vt);
    }

    @Override
    @Transactional
    public VisitType update(UUID tenantId, Long id, Map<String, Object> req) {
        VisitType vt = getById(tenantId, id);
        if (req.containsKey("name"))         vt.setName((String) req.get("name"));
        if (req.containsKey("defaultPrice"))  vt.setDefaultPrice(new BigDecimal(req.get("defaultPrice").toString()));
        if (req.containsKey("durationMin"))   vt.setDurationMin(Short.parseShort(req.get("durationMin").toString()));
        if (req.containsKey("colorHex"))      vt.setColorHex((String) req.get("colorHex"));
        return repo.save(vt);
    }

    @Override
    @Transactional
    public void deactivate(UUID tenantId, Long id) {
        VisitType vt = getById(tenantId, id);
        vt.setActive(false);
        repo.save(vt);
    }
}
