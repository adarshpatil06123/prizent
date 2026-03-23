package com.elowen.admin.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.elowen.admin.context.ClientContext;
import com.elowen.admin.dto.BrandMappingRequest;
import com.elowen.admin.dto.BrandMappingResponse;
import com.elowen.admin.dto.CreateMarketplaceRequest;
import com.elowen.admin.dto.MarketplaceResponse;
import com.elowen.admin.dto.PagedResponse;
import com.elowen.admin.dto.UpdateMarketplaceRequest;
import com.elowen.admin.entity.Brand;
import com.elowen.admin.entity.Marketplace;
import com.elowen.admin.entity.MarketplaceCost;
import com.elowen.admin.exception.DuplicateMarketplaceException;
import com.elowen.admin.exception.MarketplaceNotFoundException;
import com.elowen.admin.repository.BrandRepository;
import com.elowen.admin.repository.MarketplaceCostRepository;
import com.elowen.admin.repository.MarketplaceRepository;
import com.elowen.admin.security.UserPrincipal;

@Service
public class MarketplaceService {
    
    private static final Logger log = LoggerFactory.getLogger(MarketplaceService.class);
    
    private final MarketplaceRepository marketplaceRepository;
    private final MarketplaceCostRepository marketplaceCostRepository;
    private final BrandRepository brandRepository;
    
    @Autowired
    public MarketplaceService(MarketplaceRepository marketplaceRepository,
                             MarketplaceCostRepository marketplaceCostRepository,
                             BrandRepository brandRepository) {
        this.marketplaceRepository = marketplaceRepository;
        this.marketplaceCostRepository = marketplaceCostRepository;
        this.brandRepository = brandRepository;
    }
    
    @Transactional
    public MarketplaceResponse createMarketplace(CreateMarketplaceRequest request) {
        Integer clientId = getClientId();
        Long userId = getUserId();
        
        String normalizedName = request.getName().trim();
        
        if (normalizedName.isEmpty()) {
            throw new IllegalArgumentException("Marketplace name cannot be blank");
        }
        
        if (marketplaceRepository.existsByClientIdAndName(clientId, normalizedName)) {
            throw new DuplicateMarketplaceException("Marketplace with name '" + normalizedName + "' already exists");
        }
        
        Marketplace marketplace = new Marketplace(clientId, normalizedName, 
            request.getDescription() != null ? request.getDescription().trim() : null,
            request.getEnabled() != null ? request.getEnabled() : true);
        if (request.getAccNo() != null) marketplace.setAccNo(request.getAccNo().trim());
        marketplace.setUpdatedBy(userId);
        
        Marketplace savedMarketplace = marketplaceRepository.save(marketplace);
        
        if (request.getCosts() != null && !request.getCosts().isEmpty()) {
            saveCostSlabs(savedMarketplace.getId(), clientId, userId, request.getCosts());
        }
        
        log.info("Created marketplace ID {} for client {}", savedMarketplace.getId(), clientId);
        
        return getMarketplaceById(savedMarketplace.getId());
    }
    
    @Transactional
    public MarketplaceResponse updateMarketplace(Long id, UpdateMarketplaceRequest request) {
        Integer clientId = getClientId();
        Long userId = getUserId();
        
        Marketplace marketplace = marketplaceRepository.findByIdAndClientId(id, clientId)
            .orElseThrow(() -> new MarketplaceNotFoundException("Marketplace not found"));
        
        String normalizedName = request.getName().trim();
        
        if (normalizedName.isEmpty()) {
            throw new IllegalArgumentException("Marketplace name cannot be blank");
        }
        
        if (!marketplace.getName().equals(normalizedName) && 
            marketplaceRepository.existsByClientIdAndNameAndIdNot(clientId, normalizedName, id)) {
            throw new DuplicateMarketplaceException("Marketplace with name '" + normalizedName + "' already exists");
        }
        
        marketplace.setName(normalizedName);
        marketplace.setDescription(request.getDescription() != null ? request.getDescription().trim() : null);
        if (request.getAccNo() != null) {
            marketplace.setAccNo(request.getAccNo().trim());
        }
        if (request.getEnabled() != null) {
            marketplace.setEnabled(request.getEnabled());
        }
        marketplace.setUpdatedBy(userId);
        
        marketplaceRepository.save(marketplace);
        
        if (request.getCosts() != null) {
            // Update API manages marketplace-level costs only.
            // Brand-specific mappings are maintained via /brand-mappings endpoint.
            marketplaceCostRepository.disableMarketplaceLevelCosts(clientId, id);
            
            if (!request.getCosts().isEmpty()) {
                saveUpdateCostSlabs(id, clientId, userId, request.getCosts());
            }
        }
        
        log.info("Updated marketplace ID {} for client {}", id, clientId);
        
        return getMarketplaceById(id);
    }
    
