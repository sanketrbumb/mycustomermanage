package com.yourowncrm.dto.response;
import com.yourowncrm.model.enums.UserRole;

public class AuthResponse {
    private String accessToken;
    private String tokenType = "Bearer";
    private Long userId;
    private String username;
    private String fullName;
    private UserRole role;
    private String tenantId;
    private String tenantName;

    public AuthResponse() {}
    public String getAccessToken() { return accessToken; }
    public void setAccessToken(String v) { this.accessToken=v; }
    public String getTokenType() { return tokenType; }
    public void setTokenType(String v) { this.tokenType=v; }
    public Long getUserId() { return userId; }
    public void setUserId(Long v) { this.userId=v; }
    public String getUsername() { return username; }
    public void setUsername(String v) { this.username=v; }
    public String getFullName() { return fullName; }
    public void setFullName(String v) { this.fullName=v; }
    public UserRole getRole() { return role; }
    public void setRole(UserRole v) { this.role=v; }
    public String getTenantId() { return tenantId; }
    public void setTenantId(String v) { this.tenantId=v; }
    public String getTenantName() { return tenantName; }
    public void setTenantName(String v) { this.tenantName=v; }

    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private final AuthResponse r = new AuthResponse();
        public Builder accessToken(String v)  { r.accessToken=v; return this; }
        public Builder tokenType(String v)    { r.tokenType=v; return this; }
        public Builder userId(Long v)         { r.userId=v; return this; }
        public Builder username(String v)     { r.username=v; return this; }
        public Builder fullName(String v)     { r.fullName=v; return this; }
        public Builder role(UserRole v)       { r.role=v; return this; }
        public Builder tenantId(String v)     { r.tenantId=v; return this; }
        public Builder tenantName(String v)   { r.tenantName=v; return this; }
        public AuthResponse build() { return r; }
    }
}
