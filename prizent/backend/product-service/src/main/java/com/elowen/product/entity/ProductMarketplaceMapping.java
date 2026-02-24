package com.elowen.product.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Entity for product-to-marketplace mapping
 * Stores which marketplaces a product is listed on, with marketplace-specific name
 */
@Entity
@Table(name = "p_product_marketplace_mapping")
public class ProductMarketplaceMapping {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "client_id", nullable = false)
    private Long clientId;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "product_name", length = 255)
    private String productName;

    @Column(name = "marketplace_id", nullable = false)
    private Long marketplaceId;

    @Column(name = "marketplace_name", length = 255)
    private String marketplaceName;

    @Column(name = "product_marketplace_name", length = 255)
    private String productMarketplaceName;

    @Column(name = "create_date_time", nullable = false, updatable = false)
    private LocalDateTime createDateTime;

    @Column(name = "updated_date_time")
    private LocalDateTime updatedDateTime;

    @Column(name = "updated_by")
    private Long updatedBy;

    public ProductMarketplaceMapping() {}

    public ProductMarketplaceMapping(Long clientId, Long productId, String productName,
                                     Long marketplaceId, String marketplaceName,
                                     String productMarketplaceName, Long updatedBy) {
        this.clientId = clientId;
        this.productId = productId;
        this.productName = productName;
        this.marketplaceId = marketplaceId;
        this.marketplaceName = marketplaceName;
        this.productMarketplaceName = productMarketplaceName;
        this.updatedBy = updatedBy;
    }

    @PrePersist
    protected void onCreate() {
        createDateTime = LocalDateTime.now();
        updatedDateTime = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedDateTime = LocalDateTime.now();
    }

    // Getters and Setters
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
