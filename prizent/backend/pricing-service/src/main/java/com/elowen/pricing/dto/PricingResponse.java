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
    private Double commission;
    private Double shipping;
    private Double marketing;
    private Double totalCost;        // productCost + commission + shipping + marketing
    private Double netRealisation;   // sellingPrice - commission - shipping - marketing
    private Double profit;           // netRealisation - productCost
    private Double profitPercentage; // (profit / productCost) * 100

    // ── Factory ─────────────────────────────────────────────────────────────

    public static PricingResponse of(
            Long productId, String productName, String skuCode, double productCost,
            Long marketplaceId, String marketplaceName,
            double sellingPrice,
            double commission, double shipping, double marketing,
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
    public Double getNetRealisation()  { return netRealisation; }
    public Double getProfit()          { return profit; }
    public Double getProfitPercentage(){ return profitPercentage; }
}
