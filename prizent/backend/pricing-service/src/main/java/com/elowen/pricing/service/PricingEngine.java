package com.elowen.pricing.service;

import com.elowen.pricing.client.AdminServiceClient;
import com.elowen.pricing.client.ProductServiceClient;
import com.elowen.pricing.dto.*;
import com.elowen.pricing.exception.LifecycleException;
import com.elowen.pricing.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;

/**
 * Core stateless pricing engine.
 *
 * Responsibilities:
 *  1. Resolve product and marketplace from downstream services.
 *  2. Validate lifecycle (product enabled, marketplace enabled).
 *  3. Validate all input values (non-negative, finite, rates ≤ 100%, valid types).
 *  4. Dispatch to SELLING_PRICE or PROFIT_PERCENT calculation path.
 *  5. Apply the algebraically correct formula for each mode.
 *
 * This class must NOT trust any pre-computed frontend values.
 */
@Service
public class PricingEngine {

    private static final Set<String> VALID_COST_TYPES = Set.of("P", "A");
    private static final Set<String> VALID_CATEGORIES =
            Set.of("COMMISSION", "SHIPPING", "MARKETING");

    // GST slab: 5% when SP < ₹2064, 18% when SP >= ₹2064
    private static final double GST_THRESHOLD = 2064.0;
    private static final double GST_RATE_LOW  = 0.05;
    private static final double GST_RATE_HIGH = 0.18;

    private final ProductServiceClient productClient;
    private final AdminServiceClient adminClient;

    public PricingEngine(ProductServiceClient productClient,
                         AdminServiceClient adminClient) {
        this.productClient = productClient;
        this.adminClient = adminClient;
    }

    // ── Public API ───────────────────────────────────────────────────────────

    /**
     * Calculate pricing and return a full breakdown.
     * Re-derives everything — does NOT trust frontend values.
     *
     * @throws ResourceNotFoundException  if product or marketplace not found
     * @throws LifecycleException         if product or marketplace is inactive
     * @throws IllegalArgumentException   if calculation inputs are invalid
     */
    public PricingResponse calculate(PricingRequest request, String authToken) {
        ProductDto     product     = resolveAndValidateProduct(request.getSkuId(), authToken);
        MarketplaceDto marketplace = resolveAndValidateMarketplace(request.getMarketplaceId(), authToken);

        double productCost = safeDouble(product.getProductCost(), "productCost");

        // Resolve effective costs: brand-specific if configured, else marketplace-level defaults
        List<MarketplaceCostDto> effectiveCosts = adminClient.getEffectiveMarketplaceCosts(
                marketplace.getId(), product.getBrandId(), authToken);
        marketplace.setCosts(effectiveCosts);

        validateMarketplaceCosts(marketplace);

        double inputGst = request.getInputGst();
        if (inputGst < 0)
            throw new IllegalArgumentException("inputGst must be >= 0.");

        return request.getMode() == PricingRequest.Mode.PROFIT_PERCENT
                ? calculateFromProfitPercent(product, marketplace, productCost, request.getValue(), inputGst)
                : calculateFromSellingPrice(product, marketplace, productCost, request.getValue(), inputGst);
    }

    // ── Lifecycle resolution & validation ────────────────────────────────────

    private ProductDto resolveAndValidateProduct(Long skuId, String authToken) {
        ProductDto product = productClient.getProductById(skuId, authToken);
        if (product == null) throw new ResourceNotFoundException("Product", skuId);
        if (Boolean.FALSE.equals(product.getEnabled()))
            throw new LifecycleException("Product " + skuId + " is not active and cannot be priced.");
        return product;
    }

    private MarketplaceDto resolveAndValidateMarketplace(Long marketplaceId, String authToken) {
        MarketplaceDto marketplace = adminClient.getMarketplaceById(marketplaceId, authToken);
        if (marketplace == null) throw new ResourceNotFoundException("Marketplace", marketplaceId);
        if (Boolean.FALSE.equals(marketplace.getEnabled()))
            throw new LifecycleException("Marketplace " + marketplaceId + " is inactive.");
        return marketplace;
    }

    // ── Marketplace cost structure validation ────────────────────────────────

    private void validateMarketplaceCosts(MarketplaceDto marketplace) {
        for (MarketplaceCostDto cost : safeCosts(marketplace)) {
            String cat  = cost.getCostCategory();
            String type = cost.getCostValueType();
            Double val  = cost.getCostValue();

            if (cat == null || !VALID_CATEGORIES.contains(cat.toUpperCase()))
                throw new IllegalArgumentException(
                    "Unknown cost category '" + cat + "'. Expected: COMMISSION | SHIPPING | MARKETING");

            if (type == null || !VALID_COST_TYPES.contains(type.toUpperCase()))
                throw new IllegalArgumentException(
                    "Invalid costValueType '" + type + "' for " + cat + ". Expected: P | A");

            if (val == null || val < 0)
                throw new IllegalArgumentException("Cost value for " + cat + " must be non-negative.");
        }
    }

    // ── Mode: SELLING_PRICE ──────────────────────────────────────────────────

