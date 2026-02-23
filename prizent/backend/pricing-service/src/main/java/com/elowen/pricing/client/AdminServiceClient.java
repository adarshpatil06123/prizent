package com.elowen.pricing.client;

import com.elowen.pricing.dto.MarketplaceDto;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;

@Component
public class AdminServiceClient {

    private final RestTemplate restTemplate;

    @Value("${admin.service.url}")
    private String adminServiceUrl;

    public AdminServiceClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * Fetches a marketplace by its ID from admin-service.
     * Response is cached per-id for 10 minutes (see CacheConfig).
     */
    @Cacheable(value = "marketplaces", key = "#marketplaceId")
    public MarketplaceDto getMarketplaceById(Long marketplaceId, String authToken) {
        String url = adminServiceUrl + "/marketplaces/" + marketplaceId;

        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.AUTHORIZATION, authToken);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        ResponseEntity<MarketplaceWrapper> response =
            restTemplate.exchange(url, HttpMethod.GET, entity, MarketplaceWrapper.class);

        if (response.getBody() == null || response.getBody().getMarketplace() == null) {
            throw new RuntimeException("Marketplace not found: " + marketplaceId);
        }
        return response.getBody().getMarketplace();
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class MarketplaceWrapper {
        private MarketplaceDto marketplace;
        public MarketplaceDto getMarketplace() { return marketplace; }
        public void setMarketplace(MarketplaceDto marketplace) { this.marketplace = marketplace; }
    }
}