    public PagedResponse<MarketplaceResponse> getMarketplaces(int page, int size) {
        Integer clientId = getClientId();
        
        Sort sort = Sort.by(Sort.Direction.DESC, "createDateTime");
        Pageable pageable = PageRequest.of(page, size, sort);
        
        // Get all marketplaces (both active and inactive)
        Page<Marketplace> marketplacePage = marketplaceRepository.findByClientId(clientId, pageable);
        
        List<MarketplaceResponse> responses = marketplacePage.getContent().stream()
                .map(this::toResponseWithCosts)
                .collect(Collectors.toList());
        
        return new PagedResponse<>(responses, page, size, marketplacePage.getTotalElements());
    }
    
    public MarketplaceResponse getMarketplaceById(Long id) {
        Integer clientId = getClientId();
        
        Marketplace marketplace = marketplaceRepository.findByIdAndClientId(id, clientId)
            .orElseThrow(() -> new MarketplaceNotFoundException("Marketplace not found"));
        
        return toResponseWithCosts(marketplace);
    }
    
    @Transactional
    public void enableMarketplace(Long id, boolean enabled) {
        Integer clientId = getClientId();
        Long userId = getUserId();
        
        Marketplace marketplace = marketplaceRepository.findByIdAndClientId(id, clientId)
            .orElseThrow(() -> new MarketplaceNotFoundException("Marketplace not found"));
        
        marketplace.setEnabled(enabled);
        marketplace.setUpdatedBy(userId);
        
        marketplaceRepository.save(marketplace);
        
        log.info("Marketplace ID {} enabled status changed to {} for client {}", id, enabled, clientId);
    }
    
    public List<MarketplaceResponse.CostResponse> getMarketplaceCosts(Long id) {
        Integer clientId = getClientId();
        
        if (!marketplaceRepository.findByIdAndClientId(id, clientId).isPresent()) {
            throw new MarketplaceNotFoundException("Marketplace not found");
        }
        
        List<MarketplaceCost> costs = marketplaceCostRepository.findByClientIdAndMarketplaceIdAndEnabledTrue(clientId, id);
        
        return costs.stream()
                .map(MarketplaceResponse.CostResponse::new)
                .collect(Collectors.toList());
    }

    /**
     * Returns effective costs for a marketplace + brand:
     * brand-specific costs merged over marketplace-level defaults.
     * Used by the pricing-service engine to resolve the correct cost structure.
     */
    public List<MarketplaceResponse.CostResponse> getEffectiveCosts(Long marketplaceId, Long brandId) {
        Integer clientId = getClientId();

        marketplaceRepository.findByIdAndClientId(marketplaceId, clientId)
            .orElseThrow(() -> new MarketplaceNotFoundException("Marketplace not found"));

        List<MarketplaceCost> marketplaceCosts = marketplaceCostRepository
            .findMarketplaceLevelCosts(clientId, marketplaceId);

        List<MarketplaceCost> brandCosts = brandId != null
            ? marketplaceCostRepository.findByClientIdAndMarketplaceIdAndBrandIdAndEnabledTrue(clientId, marketplaceId, brandId)
            : List.of();

        List<MarketplaceCost> effective = mergeEffectiveCosts(marketplaceCosts, brandCosts, marketplaceId, brandId);

        validateGtShippingSlabs(effective, marketplaceId, brandId);

        return effective.stream()
            .map(MarketplaceResponse.CostResponse::new)
            .collect(Collectors.toList());
    }

