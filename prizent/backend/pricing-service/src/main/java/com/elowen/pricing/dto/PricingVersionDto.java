package com.elowen.pricing.dto;

import com.elowen.pricing.entity.PricingVersion;
import com.elowen.pricing.entity.VersionStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * API response representing a saved/active PricingVersion.
 */
public class PricingVersionDto {

    private Long id;
    private Long skuId;
    private Long marketplaceId;
    private BigDecimal sellingPrice;
    private BigDecimal profitPercentage;
    private LocalDateTime effectiveFrom;
    private VersionStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /** Human-readable activation message shown in the UI. */
    private String activationMessage;

    // ── Factory ─────────────────────────────────────────────────────────────

    public static PricingVersionDto from(PricingVersion v) {
        PricingVersionDto dto = new PricingVersionDto();
        dto.id               = v.getId();
        dto.skuId            = v.getSkuId();
        dto.marketplaceId    = v.getMarketplaceId();
        dto.sellingPrice     = v.getSellingPrice();
        dto.profitPercentage = v.getProfitPercentage();
        dto.effectiveFrom    = v.getEffectiveFrom();
        dto.status           = v.getStatus();
        dto.createdAt        = v.getCreatedAt();
        dto.updatedAt        = v.getUpdatedAt();

        dto.activationMessage = switch (v.getStatus()) {
            case SCHEDULED -> "Scheduled for activation at " +
                              v.getEffectiveFrom().toLocalDate() + " 00:00";
            case ACTIVE    -> "Currently active since " + v.getEffectiveFrom();
            case EXPIRED   -> "Expired on " + v.getUpdatedAt();
        };
        return dto;
    }

    // ── Getters ─────────────────────────────────────────────────────────────

    public Long getId()                    { return id; }
    public Long getSkuId()                 { return skuId; }
    public Long getMarketplaceId()         { return marketplaceId; }
    public BigDecimal getSellingPrice()    { return sellingPrice; }
    public BigDecimal getProfitPercentage(){ return profitPercentage; }
    public LocalDateTime getEffectiveFrom(){ return effectiveFrom; }
    public VersionStatus getStatus()       { return status; }
    public LocalDateTime getCreatedAt()    { return createdAt; }
    public LocalDateTime getUpdatedAt()    { return updatedAt; }
    public String getActivationMessage()   { return activationMessage; }
}
