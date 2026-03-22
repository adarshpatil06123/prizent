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

    // Spreadsheet-style breakdown (new fields)
    private Double mrp;
    private Double sellerPrice;
    private Double gt;
    private Double desiredSellingPrice;
    private Double commissionPercentage;
    private Double commissionAmount;
    private Double fixedFee;
    private Double excessFixedFee;
    private Double pickAndPackFee;
    private Double returnShippingCost;
    private Double excessGst;
    private Double nr;
    private Double finalSettlement;
    private Double codbWithGtPercentage;
    private Double finalDiscountPercentage;

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
    private Double netSellerAsp;     // sellingPrice × 100/(100+gstRate%) — base price ex-GST
    private Double netRealisation;   // netSellerAsp - commission - shipping - marketing
    private Double profit;           // netRealisation - productCost + gstDifference
    private Double profitPercentage; // (profit / netSellerAsp) * 100

    // ── Factory ─────────────────────────────────────────────────────────────

    public static PricingResponse of(
            Long productId, String productName, String skuCode, double productCost,
            Long marketplaceId, String marketplaceName,
            double sellingPrice,
            double commission, double shipping, double marketing,
            double outputGst, double inputGst, double gstDifference,
            double netSellerAsp, double netRealisation, double profit, double profitPercentage) {

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
        r.netSellerAsp     = round(netSellerAsp);
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
    public Double getMrp()             { return mrp; }
    public Double getSellerPrice()     { return sellerPrice; }
    public Double getGt()              { return gt; }
    public Double getDesiredSellingPrice() { return desiredSellingPrice; }
    public Double getCommissionPercentage() { return commissionPercentage; }
    public Double getCommissionAmount() { return commissionAmount; }
    public Double getFixedFee()        { return fixedFee; }
    public Double getExcessFixedFee()  { return excessFixedFee; }
    public Double getPickAndPackFee()  { return pickAndPackFee; }
    public Double getReturnShippingCost() { return returnShippingCost; }
    public Double getExcessGst()       { return excessGst; }
    public Double getNr()              { return nr; }
    public Double getFinalSettlement() { return finalSettlement; }
    public Double getCodbWithGtPercentage() { return codbWithGtPercentage; }
    public Double getFinalDiscountPercentage() { return finalDiscountPercentage; }
    public Double getCommission()      { return commission; }
    public Double getShipping()        { return shipping; }
    public Double getMarketing()       { return marketing; }
    public Double getTotalCost()       { return totalCost; }
    public Double getOutputGst()       { return outputGst; }
    public Double getInputGst()        { return inputGst; }
    public Double getGstDifference()   { return gstDifference; }
    public Double getNetSellerAsp()    { return netSellerAsp; }
    public Double getNetRealisation()  { return netRealisation; }
    public Double getProfit()          { return profit; }
    public Double getProfitPercentage(){ return profitPercentage; }

    public Double getCommissionBeforeRebate() { return commissionBeforeRebate; }
    public void   setCommissionBeforeRebate(Double v) { this.commissionBeforeRebate = v; }

    public Double getPendingRebateGross() { return pendingRebateGross; }
    public void   setPendingRebateGross(Double v) { this.pendingRebateGross = v; }

    public void setMrp(Double mrp) { this.mrp = roundNullable(mrp); }
    public void setSellerPrice(Double sellerPrice) { this.sellerPrice = roundNullable(sellerPrice); }
    public void setGt(Double gt) { this.gt = roundNullable(gt); }
    public void setDesiredSellingPrice(Double desiredSellingPrice) { this.desiredSellingPrice = roundNullable(desiredSellingPrice); }
    public void setCommissionPercentage(Double commissionPercentage) { this.commissionPercentage = roundNullable(commissionPercentage); }
    public void setCommissionAmount(Double commissionAmount) { this.commissionAmount = roundNullable(commissionAmount); }
    public void setFixedFee(Double fixedFee) { this.fixedFee = roundNullable(fixedFee); }
    public void setExcessFixedFee(Double excessFixedFee) { this.excessFixedFee = roundNullable(excessFixedFee); }
    public void setPickAndPackFee(Double pickAndPackFee) { this.pickAndPackFee = roundNullable(pickAndPackFee); }
    public void setReturnShippingCost(Double returnShippingCost) { this.returnShippingCost = roundNullable(returnShippingCost); }
    public void setExcessGst(Double excessGst) { this.excessGst = roundNullable(excessGst); }
    public void setNr(Double nr) { this.nr = roundNullable(nr); }
    public void setFinalSettlement(Double finalSettlement) { this.finalSettlement = roundNullable(finalSettlement); }
    public void setCodbWithGtPercentage(Double codbWithGtPercentage) { this.codbWithGtPercentage = roundNullable(codbWithGtPercentage); }
    public void setFinalDiscountPercentage(Double finalDiscountPercentage) { this.finalDiscountPercentage = roundNullable(finalDiscountPercentage); }

    public PricingResponse withSheetBreakdown(
            Double mrp,
            Double sellerPrice,
            Double gt,
            Double desiredSellingPrice,
            Double commissionPercentage,
            Double commissionAmount,
            Double fixedFee,
            Double excessFixedFee,
            Double pickAndPackFee,
            Double returnShippingCost,
            Double excessGst,
            Double nr,
            Double finalSettlement,
            Double codbWithGtPercentage,
            Double finalDiscountPercentage) {
        setMrp(mrp);
        setSellerPrice(sellerPrice);
        setGt(gt);
        setDesiredSellingPrice(desiredSellingPrice);
        setCommissionPercentage(commissionPercentage);
        setCommissionAmount(commissionAmount);
        setFixedFee(fixedFee);
        setExcessFixedFee(excessFixedFee);
        setPickAndPackFee(pickAndPackFee);
        setReturnShippingCost(returnShippingCost);
        setExcessGst(excessGst);
        setNr(nr);
        setFinalSettlement(finalSettlement);
        setCodbWithGtPercentage(codbWithGtPercentage);
        setFinalDiscountPercentage(finalDiscountPercentage);
        return this;
    }

    private static Double roundNullable(Double v) {
        return v == null ? null : round(v);
    }
}
