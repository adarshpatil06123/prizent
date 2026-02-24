package com.elowen.admin.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.elowen.admin.entity.MarketplaceCost;

@Repository
public interface MarketplaceCostRepository extends JpaRepository<MarketplaceCost, Long> {
    
    // Marketplace-level costs (brand_id IS NULL)
    @Query("SELECT mc FROM MarketplaceCost mc WHERE mc.clientId = :clientId AND mc.marketplaceId = :marketplaceId AND mc.brandId IS NULL AND mc.enabled = true")
    List<MarketplaceCost> findMarketplaceLevelCosts(@Param("clientId") Integer clientId, @Param("marketplaceId") Long marketplaceId);
    
    // Brand-specific costs for a marketplace
    @Query("SELECT mc FROM MarketplaceCost mc WHERE mc.clientId = :clientId AND mc.marketplaceId = :marketplaceId AND mc.brandId IS NOT NULL AND mc.enabled = true")
    List<MarketplaceCost> findBrandCostsByMarketplace(@Param("clientId") Integer clientId, @Param("marketplaceId") Long marketplaceId);
    
    // Brand-specific costs for a specific brand in a marketplace
    @Query("SELECT mc FROM MarketplaceCost mc WHERE mc.clientId = :clientId AND mc.marketplaceId = :marketplaceId AND mc.brandId = :brandId AND mc.enabled = true")
    List<MarketplaceCost> findByClientIdAndMarketplaceIdAndBrandIdAndEnabledTrue(@Param("clientId") Integer clientId, @Param("marketplaceId") Long marketplaceId, @Param("brandId") Long brandId);
    
    // All costs for a marketplace (both marketplace-level and brand-specific)
    List<MarketplaceCost> findByClientIdAndMarketplaceIdAndEnabledTrue(Integer clientId, Long marketplaceId);
    
    List<MarketplaceCost> findByClientIdAndMarketplaceId(Integer clientId, Long marketplaceId);
    
    // Disable marketplace-level costs only (brand_id IS NULL)
    @Modifying
    @Query("UPDATE MarketplaceCost mc SET mc.enabled = false WHERE mc.clientId = :clientId AND mc.marketplaceId = :marketplaceId AND mc.brandId IS NULL")
    void disableMarketplaceLevelCosts(@Param("clientId") Integer clientId, @Param("marketplaceId") Long marketplaceId);
    
    // Disable brand-specific costs for a marketplace
    @Modifying
    @Query("UPDATE MarketplaceCost mc SET mc.enabled = false WHERE mc.clientId = :clientId AND mc.marketplaceId = :marketplaceId AND mc.brandId IS NOT NULL")
    void disableBrandCostsByMarketplace(@Param("clientId") Integer clientId, @Param("marketplaceId") Long marketplaceId);
    
    // Disable all costs for marketplace (both levels)
    @Modifying
    @Query("UPDATE MarketplaceCost mc SET mc.enabled = false WHERE mc.clientId = :clientId AND mc.marketplaceId = :marketplaceId")
    void disableByClientIdAndMarketplaceId(@Param("clientId") Integer clientId, @Param("marketplaceId") Long marketplaceId);
    
    @Modifying
    @Query("DELETE FROM MarketplaceCost mc WHERE mc.marketplaceId = :marketplaceId")
    void deleteByMarketplaceId(@Param("marketplaceId") Long marketplaceId);
    
    boolean existsByClientIdAndMarketplaceId(Integer clientId, Long marketplaceId);
}