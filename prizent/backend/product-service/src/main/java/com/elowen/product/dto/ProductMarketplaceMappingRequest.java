package com.elowen.product.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;

/**
 * Request DTO for saving product-marketplace mappings
 */
public class ProductMarketplaceMappingRequest {

    @NotNull
    private List<MappingEntry> mappings;

    public ProductMarketplaceMappingRequest() {}

    public List<MappingEntry> getMappings() { return mappings; }
    public void setMappings(List<MappingEntry> mappings) { this.mappings = mappings; }

    public static class MappingEntry {

        @NotNull(message = "Marketplace ID is required")
        private Long marketplaceId;

        private String marketplaceName;

        private String productMarketplaceName;

        public MappingEntry() {}

        public Long getMarketplaceId() { return marketplaceId; }
        public void setMarketplaceId(Long marketplaceId) { this.marketplaceId = marketplaceId; }

        public String getMarketplaceName() { return marketplaceName; }
        public void setMarketplaceName(String marketplaceName) { this.marketplaceName = marketplaceName; }

        public String getProductMarketplaceName() { return productMarketplaceName; }
        public void setProductMarketplaceName(String productMarketplaceName) { this.productMarketplaceName = productMarketplaceName; }
    }
}
