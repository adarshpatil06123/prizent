package com.elowen.product.security;

/**
 * Principal class to hold authenticated user details extracted from JWT
 * Used for tenant isolation and audit trails in product service
 */
public class UserPrincipal {
    
    private final Long id;          // User ID as Long for updated_by field
    private final Integer clientId; // Client ID for tenant isolation
    private final String username;
    private final String role;

    public UserPrincipal(Long id, Integer clientId, String username, String role) {
        this.id = id;
        this.clientId = clientId;
        this.username = username;
        this.role = role;
    }

    public Long getId() {
        return id;
    }

    public Integer getClientId() {
        return clientId;
    }

    public String getUsername() {
        return username;
    }

    public String getRole() {
        return role;
    }

    public boolean isAdmin() {
        return "ADMIN".equals(role);
    }
    
    public boolean isSuperAdmin() {
        return "SUPER_ADMIN".equals(role);
    }

    @Override
    public String toString() {
        return "UserPrincipal{" +
                "id=" + id +
                ", clientId=" + clientId +
                ", username='" + username + '\'' +
                ", role='" + role + '\'' +
                '}';
    }
}