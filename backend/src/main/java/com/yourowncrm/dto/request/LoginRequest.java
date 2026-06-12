package com.yourowncrm.dto.request;
import jakarta.validation.constraints.NotBlank;

public class LoginRequest {
    @NotBlank private String tenantSlug;
    @NotBlank private String username;
    @NotBlank private String password;
    public LoginRequest() {}
    public String getTenantSlug() { return tenantSlug; }
    public void setTenantSlug(String v) { this.tenantSlug=v; }
    public String getUsername() { return username; }
    public void setUsername(String v) { this.username=v; }
    public String getPassword() { return password; }
    public void setPassword(String v) { this.password=v; }
}
