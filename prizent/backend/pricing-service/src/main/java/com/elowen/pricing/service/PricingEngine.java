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
        validateMarketplaceCosts(marketplace);

        return request.getMode() == PricingRequest.Mode.PROFIT_PERCENT
                ? calculateFromProfitPercent(product, marketplace, productCost, request.getValue())
                : calculateFromSellingPrice(product, marketplace, productCost, request.getValue());
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
                                                      double sellingPrice) {
        if (sellingPrice < 0)
            throw new IllegalArgumentException("Selling price must be >= 0.");

        List<MarketplaceCostDto> costs = safeCosts(marketplace);
        double commission    = extractCost(costs, "COMMISSION", sellingPrice);
        double shipping      = extractCost(costs, "SHIPPING",   sellingPrice);
        double marketing     = extractCost(costs, "MARKETING",  sellingPrice);
        double netRealisation = sellingPrice - commission - shipping - marketing;
        double profit         = netRealisation - productCost;
        double profitPct      = productCost > 0 ? (profit / productCost) * 100 : 0;

        return PricingResponse.of(
                product.getId(), product.getName(), product.getSkuCode(), productCost,
                marketplace.getId(), marketplace.getName(),
                sellingPrice, commission, shipping, marketing,
                netRealisation, profit, profitPct
        );
    }

    // ── Mode: PROFIT_PERCENT ─────────────────────────────────────────────────
    //
    //  Derivation:
    //    Net = SP - Σ(pct_costs × SP / 100) - Σ(fixed_costs)
    //    Net = SP × (1 - Σpct/100) - Σfixed
    //
    //  Target Net = productCost × (1 + desiredProfit / 100)
    //
    //  SP × (1 - Σpct/100) = TargetNet + Σfixed
    //  SP = (TargetNet + Σfixed) / (1 - Σpct/100)
    //
    private PricingResponse calculateFromProfitPercent(ProductDto product,
                                                       MarketplaceDto marketplace,
                                                       double productCost,
                                                       double desiredProfitPct) {
        if (desiredProfitPct < 0)
            throw new IllegalArgumentException("Desired profit percentage must be >= 0.");

        List<MarketplaceCostDto> costs = safeCosts(marketplace);

        double sumPctRates = costs.stream()
                .filter(c -> "P".equalsIgnoreCase(c.getCostValueType()) && c.getCostValue() != null)
                .mapToDouble(MarketplaceCostDto::getCostValue)
                .sum();

        double sumFixed = costs.stream()
                .filter(c -> "A".equalsIgnoreCase(c.getCostValueType()) && c.getCostValue() != null)
                .mapToDouble(MarketplaceCostDto::getCostValue)
                .sum();

        double divisor = 1.0 - (sumPctRates / 100.0);
        if (divisor <= 0 || Math.abs(divisor) < 1e-6)
            throw new IllegalArgumentException(
                "Combined percentage costs (" + sumPctRates +
                "%) sum to 100% or more. Cannot derive a valid selling price.");

        double targetNet   = productCost * (1.0 + desiredProfitPct / 100.0);
        double sellingPrice = (targetNet + sumFixed) / divisor;

        return calculateFromSellingPrice(product, marketplace, productCost, sellingPrice);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /** Returns ₹ amount for a cost category. P→ base×rate/100, A→ fixed. */
    private double extractCost(List<MarketplaceCostDto> costs, String category, double base) {
        return costs.stream()
                .filter(c -> category.equalsIgnoreCase(c.getCostCategory()))
                .mapToDouble(c -> {
                    double rate = c.getCostValue() != null ? c.getCostValue() : 0;
                    return "P".equalsIgnoreCase(c.getCostValueType())
                            ? base * rate / 100.0
                            : rate;
                })
                .sum();
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
