package com.elowen.pricing.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/**
 * Request body for POST /api/pricing/save.
 * The backend re-calculates everything — frontend values are NOT trusted.
 */
public class SavePricingRequest {

    @NotNull(message = "skuId is required")
    private Long skuId;

    @NotNull(message = "marketplaceId is required")
    private Long marketplaceId;

    @NotNull(message = "mode is required")
    private PricingRequest.Mode mode;

    @NotNull(message = "value is required")
    @Positive(message = "value must be positive")
    private Double value;

    // ── Getters / Setters ──────────────────────────────────────────────────

    public Long getSkuId() { return skuId; }
    public void setSkuId(Long skuId) { this.skuId = skuId; }

    public Long getMarketplaceId() { return marketplaceId; }
    public void setMarketplaceId(Long marketplaceId) { this.marketplaceId = marketplaceId; }

    public PricingRequest.Mode getMode() { return mode; }
    public void setMode(PricingRequest.Mode mode) { this.mode = mode; }

    public Double getValue() { return value; }
    public void setValue(Double value) { this.value = value; }

    // Optional Input GST (flat ₹ purchase tax paid by seller); defaults to 0 if absent
    private Double inputGst;

    public Double getInputGst() { return inputGst != null ? inputGst : 0.0; }
    public void setInputGst(Double inputGst) { this.inputGst = inputGst; }
}
