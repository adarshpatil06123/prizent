package com.elowen.product.repository;

import com.elowen.product.entity.ProductMarketplaceMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for ProductMarketplaceMapping entity
 */
@Repository
public interface ProductMarketplaceMappingRepository extends JpaRepository<ProductMarketplaceMapping, Long> {

    List<ProductMarketplaceMapping> findByClientIdAndProductId(Long clientId, Long productId);

    void deleteByClientIdAndProductId(Long clientId, Long productId);
}