    private List<MarketplaceCost> mergeEffectiveCosts(List<MarketplaceCost> marketplaceCosts,
                                                      List<MarketplaceCost> brandCosts,
                                                      Long marketplaceId,
                                                      Long brandId) {
        LinkedHashMap<String, MarketplaceCost> merged = new LinkedHashMap<>();

        for (MarketplaceCost cost : marketplaceCosts) {
            merged.put(costMergeKey(cost), cost);
        }

        for (MarketplaceCost cost : brandCosts) {
            merged.put(costMergeKey(cost), cost);
        }

        if (!brandCosts.isEmpty()) {
            Set<String> brandKeys = brandCosts.stream().map(this::costMergeKey).collect(Collectors.toSet());
            long fallbackCount = marketplaceCosts.stream()
                .map(this::costMergeKey)
                .filter(k -> !brandKeys.contains(k))
                .count();
            if (fallbackCount > 0) {
                log.warn("Effective-costs fallback used: marketplaceId={}, brandId={}, fallbackSlabs={}", marketplaceId, brandId, fallbackCount);
            }

            List<MarketplaceCost> marketplaceGtShipping = marketplaceCosts.stream()
                .filter(this::isGtShippingCost)
                .collect(Collectors.toList());
            List<MarketplaceCost> brandGtShipping = brandCosts.stream()
                .filter(this::isGtShippingCost)
                .collect(Collectors.toList());

            if (!marketplaceGtShipping.isEmpty()) {
                if (brandGtShipping.isEmpty()) {
                    log.warn("Missing GT shipping slab for brandId={}, marketplaceId={}, using marketplace fallback", brandId, marketplaceId);
                } else {
                    Set<String> brandGtKeys = brandGtShipping.stream().map(this::costMergeKey).collect(Collectors.toSet());
                    long gtFallbackCount = marketplaceGtShipping.stream()
                        .map(this::costMergeKey)
                        .filter(k -> !brandGtKeys.contains(k))
                        .count();
                    if (gtFallbackCount > 0) {
                        log.warn("Partial GT shipping slab for brandId={}, marketplaceId={}, fallbackGtSlabs={}", brandId, marketplaceId, gtFallbackCount);
                    }
                }
            }
        }

        return new ArrayList<>(merged.values());
    }

    private String costMergeKey(MarketplaceCost cost) {
        String category = cost.getCostCategory() != null ? cost.getCostCategory().name() : "";
        String range = cost.getCostProductRange() != null ? cost.getCostProductRange().trim().toLowerCase() : "";
        String categoryId = cost.getCategoryId() != null ? String.valueOf(cost.getCategoryId()) : "*";
        return category + "|" + range + "|" + categoryId;
    }

    private boolean isGtShippingCost(MarketplaceCost cost) {
        return cost.getCostCategory() != null
            && cost.getCostCategory().name().equals("SHIPPING")
            && cost.getCostProductRange() != null
            && cost.getCostProductRange().trim().toLowerCase().startsWith("gt:");
    }

    private void validateGtShippingSlabs(List<MarketplaceCost> costs, Long marketplaceId, Long brandId) {
        for (MarketplaceCost cost : costs) {
            if (!isGtShippingCost(cost)) continue;

            String rawRange = cost.getCostProductRange().trim();
            String range = rawRange.substring(3).trim();
            int dashIdx = range.indexOf('-', 1);
            if (dashIdx < 0) {
                throw new IllegalStateException("Invalid GT shipping range '" + rawRange + "' for marketplaceId=" + marketplaceId + ", brandId=" + brandId);
            }

            try {
                double from = Double.parseDouble(range.substring(0, dashIdx).trim());
                double to = Double.parseDouble(range.substring(dashIdx + 1).trim());
                if (to <= from) {
                    throw new IllegalStateException("Invalid GT shipping range '" + rawRange + "' (to must be > from) for marketplaceId=" + marketplaceId + ", brandId=" + brandId);
                }
            } catch (NumberFormatException ex) {
                throw new IllegalStateException("Invalid GT shipping range '" + rawRange + "' for marketplaceId=" + marketplaceId + ", brandId=" + brandId, ex);
            }

            if (cost.getCostValue() == null || cost.getCostValue().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalStateException("Invalid GT shipping value for range '" + rawRange + "' (must be > 0) for marketplaceId=" + marketplaceId + ", brandId=" + brandId);
            }
        }
    }
    
