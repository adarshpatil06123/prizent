package com.elowen.product.dto;

import com.elowen.product.entity.ProductMarketplaceMapping;
import java.time.LocalDateTime;

/**
 * Response DTO for product-marketplace mapping
 */
public class ProductMarketplaceMappingResponse {

    private Long id;
    private Long clientId;
    private Long productId;
    private String productName;
    private Long marketplaceId;
    private String marketplaceName;
    private String productMarketplaceName;
    private LocalDateTime createDateTime;
    private LocalDateTime updatedDateTime;
    private Long updatedBy;

    public ProductMarketplaceMappingResponse() {}

    public static ProductMarketplaceMappingResponse from(ProductMarketplaceMapping e) {
        ProductMarketplaceMappingResponse r = new ProductMarketplaceMappingResponse();
        r.id = e.getId();
        r.clientId = e.getClientId();
        r.productId = e.getProductId();
        r.productName = e.getProductName();
        r.marketplaceId = e.getMarketplaceId();
        r.marketplaceName = e.getMarketplaceName();
        r.productMarketplaceName = e.getProductMarketplaceName();
        r.createDateTime = e.getCreateDateTime();
        r.updatedDateTime = e.getUpdatedDateTime();
        r.updatedBy = e.getUpdatedBy();
        return r;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getClientId() { return clientId; }
    public void setClientId(Long clientId) { this.clientId = clientId; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public Long getMarketplaceId() { return marketplaceId; }
    public void setMarketplaceId(Long marketplaceId) { this.marketplaceId = marketplaceId; }

    public String getMarketplaceName() { return marketplaceName; }
    public void setMarketplaceName(String marketplaceName) { this.marketplaceName = marketplaceName; }

    public String getProductMarketplaceName() { return productMarketplaceName; }
    public void setProductMarketplaceName(String productMarketplaceName) { this.productMarketplaceName = productMarketplaceName; }

    public LocalDateTime getCreateDateTime() { return createDateTime; }
    public void setCreateDateTime(LocalDateTime createDateTime) { this.createDateTime = createDateTime; }

    public LocalDateTime getUpdatedDateTime() { return updatedDateTime; }
    public void setUpdatedDateTime(LocalDateTime updatedDateTime) { this.updatedDateTime = updatedDateTime; }

    public Long getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(Long updatedBy) { this.updatedBy = updatedBy; }
}
