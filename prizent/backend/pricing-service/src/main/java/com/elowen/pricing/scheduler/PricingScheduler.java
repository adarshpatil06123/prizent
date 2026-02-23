package com.elowen.pricing.scheduler;

import com.elowen.pricing.service.PricingVersionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Runs at every midnight (00:00:00) to activate scheduled pricing versions.
 *
 * Flow per execution:
 *  1. Find all PricingVersion records with status=SCHEDULED and effectiveFrom <= now.
 *  2. For each: expire any existing ACTIVE version for the same (skuId, marketplaceId).
 *  3. Promote the SCHEDULED version to ACTIVE.
 */
@Component
public class PricingScheduler {

    private static final Logger log = LoggerFactory.getLogger(PricingScheduler.class);

    private final PricingVersionService versionService;

    public PricingScheduler(PricingVersionService versionService) {
        this.versionService = versionService;
    }

    /**
     * Trigger: every day at 00:00:00 server time.
     * Cron: second minute hour day-of-month month day-of-week
     */
    @Scheduled(cron = "0 0 0 * * ?")
    public void activatePricingVersions() {
        log.info("[Scheduler] Midnight activation job started.");
        try {
            versionService.activateScheduledVersions();
        } catch (Exception ex) {
            log.error("[Scheduler] Activation job failed: {}", ex.getMessage(), ex);
        }
        log.info("[Scheduler] Midnight activation job finished.");
    }
}
