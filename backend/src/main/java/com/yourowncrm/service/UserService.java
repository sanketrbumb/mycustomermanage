package com.yourowncrm.service;
import com.yourowncrm.dto.request.LoginRequest;
import com.yourowncrm.dto.response.AuthResponse;
import com.yourowncrm.model.User;
import java.util.List;
import java.util.Map;
import java.util.UUID;
public interface UserService {
    AuthResponse login(LoginRequest req);
    List<User>   getAll(UUID tenantId);
    User         getById(UUID tenantId, Long id);
    User         create(UUID tenantId, Map<String,Object> req);
    User         update(UUID tenantId, Long id, Map<String,Object> req);
    void         deactivate(UUID tenantId, Long id);
}
