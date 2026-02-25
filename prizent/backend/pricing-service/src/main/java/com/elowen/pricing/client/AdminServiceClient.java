package com.elowen.pricing.client;

import com.elowen.pricing.dto.MarketplaceCostDto;
import com.elowen.pricing.dto.MarketplaceDto;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;

import java.util.List;

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

    /**
     * Returns effective costs for a (marketplaceId, brandId) pair:
     * brand-specific costs if they exist, otherwise marketplace-level defaults.
     */
    @Cacheable(value = "effectiveCosts", key = "#marketplaceId + '_' + #brandId")
    public List<MarketplaceCostDto> getEffectiveMarketplaceCosts(Long marketplaceId, Long brandId, String authToken) {
        String url = adminServiceUrl + "/marketplaces/" + marketplaceId + "/effective-costs"
                + (brandId != null ? "?brandId=" + brandId : "");

        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.AUTHORIZATION, authToken);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        ResponseEntity<CostsWrapper> response =
            restTemplate.exchange(url, HttpMethod.GET, entity, CostsWrapper.class);

        if (response.getBody() == null || response.getBody().getCosts() == null) {
            return List.of();
        }
        return response.getBody().getCosts();
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class MarketplaceWrapper {
        private MarketplaceDto marketplace;
        public MarketplaceDto getMarketplace() { return marketplace; }
        public void setMarketplace(MarketplaceDto marketplace) { this.marketplace = marketplace; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CostsWrapper {
        private List<MarketplaceCostDto> costs;
        public List<MarketplaceCostDto> getCosts() { return costs; }
        public void setCosts(List<MarketplaceCostDto> costs) { this.costs = costs; }
    }
}