    @Transactional
    public void deleteMarketplace(Long id) {
        Integer clientId = getClientId();
        
        Marketplace marketplace = marketplaceRepository.findByIdAndClientId(id, clientId)
            .orElseThrow(() -> new MarketplaceNotFoundException("Marketplace not found"));
        
        // Delete associated costs first (cascade should handle this, but let's be explicit)
        marketplaceCostRepository.deleteByMarketplaceId(id);
        
        // Delete the marketplace
        marketplaceRepository.delete(marketplace);
        
        log.info("Marketplace ID {} deleted for client {}", id, clientId);
    }
    
    private void saveCostSlabs(Long marketplaceId, Integer clientId, Long userId, 
                              List<CreateMarketplaceRequest.CostRequest> costRequests) {
        List<MarketplaceCost> costs = new ArrayList<>();
        
        for (CreateMarketplaceRequest.CostRequest costRequest : costRequests) {
            validateCostRequest(costRequest);
            
            MarketplaceCost cost = new MarketplaceCost(
                clientId, marketplaceId, costRequest.getCostCategory(),
                costRequest.getCostValueType(), costRequest.getCostValue(),
                costRequest.getCostProductRange().trim()
            );
            cost.setCategoryId(costRequest.getCategoryId());
            if (costRequest.getBrandId() != null) {
                cost.setBrandId(costRequest.getBrandId());
                brandRepository.findById(costRequest.getBrandId())
                    .ifPresent(b -> cost.setBrandName(b.getName()));
            }
            cost.setUpdatedBy(userId);
            costs.add(cost);
        }
        
        marketplaceCostRepository.saveAll(costs);
    }
    
    private void saveUpdateCostSlabs(Long marketplaceId, Integer clientId, Long userId, 
                              List<UpdateMarketplaceRequest.CostRequest> costRequests) {
        List<MarketplaceCost> costs = new ArrayList<>();
        
        for (UpdateMarketplaceRequest.CostRequest costRequest : costRequests) {
            validateUpdateCostRequest(costRequest);
            
            MarketplaceCost cost = new MarketplaceCost(
                clientId, marketplaceId, costRequest.getCostCategory(),
                costRequest.getCostValueType(), costRequest.getCostValue(),
                costRequest.getCostProductRange().trim()
            );
            cost.setCategoryId(costRequest.getCategoryId());
            if (costRequest.getBrandId() != null) {
                cost.setBrandId(costRequest.getBrandId());
                brandRepository.findById(costRequest.getBrandId())
                    .ifPresent(b -> cost.setBrandName(b.getName()));
            }
            cost.setUpdatedBy(userId);
            costs.add(cost);
        }
        
        marketplaceCostRepository.saveAll(costs);
    }
    
    private void validateCostRequest(CreateMarketplaceRequest.CostRequest costRequest) {
        if (costRequest.getCostValue().compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Cost value must be greater than or equal to 0");
        }
        
        if (costRequest.getCostCategory() == null) {
            throw new IllegalArgumentException("Cost category is required");
        }
        
        if (costRequest.getCostValueType() == null) {
            throw new IllegalArgumentException("Cost value type is required");
        }
    }
    
    private void validateUpdateCostRequest(UpdateMarketplaceRequest.CostRequest costRequest) {
        if (costRequest.getCostValue().compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Cost value must be greater than or equal to 0");
        }
        
        if (costRequest.getCostCategory() == null) {
            throw new IllegalArgumentException("Cost category is required");
        }
        
        if (costRequest.getCostValueType() == null) {
            throw new IllegalArgumentException("Cost value type is required");
        }
    }
    
    private MarketplaceResponse toResponseWithCosts(Marketplace marketplace) {
        MarketplaceResponse response = new MarketplaceResponse(marketplace);
        
        List<MarketplaceCost> costs = marketplaceCostRepository
            .findByClientIdAndMarketplaceIdAndEnabledTrue(marketplace.getClientId(), marketplace.getId());
        
        response.setCosts(costs.stream()
            .map(MarketplaceResponse.CostResponse::new)
            .collect(Collectors.toList()));
        
        return response;
    }
    