    private PricingResponse calculateFromSellingPrice(ProductDto product,
                                                      MarketplaceDto marketplace,
                                                      double productCost,
                                                      double sellingPrice,
                                                      double inputGst) {
        if (sellingPrice < 0)
            throw new IllegalArgumentException("Selling price must be >= 0.");

        List<MarketplaceCostDto> costs = safeCosts(marketplace);
        double commission    = extractCost(costs, "COMMISSION", sellingPrice);
        double shipping      = extractCost(costs, "SHIPPING",   sellingPrice);
        double marketing     = extractCost(costs, "MARKETING",  sellingPrice);

        // GST accounting
        double outputGst     = sellingPrice * computeGstRate(sellingPrice);
        double gstDifference = outputGst - inputGst;  // positive = GST payable, negative = credit

        // Net realisation: SP minus all marketplace deductions and output GST
        double netRealisation = sellingPrice - commission - shipping - marketing - outputGst;

        // Profit: net realisation minus cost, then adjust by GST difference
        double profit    = netRealisation - productCost + gstDifference;
        double profitPct = productCost > 0 ? (profit / productCost) * 100 : 0;

        return PricingResponse.of(
                product.getId(), product.getName(), product.getSkuCode(), productCost,
                marketplace.getId(), marketplace.getName(),
                sellingPrice, commission, shipping, marketing,
                outputGst, inputGst, gstDifference,
                netRealisation, profit, profitPct
        );
    }

    // ── Mode: PROFIT_PERCENT ─────────────────────────────────────────────────
    //
    //  Derivation (with GST):
    //    outputGst        = SP × gstRate
    //    gstDifference    = outputGst - inputGst
    //    netRealisation   = SP - Σ%costs×SP - Σfixed - outputGst
    //    profit           = netRealisation - cost + gstDifference
    //                     = SP(1 - Σ%/100 - gstRate) - Σfixed - cost + inputGst + target
    //    → SP = (targetProfit + Σfixed + cost - inputGst) / (1 - Σ%/100 - gstRate)
    //
    //  Two-pass slab solve handles the circular dependency between SP and gstRate.
    //
    private PricingResponse calculateFromProfitPercent(ProductDto product,
                                                       MarketplaceDto marketplace,
                                                       double productCost,
                                                       double desiredProfitPct,
                                                       double inputGst) {
        if (desiredProfitPct < 0)
            throw new IllegalArgumentException("Desired profit percentage must be >= 0.");

        List<MarketplaceCostDto> costs = safeCosts(marketplace);

        // Separate percentage-based and absolute costs — never assume all-percent
        double totalPercentRate = costs.stream()
                .filter(c -> "P".equalsIgnoreCase(c.getCostValueType()) && c.getCostValue() != null)
                .mapToDouble(MarketplaceCostDto::getCostValue)
                .sum();

        double flatCosts = costs.stream()
                .filter(c -> "A".equalsIgnoreCase(c.getCostValueType()) && c.getCostValue() != null)
                .mapToDouble(MarketplaceCostDto::getCostValue)
                .sum();

        double targetProfitAmount = productCost * desiredProfitPct / 100.0;
        double numerator          = targetProfitAmount + flatCosts + productCost - inputGst;

        // Pass 1: estimate SP ignoring GST to determine the correct slab
        double estimatedSP = numerator / (1.0 - totalPercentRate / 100.0);
        double gstRate     = computeGstRate(estimatedSP);

        // Pass 2: solve with the slab rate included in the denominator
        double denominator = 1.0 - (totalPercentRate / 100.0) - gstRate;
        if (denominator <= 0)
            throw new IllegalArgumentException(
                "Combined percentage costs (" + totalPercentRate +
                "%) plus GST rate (" + (gstRate * 100) + "%) leave no room for a valid selling price.");

        double sellingPrice = numerator / denominator;

        // Slab boundary correction: re-solve if SP crossed the ₹2064 threshold
        double actualRate = computeGstRate(sellingPrice);
        if (Double.compare(actualRate, gstRate) != 0) {
            denominator = 1.0 - (totalPercentRate / 100.0) - actualRate;
            if (denominator <= 0)
                throw new IllegalArgumentException(
                    "Combined percentage costs (" + totalPercentRate +
                    "%) plus GST rate (" + (actualRate * 100) + "%) leave no room for a valid selling price.");
            sellingPrice = numerator / denominator;
        }

        return calculateFromSellingPrice(product, marketplace, productCost, sellingPrice, inputGst);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /** Returns the GST slab rate: 5% if SP < ₹2064, 18% otherwise. */
    private double computeGstRate(double sellingPrice) {
        return sellingPrice < GST_THRESHOLD ? GST_RATE_LOW : GST_RATE_HIGH;
    }

    /** Returns ₹ amount for a cost category.
     *  When multiple rows exist for the same category, uses the latest one (highest id).
     *  P→ base×rate/100, A→ fixed. */
    private double extractCost(List<MarketplaceCostDto> costs, String category, double base) {
        return costs.stream()
                .filter(c -> category.equalsIgnoreCase(c.getCostCategory()))
                .max(java.util.Comparator.comparingLong(c -> c.getId() != null ? c.getId() : 0L))
                .map(c -> {
                    double rate = c.getCostValue() != null ? c.getCostValue() : 0;
                    return "P".equalsIgnoreCase(c.getCostValueType())
                            ? base * rate / 100.0
                            : rate;
                })
                .orElse(0.0);
    }

    private List<MarketplaceCostDto> safeCosts(MarketplaceDto marketplace) {
        return marketplace.getCosts() != null ? marketplace.getCosts() : List.of();
    }

    private double safeDouble(Double value, String fieldName) {
        if (value == null) throw new IllegalArgumentException(fieldName + " is null.");
        if (!Double.isFinite(value)) throw new IllegalArgumentException(fieldName + " is invalid: " + value);
        return value;
    }
}
