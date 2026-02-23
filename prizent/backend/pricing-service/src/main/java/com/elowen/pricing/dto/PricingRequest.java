package com.elowen.pricing.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/**
 * Incoming request from the frontend for a pricing calculation.
 */
public class PricingRequest {

    public enum Mode {
        SELLING_PRICE,
        PROFIT_PERCENT
    }

    @NotNull(message = "skuId is required")
    private Long skuId;

    @NotNull(message = "marketplaceId is required")
    private Long marketplaceId;

    @NotNull(message = "mode is required")
    private Mode mode;           // SELLING_PRICE or PROFIT_PERCENT

    @NotNull(message = "value is required")
    @Positive(message = "value must be positive")
    private Double value;        // the selling price OR desired profit %

    // ---- Getters / Setters ----
    public Long getSkuId() { return skuId; }
    public void setSkuId(Long skuId) { this.skuId = skuId; }

    public Long getMarketplaceId() { return marketplaceId; }
    public void setMarketplaceId(Long marketplaceId) { this.marketplaceId = marketplaceId; }

    public Mode getMode() { return mode; }
    public void setMode(Mode mode) { this.mode = mode; }

    public Double getValue() { return value; }
    public void setValue(Double value) { this.value = value; }
}