    // ==================== BRAND MAPPING METHODS ====================
    
    /**
     * Get all brand mappings for a marketplace
     */
    public List<BrandMappingResponse> getBrandMappings(Long marketplaceId) {
        Integer clientId = getClientId();
        
        // Verify marketplace exists
        marketplaceRepository.findByIdAndClientId(marketplaceId, clientId)
            .orElseThrow(() -> new MarketplaceNotFoundException("Marketplace not found"));
        
        // Get all brand-specific costs for this marketplace
        List<MarketplaceCost> brandCosts = marketplaceCostRepository
            .findBrandCostsByMarketplace(clientId, marketplaceId);
        
        // Group costs by brandId
        Map<Long, List<MarketplaceCost>> costsByBrand = brandCosts.stream()
            .collect(Collectors.groupingBy(MarketplaceCost::getBrandId));
        
        // Convert to response objects
        return costsByBrand.entrySet().stream()
            .map(entry -> {
                Long brandId = entry.getKey();
                List<MarketplaceCost> costs = entry.getValue();
                String brandName = costs.isEmpty() ? null : costs.get(0).getBrandName();
                return new BrandMappingResponse(brandId, brandName, costs);
            })
            .collect(Collectors.toList());
    }
    
    /**
     * Save brand mappings for a marketplace (replaces all existing brand mappings)
     */
    @Transactional
    public List<BrandMappingResponse> saveBrandMappings(Long marketplaceId, BrandMappingRequest request) {
        Integer clientId = getClientId();
        Long userId = getUserId();
        
        // Verify marketplace exists
        marketplaceRepository.findByIdAndClientId(marketplaceId, clientId)
            .orElseThrow(() -> new MarketplaceNotFoundException("Marketplace not found"));
        
        // Disable all existing brand-specific costs for this marketplace
        marketplaceCostRepository.disableBrandCostsByMarketplace(clientId, marketplaceId);
        
        // Save new brand mappings
        if (request.getMappings() != null && !request.getMappings().isEmpty()) {
            List<MarketplaceCost> costsToSave = new ArrayList<>();
            
            for (BrandMappingRequest.BrandMapping mapping : request.getMappings()) {
                Long brandId = mapping.getBrandId();
                
                // Get brand name for denormalization
                String brandName = brandRepository.findById(brandId)
                    .map(Brand::getName)
                    .orElse(null);
                
                if (mapping.getCosts() != null) {
                    for (BrandMappingRequest.CostRequest costReq : mapping.getCosts()) {
                        MarketplaceCost cost = new MarketplaceCost();
                        cost.setClientId(clientId);
                        cost.setMarketplaceId(marketplaceId);
                        cost.setBrandId(brandId);
                        cost.setBrandName(brandName);
                        cost.setCostCategory(costReq.getCostCategory());
                        cost.setCostValueType(costReq.getCostValueType());
                        cost.setCostValue(costReq.getCostValue());
                        cost.setCostProductRange(costReq.getCostProductRange());
                        cost.setCategoryId(costReq.getCategoryId());
                        cost.setEnabled(true);
                        cost.setUpdatedBy(userId);
                        costsToSave.add(cost);
                    }
                }
            }
            
            if (!costsToSave.isEmpty()) {
                marketplaceCostRepository.saveAll(costsToSave);
            }
        }
        
        log.info("Saved brand mappings for marketplace ID {} for client {}", marketplaceId, clientId);
        
        return getBrandMappings(marketplaceId);
    }
    
    private Integer getClientId() {
        Integer clientId = ClientContext.getClientId();
        if (clientId == null) {
            clientId = 1;
        }
        return clientId;
    }
    
    private Long getUserId() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal) {
                UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
                return Long.parseLong(userPrincipal.getUserId());
            }
        } catch (Exception e) {
            log.warn("Could not extract user ID from security context: {}", e.getMessage());
        }
        return 1L;
    }
}