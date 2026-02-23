package com.elowen.pricing.service;

import com.elowen.pricing.dto.*;
import com.elowen.pricing.entity.PricingVersion;
import com.elowen.pricing.entity.VersionStatus;
import com.elowen.pricing.exception.ResourceNotFoundException;
import com.elowen.pricing.repository.PricingVersionRepository;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/**
 * Manages the lifecycle of PricingVersion records:
 *  - save (schedule a new version for next midnight activation)
 *  - activate (called by the midnight scheduler)
 *  - getActive (fetch current ACTIVE version)
 *  - getHistory (all versions for a SKU + Marketplace)
 */
@Service
public class PricingVersionService {

    private static final Logger log = LoggerFactory.getLogger(PricingVersionService.class);

    private final PricingVersionRepository repo;
    private final PricingEngine engine;

    public PricingVersionService(PricingVersionRepository repo, PricingEngine engine) {
        this.repo   = repo;
        this.engine = engine;
    }

    // ── Save / Schedule ──────────────────────────────────────────────────────

    /**
     * Re-calculates pricing via PricingEngine (backend always re-derives values),
     * then saves a new SCHEDULED version effective at the next midnight.
     */
    @Transactional
    public PricingVersionDto save(SavePricingRequest request, String authToken) {
        // Build a PricingRequest to re-use the engine
        PricingRequest calcReq = new PricingRequest();
        calcReq.setSkuId(request.getSkuId());
        calcReq.setMarketplaceId(request.getMarketplaceId());
        calcReq.setMode(request.getMode());
        calcReq.setValue(request.getValue());

        // Re-calculate from scratch — never trust frontend values
        PricingResponse result = engine.calculate(calcReq, authToken);

        // Effective at start of next day (midnight)
        LocalDateTime nextMidnight = LocalDateTime.of(
                LocalDate.now().plusDays(1), LocalTime.MIDNIGHT);

        PricingVersion version = new PricingVersion();
        version.setSkuId(request.getSkuId());
        version.setMarketplaceId(request.getMarketplaceId());
        version.setSellingPrice(BigDecimal.valueOf(result.getSellingPrice()));
        version.setProfitPercentage(BigDecimal.valueOf(result.getProfitPercentage()));
        version.setEffectiveFrom(nextMidnight);
        version.setStatus(VersionStatus.SCHEDULED);

        PricingVersion saved = repo.save(version);
        log.info("Saved SCHEDULED pricing version {} for sku={} marketplace={} effectiveFrom={}",
                saved.getId(), saved.getSkuId(), saved.getMarketplaceId(), saved.getEffectiveFrom());

        return PricingVersionDto.from(saved);
    }

    // ── Activate Scheduled Versions ──────────────────────────────────────────

    /**
     * Called by PricingScheduler at midnight.
     * Activates all SCHEDULED versions whose effectiveFrom has passed.
     * Expires any existing ACTIVE version for the same (skuId, marketplaceId) first.
     */
    @Transactional
    public void activateScheduledVersions() {
        LocalDateTime now = LocalDateTime.now();
        List<PricingVersion> due = repo.findScheduledVersionsBefore(now);

        if (due.isEmpty()) {
            log.info("[Scheduler] No scheduled versions due for activation.");
            return;
        }

        for (PricingVersion scheduled : due) {
            try {
                // Expire old ACTIVE version (if any) for this pair
                int expired = repo.expireActiveVersion(
                        scheduled.getSkuId(), scheduled.getMarketplaceId(), now);
                if (expired > 0) {
                    log.info("[Scheduler] Expired {} ACTIVE version(s) for sku={} marketplace={}",
                            expired, scheduled.getSkuId(), scheduled.getMarketplaceId());
                }

                // Promote SCHEDULED → ACTIVE
                scheduled.setStatus(VersionStatus.ACTIVE);
                repo.save(scheduled);

                log.info("[Scheduler] Activated version {} for sku={} marketplace={}  SP={}",
                        scheduled.getId(), scheduled.getSkuId(),
                        scheduled.getMarketplaceId(), scheduled.getSellingPrice());

            } catch (Exception ex) {
                log.error("[Scheduler] Failed to activate version {}: {}",
                        scheduled.getId(), ex.getMessage(), ex);
            }
        }
    }

    // ── Query ────────────────────────────────────────────────────────────────

    /**
     * Returns the currently ACTIVE pricing version for a (skuId, marketplaceId) pair.
     *
     * @throws ResourceNotFoundException if no ACTIVE version exists
     */
    public PricingVersionDto getActiveVersion(Long skuId, Long marketplaceId) {
        PricingVersion active = repo.findActiveVersion(skuId, marketplaceId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Active pricing version", skuId));
        return PricingVersionDto.from(active);
    }

    /**
     * Returns all versions (newest first) for a (skuId, marketplaceId) pair.
     */
    public List<PricingVersionDto> getHistory(Long skuId, Long marketplaceId) {
        return repo.findBySkuIdAndMarketplaceIdOrderByCreatedAtDesc(skuId, marketplaceId)
                .stream()
                .map(PricingVersionDto::from)
                .toList();
    }
}
