package com.elowen.pricing.repository;

import com.elowen.pricing.entity.PricingVersion;
import com.elowen.pricing.entity.VersionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PricingVersionRepository extends JpaRepository<PricingVersion, Long> {

    /** Find the currently ACTIVE price version for a SKU + Marketplace pair. */
    @Query("SELECT v FROM PricingVersion v WHERE v.skuId = :skuId AND v.marketplaceId = :marketplaceId AND v.status = 'ACTIVE'")
    Optional<PricingVersion> findActiveVersion(
            @Param("skuId") Long skuId,
            @Param("marketplaceId") Long marketplaceId);

    /** Find all SCHEDULED versions whose effectiveFrom is at or before the given time. */
    @Query("SELECT v FROM PricingVersion v WHERE v.status = 'SCHEDULED' AND v.effectiveFrom <= :now")
    List<PricingVersion> findScheduledVersionsBefore(@Param("now") LocalDateTime now);

    /** Expire any ACTIVE version for the given SKU + Marketplace. */
    @Modifying
    @Query("UPDATE PricingVersion v SET v.status = 'EXPIRED', v.updatedAt = :now " +
           "WHERE v.skuId = :skuId AND v.marketplaceId = :marketplaceId AND v.status = 'ACTIVE'")
    int expireActiveVersion(
            @Param("skuId") Long skuId,
            @Param("marketplaceId") Long marketplaceId,
            @Param("now") LocalDateTime now);

    /** Find all versions for a SKU + Marketplace pair, newest first. */
    List<PricingVersion> findBySkuIdAndMarketplaceIdOrderByCreatedAtDesc(
            Long skuId, Long marketplaceId);
}
