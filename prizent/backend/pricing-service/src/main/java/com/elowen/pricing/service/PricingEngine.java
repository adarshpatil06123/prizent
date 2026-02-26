package com.elowen.pricing.service;

import com.elowen.pricing.client.AdminServiceClient;
import com.elowen.pricing.client.ProductServiceClient;
import com.elowen.pricing.dto.*;
import com.elowen.pricing.exception.LifecycleException;
import com.elowen.pricing.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

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

        double commissionRebatePct = request.getCommissionRebatePct();
        PricingRequest.RebateMode rebateMode = request.getRebateMode();

        if (rebateMode == PricingRequest.RebateMode.NET && commissionRebatePct > 0) {
            // Clone costs list with COMMISSION values reduced by the rebate %
            List<MarketplaceCostDto> modifiedCosts = effectiveCosts.stream().map(c -> {
                if ("COMMISSION".equalsIgnoreCase(c.getCostCategory()) && c.getCostValue() != null) {
                    MarketplaceCostDto clone = new MarketplaceCostDto();
                    clone.setId(c.getId());
                    clone.setCostCategory(c.getCostCategory());
                    clone.setCostValueType(c.getCostValueType());
                    clone.setCostValue(c.getCostValue() * (1.0 - commissionRebatePct / 100.0));
                    clone.setCostProductRange(c.getCostProductRange());
                    return clone;
                }
                return c;
            }).collect(Collectors.toList());
            marketplace.setCosts(modifiedCosts);

            PricingResponse result = request.getMode() == PricingRequest.Mode.PROFIT_PERCENT
                    ? calculateFromProfitPercent(product, marketplace, productCost, request.getValue(), inputGst)
                    : calculateFromSellingPrice(product, marketplace, productCost, request.getValue(), inputGst);

            // commissionBeforeRebate = reduced commission / (1 - rebatePct/100)
            if (result.getCommission() != null && commissionRebatePct < 100.0) {
                result.setCommissionBeforeRebate(round2(result.getCommission() / (1.0 - commissionRebatePct / 100.0)));
            }
            return result;
        }

        PricingResponse result = request.getMode() == PricingRequest.Mode.PROFIT_PERCENT
                ? calculateFromProfitPercent(product, marketplace, productCost, request.getValue(), inputGst)
                : calculateFromSellingPrice(product, marketplace, productCost, request.getValue(), inputGst);

        if (rebateMode == PricingRequest.RebateMode.DEFERRED && commissionRebatePct > 0
                && result.getCommission() != null) {
            result.setPendingRebateGross(round2(result.getCommission() * commissionRebatePct / 100.0));
        }

        return result;
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
    //  Slab-aware: tries each distinct price range to find one whose computed SP falls within it.
    //
    private PricingResponse calculateFromProfitPercent(ProductDto product,
                                                       MarketplaceDto marketplace,
                                                       double productCost,
                                                       double desiredProfitPct,
                                                       double inputGst) {
        if (desiredProfitPct < 0)
            throw new IllegalArgumentException("Desired profit percentage must be >= 0.");

        List<MarketplaceCostDto> costs = safeCosts(marketplace);
        double targetProfitAmount = productCost * desiredProfitPct / 100.0;

        // Collect all distinct breakpoints from every non-degenerate slab range across all categories.
        // This builds composite intervals where the cost structure is constant throughout.
        // E.g. Commission "0-1000", Shipping "0-500","501-2000" → breakpoints {0,500,501,1000,2000}
        //   → composite intervals: [0,500], [501,1000], [1001,2000]
        java.util.TreeSet<Double> breakpoints = new java.util.TreeSet<>();
        for (MarketplaceCostDto c : costs) {
            double[] b = parseRangeBounds(c.getCostProductRange());
            if (b != null && b[1] > b[0]) {
                breakpoints.add(b[0]);
                breakpoints.add(b[1]);
            }
        }

        if (breakpoints.isEmpty()) {
            // No price-range slabs — use all costs as a single tier
            double totalPercentRate = costs.stream()
                    .filter(c -> "P".equalsIgnoreCase(c.getCostValueType()) && c.getCostValue() != null)
                    .mapToDouble(MarketplaceCostDto::getCostValue)
                    .sum();
            double flatCostsSum = costs.stream()
                    .filter(c -> "A".equalsIgnoreCase(c.getCostValueType()) && c.getCostValue() != null)
                    .mapToDouble(MarketplaceCostDto::getCostValue)
                    .sum();
            double denominator = 1.0 - (totalPercentRate / 100.0);
            if (denominator <= 0)
                throw new IllegalArgumentException(
                    "Combined percentage costs (" + totalPercentRate + "%) leave no room for a valid selling price.");
            double sellingPrice = (targetProfitAmount + flatCostsSum + productCost + inputGst) / denominator;
            return calculateFromSellingPrice(product, marketplace, productCost, sellingPrice, inputGst);
        }

        // Build composite intervals from consecutive breakpoints, then try each interval.
        // Within each interval the cost structure is constant, so the formula gives a valid SP.
        List<Double> pts = new java.util.ArrayList<>(breakpoints);
        double fallbackSp = 0.0;
        for (int i = 0; i < pts.size() - 1; i++) {
            double lo = pts.get(i);
            double hi = pts.get(i + 1);
            // Use the interval midpoint to determine which slab applies in each category
            double midSp = (lo + hi) / 2.0;

            double totalPercentRate = 0.0;
            double flatCostsSum     = 0.0;
            for (String cat : List.of("COMMISSION", "MARKETING", "SHIPPING")) {
                List<MarketplaceCostDto> catCosts = costs.stream()
                        .filter(c -> cat.equalsIgnoreCase(c.getCostCategory()))
                        .collect(Collectors.toList());
                if (catCosts.isEmpty()) continue;

                // Pick the slab whose range contains midSp; fall back to highest upper-bound slab
                MarketplaceCostDto applicable = catCosts.stream()
                        .filter(c -> isInRange(c.getCostProductRange(), midSp))
                        .findFirst()
                        .orElseGet(() -> catCosts.stream()
                                .max(Comparator.comparingDouble(c -> {
                                    double[] b = parseRangeBounds(c.getCostProductRange());
                                    return b != null ? b[1] : 0.0;
                                }))
                                .orElse(null));

                if (applicable != null && applicable.getCostValue() != null) {
                    if ("P".equalsIgnoreCase(applicable.getCostValueType())) {
                        totalPercentRate += applicable.getCostValue();
                    } else {
                        flatCostsSum += applicable.getCostValue();
                    }
                }
            }

            double denominator = 1.0 - (totalPercentRate / 100.0);
            if (denominator <= 0) continue;
            double sp = (targetProfitAmount + flatCostsSum + productCost + inputGst) / denominator;
            fallbackSp = sp; // keep latest valid candidate as fallback
            // Accept if the computed SP falls within this composite interval
            if (sp >= lo && sp <= hi) {
                // Self-consistency check: verify the computed SP actually falls within
                // the same slab as the midpoint for each category. If the SP has crossed
                // a slab boundary (midpoint used one slab rate but computed SP lands in a
                // different slab), recompute with the correct slab rates for the actual SP.
                double correctedPercentRate = 0.0;
                double correctedFlatCosts   = 0.0;
                for (String cat : List.of("COMMISSION", "MARKETING", "SHIPPING")) {
                    List<MarketplaceCostDto> catCosts = costs.stream()
                            .filter(c -> cat.equalsIgnoreCase(c.getCostCategory()))
                            .collect(Collectors.toList());
                    if (catCosts.isEmpty()) continue;
                    MarketplaceCostDto applicable = catCosts.stream()
                            .filter(c -> isInRange(c.getCostProductRange(), sp))
                            .findFirst()
                            .orElseGet(() -> catCosts.stream()
                                    .max(Comparator.comparingDouble(c -> {
                                        double[] b = parseRangeBounds(c.getCostProductRange());
                                        return b != null ? b[1] : 0.0;
                                    }))
                                    .orElse(null));
                    if (applicable != null && applicable.getCostValue() != null) {
                        if ("P".equalsIgnoreCase(applicable.getCostValueType())) {
                            correctedPercentRate += applicable.getCostValue();
                        } else {
                            correctedFlatCosts += applicable.getCostValue();
                        }
                    }
                }
                // If the slab rates differ, recompute SP using the correct (actual) slab rates
                if (Math.abs(correctedPercentRate - totalPercentRate) > 0.0001
                        || Math.abs(correctedFlatCosts - flatCostsSum) > 0.0001) {
                    double correctedDenom = 1.0 - (correctedPercentRate / 100.0);
                    if (correctedDenom > 0) {
                        double correctedSp = (targetProfitAmount + correctedFlatCosts + productCost + inputGst)
                                / correctedDenom;
                        // Verify the corrected SP is still self-consistent (no further slab crossing)
                        double verifyCorrectedPercentRate = 0.0;
                        for (String cat : List.of("COMMISSION", "MARKETING", "SHIPPING")) {
                            List<MarketplaceCostDto> catCosts = costs.stream()
                                    .filter(c -> cat.equalsIgnoreCase(c.getCostCategory()))
                                    .collect(Collectors.toList());
                            if (catCosts.isEmpty()) continue;
                            MarketplaceCostDto applicable = catCosts.stream()
                                    .filter(c -> isInRange(c.getCostProductRange(), correctedSp))
                                    .findFirst()
                                    .orElseGet(() -> catCosts.stream()
                                            .max(Comparator.comparingDouble(c -> {
                                                double[] b = parseRangeBounds(c.getCostProductRange());
                                                return b != null ? b[1] : 0.0;
                                            }))
                                            .orElse(null));
                            if (applicable != null && applicable.getCostValue() != null
                                    && "P".equalsIgnoreCase(applicable.getCostValueType())) {
                                verifyCorrectedPercentRate += applicable.getCostValue();
                            }
                        }
                        if (Math.abs(verifyCorrectedPercentRate - correctedPercentRate) < 0.0001) {
                            return calculateFromSellingPrice(product, marketplace, productCost, correctedSp, inputGst);
                        }
                    }
                } else {
                    return calculateFromSellingPrice(product, marketplace, productCost, sp, inputGst);
                }
            }
        }
        // Also try the last breakpoint upwards (open-ended top range)
        double lastPt = pts.get(pts.size() - 1);
        double midSp  = lastPt * 1.5; // representative point above the last boundary
        double totalPercentRate = 0.0;
        double flatCostsSum     = 0.0;
        for (String cat : List.of("COMMISSION", "MARKETING", "SHIPPING")) {
            List<MarketplaceCostDto> catCosts = costs.stream()
                    .filter(c -> cat.equalsIgnoreCase(c.getCostCategory()))
                    .collect(Collectors.toList());
            if (catCosts.isEmpty()) continue;
            MarketplaceCostDto applicable = catCosts.stream()
                    .filter(c -> isInRange(c.getCostProductRange(), midSp))
                    .findFirst()
                    .orElseGet(() -> catCosts.stream()
                            .max(Comparator.comparingDouble(c -> {
                                double[] b = parseRangeBounds(c.getCostProductRange());
                                return b != null ? b[1] : 0.0;
                            }))
                            .orElse(null));
            if (applicable != null && applicable.getCostValue() != null) {
                if ("P".equalsIgnoreCase(applicable.getCostValueType())) totalPercentRate += applicable.getCostValue();
                else flatCostsSum += applicable.getCostValue();
            }
        }
        double denom = 1.0 - (totalPercentRate / 100.0);
        if (denom > 0) {
            double sp = (targetProfitAmount + flatCostsSum + productCost + inputGst) / denom;
            // Self-consistency check for open-ended range as well
            double correctedPercentRate = 0.0;
            double correctedFlatCosts   = 0.0;
            for (String cat : List.of("COMMISSION", "MARKETING", "SHIPPING")) {
                List<MarketplaceCostDto> catCosts = costs.stream()
                        .filter(c -> cat.equalsIgnoreCase(c.getCostCategory()))
                        .collect(Collectors.toList());
                if (catCosts.isEmpty()) continue;
                MarketplaceCostDto applicable = catCosts.stream()
                        .filter(c -> isInRange(c.getCostProductRange(), sp))
                        .findFirst()
                        .orElseGet(() -> catCosts.stream()
                                .max(Comparator.comparingDouble(c -> {
                                    double[] b = parseRangeBounds(c.getCostProductRange());
                                    return b != null ? b[1] : 0.0;
                                }))
                                .orElse(null));
                if (applicable != null && applicable.getCostValue() != null) {
                    if ("P".equalsIgnoreCase(applicable.getCostValueType())) correctedPercentRate += applicable.getCostValue();
                    else correctedFlatCosts += applicable.getCostValue();
                }
            }
            double correctedDenom = 1.0 - (correctedPercentRate / 100.0);
            double finalSp = sp;
            if (Math.abs(correctedPercentRate - totalPercentRate) > 0.0001
                    || Math.abs(correctedFlatCosts - flatCostsSum) > 0.0001) {
                if (correctedDenom > 0) {
                    finalSp = (targetProfitAmount + correctedFlatCosts + productCost + inputGst) / correctedDenom;
                }
            }
            if (finalSp >= lastPt) {
                return calculateFromSellingPrice(product, marketplace, productCost, finalSp, inputGst);
            }
            fallbackSp = finalSp;
        }

        // No interval matched — use the last computed SP as fallback
        if (fallbackSp <= 0)
            throw new IllegalArgumentException(
                "Cannot determine an applicable pricing slab for the given profit percentage.");
        return calculateFromSellingPrice(product, marketplace, productCost, fallbackSp, inputGst);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /** Returns the GST slab rate: 5% if SP < ₹2064, 18% otherwise. */
    private double computeGstRate(double sellingPrice) {
        return sellingPrice < GST_THRESHOLD ? GST_RATE_LOW : GST_RATE_HIGH;
    }

    /**
     * Returns the ₹ cost amount for a given category by matching the price-range slab.
     * If "base" falls within a slab's costProductRange (e.g. "0-300"), that slab is used.
     * Falls back to the slab with the highest upper bound when no range matches.
     * P → base × rate / 100, A → fixed amount.
     */
    private double extractCost(List<MarketplaceCostDto> costs, String category, double base) {
        List<MarketplaceCostDto> catCosts = costs.stream()
                .filter(c -> category.equalsIgnoreCase(c.getCostCategory()))
                .collect(Collectors.toList());
        if (catCosts.isEmpty()) return 0.0;

        // Prefer the slab whose range contains the selling price
        java.util.Optional<MarketplaceCostDto> matched = catCosts.stream()
                .filter(c -> isInRange(c.getCostProductRange(), base))
                .findFirst();

        if (!matched.isPresent()) {
            // Fallback: pick the slab whose upper-bound is highest (handles SP above all defined ranges)
            matched = catCosts.stream()
                    .max(Comparator.comparingDouble(c -> {
                        double[] b = parseRangeBounds(c.getCostProductRange());
                        return b != null ? b[1] : (c.getId() != null ? c.getId().doubleValue() : 0.0);
                    }));
        }

        return matched.map(c -> {
            double rate = c.getCostValue() != null ? c.getCostValue() : 0;
            return "P".equalsIgnoreCase(c.getCostValueType()) ? base * rate / 100.0 : rate;
        }).orElse(0.0);
    }

    /** Returns true if {@code value} falls within the {@code range} string (e.g. "0-300"). */
    private boolean isInRange(String range, double value) {
        double[] b = parseRangeBounds(range);
        return b != null && value >= b[0] && value <= b[1];
    }

    /**
     * Parses a range string like "0-300" or "301-500" into [from, to].
     * Returns null when the string is blank or cannot be parsed.
     */
    private double[] parseRangeBounds(String range) {
        if (range == null || range.isBlank()) return null;
        // Split on the first '-' that is not the very first character (avoids negative-number ambiguity)
        int dashIdx = range.indexOf('-', 1);
        if (dashIdx < 0) return null;
        try {
            double from = Double.parseDouble(range.substring(0, dashIdx).trim());
            double to   = Double.parseDouble(range.substring(dashIdx + 1).trim());
            return new double[]{from, to};
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private List<MarketplaceCostDto> safeCosts(MarketplaceDto marketplace) {
        return marketplace.getCosts() != null ? marketplace.getCosts() : List.of();
    }

    private static double round2(double v) {
        return java.math.BigDecimal.valueOf(v).setScale(2, java.math.RoundingMode.HALF_UP).doubleValue();
    }

    private double safeDouble(Double value, String fieldName) {
        if (value == null) throw new IllegalArgumentException(fieldName + " is null.");
        if (!Double.isFinite(value)) throw new IllegalArgumentException(fieldName + " is invalid: " + value);
        return value;
    }
}
