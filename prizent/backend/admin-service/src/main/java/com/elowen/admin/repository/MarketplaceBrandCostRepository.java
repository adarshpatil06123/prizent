package com.elowen.admin.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.elowen.admin.entity.MarketplaceBrandCost;

@Repository
public interface MarketplaceBrandCostRepository extends JpaRepository<MarketplaceBrandCost, Long> {
    
    List<MarketplaceBrandCost> findByClientIdAndMarketplaceIdAndEnabledTrue(Integer clientId, Long marketplaceId);
    
    List<MarketplaceBrandCost> findByClientIdAndMarketplaceIdAndBrandIdAndEnabledTrue(Integer clientId, Long marketplaceId, Long brandId);
    
    List<MarketplaceBrandCost> findByClientIdAndMarketplaceId(Integer clientId, Long marketplaceId);
    
    @Modifying
    @Query("UPDATE MarketplaceBrandCost mbc SET mbc.enabled = false WHERE mbc.clientId = :clientId AND mbc.marketplaceId = :marketplaceId")
    void disableByClientIdAndMarketplaceId(@Param("clientId") Integer clientId, @Param("marketplaceId") Long marketplaceId);
    
    @Modifying
    @Query("UPDATE MarketplaceBrandCost mbc SET mbc.enabled = false WHERE mbc.clientId = :clientId AND mbc.marketplaceId = :marketplaceId AND mbc.brandId = :brandId")
    void disableByClientIdAndMarketplaceIdAndBrandId(@Param("clientId") Integer clientId, @Param("marketplaceId") Long marketplaceId, @Param("brandId") Long brandId);
    
    @Modifying
    @Query("DELETE FROM MarketplaceBrandCost mbc WHERE mbc.marketplaceId = :marketplaceId")
    void deleteByMarketplaceId(@Param("marketplaceId") Long marketplaceId);
    
    boolean existsByClientIdAndMarketplaceId(Integer clientId, Long marketplaceId);
}
