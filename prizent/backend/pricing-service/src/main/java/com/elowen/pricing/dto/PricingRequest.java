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

    // ---- Rebate fields (optional) ----
    public enum RebateMode { NET, DEFERRED }

    /** % of commission that is rebated. NET = reduces commission immediately. DEFERRED = credit later. */
    private Double commissionRebatePct;

    /** Whether the rebate reduces commission now (NET) or is tracked as future receivable (DEFERRED). */
    private RebateMode rebateMode;

    // ---- Getters / Setters ----
    public Long getSkuId() { return skuId; }
    public void setSkuId(Long skuId) { this.skuId = skuId; }

    public Long getMarketplaceId() { return marketplaceId; }
    public void setMarketplaceId(Long marketplaceId) { this.marketplaceId = marketplaceId; }

    public Mode getMode() { return mode; }
    public void setMode(Mode mode) { this.mode = mode; }

    public Double getValue() { return value; }
    public void setValue(Double value) { this.value = value; }

    // Optional Input GST (flat ₹ purchase tax paid by seller); defaults to 0 if absent
    private Double inputGst;

    public Double getInputGst() { return inputGst != null ? inputGst : 0.0; }
    public void setInputGst(Double inputGst) { this.inputGst = inputGst; }

    public Double getCommissionRebatePct() { return commissionRebatePct != null ? commissionRebatePct : 0.0; }
    public void setCommissionRebatePct(Double commissionRebatePct) { this.commissionRebatePct = commissionRebatePct; }

    public RebateMode getRebateMode() { return rebateMode; }
    public void setRebateMode(RebateMode rebateMode) { this.rebateMode = rebateMode; }
}
