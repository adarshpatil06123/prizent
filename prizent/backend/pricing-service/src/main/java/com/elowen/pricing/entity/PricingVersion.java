package com.elowen.pricing.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * A versioned pricing record for a (SKU, Marketplace) pair.
 *
 * At most ONE record per (skuId, marketplaceId) may have status = ACTIVE at a
 * time — enforced in code by PricingVersionService.
 */
@Entity
@Table(
    name = "pricing_versions",
    indexes = {
        @Index(name = "idx_sku_marketplace", columnList = "sku_id, marketplace_id"),
        @Index(name = "idx_status", columnList = "status"),
        @Index(name = "idx_effective_from", columnList = "effective_from")
    }
)
public class PricingVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sku_id", nullable = false)
    private Long skuId;

    @Column(name = "marketplace_id", nullable = false)
    private Long marketplaceId;

    @Column(name = "selling_price", nullable = false, precision = 19, scale = 4)
    private BigDecimal sellingPrice;

    @Column(name = "profit_percentage", nullable = false, precision = 10, scale = 4)
    private BigDecimal profitPercentage;

    /** The midnight timestamp when this version should become ACTIVE. */
    @Column(name = "effective_from", nullable = false)
    private LocalDateTime effectiveFrom;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private VersionStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // ── Lifecycle hooks ──────────────────────────────────────────────────────

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // ── Getters / Setters ────────────────────────────────────────────────────

    public Long getId() { return id; }

    public Long getSkuId() { return skuId; }
    public void setSkuId(Long skuId) { this.skuId = skuId; }

    public Long getMarketplaceId() { return marketplaceId; }
    public void setMarketplaceId(Long marketplaceId) { this.marketplaceId = marketplaceId; }

    public BigDecimal getSellingPrice() { return sellingPrice; }
    public void setSellingPrice(BigDecimal sellingPrice) { this.sellingPrice = sellingPrice; }

    public BigDecimal getProfitPercentage() { return profitPercentage; }
    public void setProfitPercentage(BigDecimal profitPercentage) { this.profitPercentage = profitPercentage; }

    public LocalDateTime getEffectiveFrom() { return effectiveFrom; }
    public void setEffectiveFrom(LocalDateTime effectiveFrom) { this.effectiveFrom = effectiveFrom; }

    public VersionStatus getStatus() { return status; }
    public void setStatus(VersionStatus status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
