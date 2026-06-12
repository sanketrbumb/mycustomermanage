package com.yourowncrm.service;
import com.yourowncrm.model.VisitType;
import java.util.List;
import java.util.Map;
import java.util.UUID;
public interface VisitTypeService {
    List<VisitType> getAll(UUID tenantId);
    VisitType       getById(UUID tenantId, Long id);
    VisitType       create(UUID tenantId, Map<String,Object> req);
    VisitType       update(UUID tenantId, Long id, Map<String,Object> req);
    void           deactivate(UUID tenantId, Long id);
}
