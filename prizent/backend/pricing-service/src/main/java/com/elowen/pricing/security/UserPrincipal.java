package com.elowen.pricing.security;

import java.security.Principal;

public class UserPrincipal implements Principal {
    private final Long userId;
    private final Integer clientId;
    private final String username;
    private final String role;

    public UserPrincipal(Long userId, Integer clientId, String username, String role) {
        this.userId = userId;
        this.clientId = clientId;
        this.username = username;
        this.role = role;
    }

    @Override
    public String getName() { return username; }
    public Long getUserId() { return userId; }
    public Integer getClientId() { return clientId; }
    public String getRole() { return role; }
}
