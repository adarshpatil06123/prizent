package com.elowen.pricing.entity;

/**
 * Lifecycle status of a PricingVersion.
 *
 * SCHEDULED → created, waiting for midnight activation
 * ACTIVE    → currently the live price for (skuId, marketplaceId)
 * EXPIRED   → superseded by a newer version
 */
public enum VersionStatus {
    SCHEDULED,
    ACTIVE,
    EXPIRED
}
