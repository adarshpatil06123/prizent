package com.elowen.admin.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.elowen.admin.entity.Marketplace;

@Repository
public interface MarketplaceRepository extends JpaRepository<Marketplace, Long> {
    
    List<Marketplace> findByClientIdAndEnabledTrue(Integer clientId);
    
    Page<Marketplace> findByClientIdAndEnabledTrue(Integer clientId, Pageable pageable);
    
    // Get all marketplaces (both active and inactive) with pagination
    Page<Marketplace> findByClientId(Integer clientId, Pageable pageable);
    
    Optional<Marketplace> findByIdAndClientId(Long id, Integer clientId);
    
    boolean existsByClientIdAndName(Integer clientId, String name);
    
    boolean existsByClientIdAndNameAndIdNot(Integer clientId, String name, Long id);
    
    List<Marketplace> findByClientIdOrderByCreateDateTimeDesc(Integer clientId);
}