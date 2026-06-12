package com.yourowncrm.service;
import com.yourowncrm.model.VisitStatus;
import java.util.List;
import java.util.Map;
import java.util.UUID;
public interface VisitStatusService {
    List<VisitStatus> getAll(UUID tenantId);
    VisitStatus       getById(UUID tenantId, Long id);
    VisitStatus       create(UUID tenantId, Map<String,Object> req);
    VisitStatus       update(UUID tenantId, Long id, Map<String,Object> req);
    void           deactivate(UUID tenantId, Long id);
}
