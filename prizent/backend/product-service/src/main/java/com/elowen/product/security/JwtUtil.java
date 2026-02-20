package com.elowen.product.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * JWT Utility class for parsing and extracting claims
 */
@Component
public class JwtUtil {

    private final SecretKey key;

    public JwtUtil(@Value("${jwt.secret}") String secret) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public Integer extractClientId(String token) {
        Claims claims = extractAllClaims(token);
        Object clientIdObj = claims.get("clientId");
        
        if (clientIdObj instanceof Integer) {
            return (Integer) clientIdObj;
        } else if (clientIdObj instanceof String) {
            try {
                return Integer.valueOf((String) clientIdObj);
            } catch (NumberFormatException e) {
                throw new RuntimeException("Invalid clientId format in token");
            }
        } else if (clientIdObj instanceof Number) {
            return ((Number) clientIdObj).intValue();
        } else {
            throw new RuntimeException("ClientId not found in token");
        }
    }

    public Long extractUserId(String token) {
        Claims claims = extractAllClaims(token);
        Object userIdObj = claims.get("userId");
        
        if (userIdObj instanceof Long) {
            return (Long) userIdObj;
        } else if (userIdObj instanceof String) {
            try {
                return Long.valueOf((String) userIdObj);
            } catch (NumberFormatException e) {
                throw new RuntimeException("Invalid userId format in token");
            }
        } else if (userIdObj instanceof Number) {
            return ((Number) userIdObj).longValue();
        } else {
            throw new RuntimeException("UserId not found in token");
        }
    }

    public String extractUsername(String token) {
        Claims claims = extractAllClaims(token);
        return claims.getSubject();
    }

    @SuppressWarnings("unchecked")
    public List<String> extractRoles(String token) {
        Claims claims = extractAllClaims(token);
        Object rolesObj = claims.get("roles");
        
        if (rolesObj instanceof List) {
            return (List<String>) rolesObj;
        } else if (rolesObj instanceof String[]) {
            return java.util.Arrays.asList((String[]) rolesObj);
        } else if (rolesObj instanceof String) {
            return java.util.Collections.singletonList((String) rolesObj);
        } else {
            return java.util.Collections.emptyList();
        }
    }

    public boolean isTokenValid(String token) {
        try {
            extractAllClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}