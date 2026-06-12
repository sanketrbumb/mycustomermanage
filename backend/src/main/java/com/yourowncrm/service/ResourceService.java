package com.yourowncrm.service;
import com.yourowncrm.model.Resource;
import java.util.List;
import java.util.Map;
import java.util.UUID;
public interface ResourceService {
    List<Resource> getAll(UUID tenantId);
    Resource       getById(UUID tenantId, Long id);
    Resource       create(UUID tenantId, Map<String,Object> req);
    Resource       update(UUID tenantId, Long id, Map<String,Object> req);
    void           deactivate(UUID tenantId, Long id);
}
