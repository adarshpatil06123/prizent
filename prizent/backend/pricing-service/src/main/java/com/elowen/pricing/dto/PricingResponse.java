package com.elowen.pricing.dto;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Full pricing breakdown returned to the frontend.
 * All monetary values are in ₹ (INR), rounded to 2 decimal places.
 */
public class PricingResponse {

    // Product info
    private Long   productId;
    private String productName;
    private String skuCode;
    private Double productCost;

    // Marketplace info
    private Long   marketplaceId;
    private String marketplaceName;

    // Pricing breakdown
    private Double sellingPrice;

    // Rebate fields (populated only when a rebate is requested)
    /** NET mode: original commission ₹ before rebate reduction */
    private Double commissionBeforeRebate;
    /** DEFERRED mode: gross commission amount that will be credited back later */
    private Double pendingRebateGross;
    private Double commission;
    private Double shipping;
    private Double marketing;
    private Double totalCost;        // productCost + commission + shipping + marketing
    private Double outputGst;        // sellingPrice × GST slab rate
    private Double inputGst;         // flat ₹ purchase GST paid by seller
    private Double gstDifference;    // outputGst - inputGst (positive = GST payable, negative = credit)
    private Double netRealisation;   // sellingPrice - commission - shipping - marketing - outputGst
    private Double profit;           // netRealisation - productCost + gstDifference
    private Double profitPercentage; // (profit / productCost) * 100

    // ── Factory ─────────────────────────────────────────────────────────────

    public static PricingResponse of(
            Long productId, String productName, String skuCode, double productCost,
            Long marketplaceId, String marketplaceName,
            double sellingPrice,
            double commission, double shipping, double marketing,
            double outputGst, double inputGst, double gstDifference,
            double netRealisation, double profit, double profitPercentage) {

        PricingResponse r  = new PricingResponse();
        r.productId        = productId;
        r.productName      = productName;
        r.skuCode          = skuCode;
        r.productCost      = round(productCost);
        r.marketplaceId    = marketplaceId;
        r.marketplaceName  = marketplaceName;
        r.sellingPrice     = round(sellingPrice);
        r.commission       = round(commission);
        r.shipping         = round(shipping);
        r.marketing        = round(marketing);
        r.totalCost        = round(productCost + commission + shipping + marketing);
        r.outputGst        = round(outputGst);
        r.inputGst         = round(inputGst);
        r.gstDifference    = round(gstDifference);
        r.netRealisation   = round(netRealisation);
        r.profit           = round(profit);
        r.profitPercentage = round(profitPercentage);
        return r;
    }

    private static double round(double v) {
        return BigDecimal.valueOf(v).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    // ── Getters ─────────────────────────────────────────────────────────────

    public Long   getProductId()       { return productId; }
    public String getProductName()     { return productName; }
    public String getSkuCode()         { return skuCode; }
    public Double getProductCost()     { return productCost; }
    public Long   getMarketplaceId()   { return marketplaceId; }
    public String getMarketplaceName() { return marketplaceName; }
    public Double getSellingPrice()    { return sellingPrice; }
    public Double getCommission()      { return commission; }
    public Double getShipping()        { return shipping; }
    public Double getMarketing()       { return marketing; }
    public Double getTotalCost()       { return totalCost; }
    public Double getOutputGst()       { return outputGst; }
    public Double getInputGst()        { return inputGst; }
    public Double getGstDifference()   { return gstDifference; }
    public Double getNetRealisation()  { return netRealisation; }
    public Double getProfit()          { return profit; }
    public Double getProfitPercentage(){ return profitPercentage; }

    public Double getCommissionBeforeRebate() { return commissionBeforeRebate; }
    public void   setCommissionBeforeRebate(Double v) { this.commissionBeforeRebate = v; }

    public Double getPendingRebateGross() { return pendingRebateGross; }
    public void   setPendingRebateGross(Double v) { this.pendingRebateGross = v; }
}
