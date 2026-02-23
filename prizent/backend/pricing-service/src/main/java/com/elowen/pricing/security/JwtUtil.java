package com.elowen.pricing.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

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

    public String extractUsername(String token) {
        return extractAllClaims(token).getSubject();
    }

    public Integer extractClientId(String token) {
        Object v = extractAllClaims(token).get("clientId");
        if (v instanceof Number) return ((Number) v).intValue();
        if (v instanceof String) return Integer.valueOf((String) v);
        throw new RuntimeException("clientId not found in token");
    }

    public Long extractUserId(String token) {
        Object v = extractAllClaims(token).get("userId");
        if (v instanceof Number) return ((Number) v).longValue();
        if (v instanceof String) return Long.valueOf((String) v);
        throw new RuntimeException("userId not found in token");
    }

    @SuppressWarnings("unchecked")
    public List<String> extractRoles(String token) {
        Object v = extractAllClaims(token).get("roles");
        if (v instanceof List) return (List<String>) v;
        if (v instanceof String[]) return Arrays.asList((String[]) v);
        if (v instanceof String) return Collections.singletonList((String) v);
        return Collections.emptyList();
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
