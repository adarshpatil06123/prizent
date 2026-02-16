package com.elowen.admin.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
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
import com.elowen.admin.dto.CreateMarketplaceRequest;
import com.elowen.admin.dto.MarketplaceResponse;
import com.elowen.admin.dto.PagedResponse;
import com.elowen.admin.dto.UpdateMarketplaceRequest;
import com.elowen.admin.entity.Marketplace;
import com.elowen.admin.entity.MarketplaceCost;
import com.elowen.admin.exception.DuplicateMarketplaceException;
import com.elowen.admin.exception.MarketplaceNotFoundException;
import com.elowen.admin.repository.MarketplaceCostRepository;
import com.elowen.admin.repository.MarketplaceRepository;
import com.elowen.admin.security.UserPrincipal;

@Service
public class MarketplaceService {
    
    private static final Logger log = LoggerFactory.getLogger(MarketplaceService.class);
    
    private final MarketplaceRepository marketplaceRepository;
    private final MarketplaceCostRepository marketplaceCostRepository;
    
    @Autowired
    public MarketplaceService(MarketplaceRepository marketplaceRepository,
                             MarketplaceCostRepository marketplaceCostRepository) {
        this.marketplaceRepository = marketplaceRepository;
        this.marketplaceCostRepository = marketplaceCostRepository;
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
        if (request.getEnabled() != null) {
            marketplace.setEnabled(request.getEnabled());
        }
        marketplace.setUpdatedBy(userId);
        
        marketplaceRepository.save(marketplace);
        
        if (request.getCosts() != null) {
            marketplaceCostRepository.disableByClientIdAndMarketplaceId(clientId, id);
            
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