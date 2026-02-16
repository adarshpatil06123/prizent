package com.elowen.admin.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.elowen.admin.dto.CreateMarketplaceRequest;
import com.elowen.admin.dto.MarketplaceResponse;
import com.elowen.admin.dto.PagedResponse;
import com.elowen.admin.dto.UpdateMarketplaceRequest;
import com.elowen.admin.service.MarketplaceService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/marketplaces")
@CrossOrigin(origins = "*")
public class MarketplaceController {
    
    private final MarketplaceService marketplaceService;
    
    @Autowired
    public MarketplaceController(MarketplaceService marketplaceService) {
        this.marketplaceService = marketplaceService;
    }
    
    /**
     * Create a new marketplace
     * POST /api/admin/marketplaces
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> createMarketplace(@Valid @RequestBody CreateMarketplaceRequest request) {
        MarketplaceResponse marketplace = marketplaceService.createMarketplace(request);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Marketplace created successfully");
        response.put("marketplace", marketplace);
        
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
    
    /**
     * Get all marketplaces with pagination
     * GET /api/admin/marketplaces?page=0&size=10
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getAllMarketplaces(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        PagedResponse<MarketplaceResponse> pagedMarketplaces = marketplaceService.getMarketplaces(page, size);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("marketplaces", pagedMarketplaces);
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Get marketplace by ID
     * GET /api/admin/marketplaces/{id}
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getMarketplaceById(@PathVariable Long id) {
        MarketplaceResponse marketplace = marketplaceService.getMarketplaceById(id);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("marketplace", marketplace);
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Update marketplace
     * PUT /api/admin/marketplaces/{id}
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> updateMarketplace(
            @PathVariable Long id,
            @Valid @RequestBody UpdateMarketplaceRequest request) {
        
        MarketplaceResponse marketplace = marketplaceService.updateMarketplace(id, request);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Marketplace updated successfully");
        response.put("marketplace", marketplace);
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Enable/Disable marketplace
     * PATCH /api/admin/marketplaces/{id}/enable?enabled=true
     */
    @PatchMapping("/{id}/enable")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> enableMarketplace(
            @PathVariable Long id,
            @RequestParam boolean enabled) {
        
        marketplaceService.enableMarketplace(id, enabled);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Marketplace " + (enabled ? "enabled" : "disabled") + " successfully");
        
        return ResponseEntity.ok(response);
    }

    /**
     * Delete marketplace
     * DELETE /api/admin/marketplaces/{id}
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> deleteMarketplace(@PathVariable Long id) {
        marketplaceService.deleteMarketplace(id);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Marketplace deleted successfully");
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Get marketplace costs
     * GET /api/admin/marketplaces/{id}/costs
     */
    @GetMapping("/{id}/costs")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getMarketplaceCosts(@PathVariable Long id) {
        List<MarketplaceResponse.CostResponse> costs = marketplaceService.getMarketplaceCosts(id);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("costs", costs);
        
        return ResponseEntity.ok(response);
    }
}