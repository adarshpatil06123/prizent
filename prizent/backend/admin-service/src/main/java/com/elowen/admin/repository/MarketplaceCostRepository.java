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
    
    List<MarketplaceCost> findByClientIdAndMarketplaceIdAndEnabledTrue(Integer clientId, Long marketplaceId);
    
    List<MarketplaceCost> findByClientIdAndMarketplaceId(Integer clientId, Long marketplaceId);
    
    @Modifying
    @Query("UPDATE MarketplaceCost mc SET mc.enabled = false WHERE mc.clientId = :clientId AND mc.marketplaceId = :marketplaceId")
    void disableByClientIdAndMarketplaceId(@Param("clientId") Integer clientId, @Param("marketplaceId") Long marketplaceId);
    
    @Modifying
    @Query("DELETE FROM MarketplaceCost mc WHERE mc.marketplaceId = :marketplaceId")
    void deleteByMarketplaceId(@Param("marketplaceId") Long marketplaceId);
    
    boolean existsByClientIdAndMarketplaceId(Integer clientId, Long marketplaceId);
}