package com.yourowncrm.service;
import com.yourowncrm.model.Location;
import java.util.List;
import java.util.Map;
import java.util.UUID;
public interface LocationService {
    List<Location> getAll(UUID tenantId);
    Location       getById(UUID tenantId, Long id);
    Location       create(UUID tenantId, Map<String,Object> req);
    Location       update(UUID tenantId, Long id, Map<String,Object> req);
    void           deactivate(UUID tenantId, Long id);
}
