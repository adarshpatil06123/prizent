package com.elowen.pricing.controller;

import com.elowen.pricing.dto.*;
import com.elowen.pricing.service.PricingEngine;
import com.elowen.pricing.service.PricingVersionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pricing")
public class PricingController {

    private final PricingEngine pricingEngine;
    private final PricingVersionService versionService;

    public PricingController(PricingEngine pricingEngine,
                             PricingVersionService versionService) {
        this.pricingEngine  = pricingEngine;
        this.versionService = versionService;
    }

    // ── POST /api/pricing/calculate ──────────────────────────────────────────
    // Real-time calculation — does NOT persist anything.
    @PostMapping("/calculate")
    public ResponseEntity<PricingResponse> calculate(
            @Valid @RequestBody PricingRequest request,
            @RequestHeader(value = "Authorization", required = false) String authToken) {

        PricingResponse response = pricingEngine.calculate(request, authToken);
        return ResponseEntity.ok(response);
    }

    // ── POST /api/pricing/save ───────────────────────────────────────────────
    // Re-calculates from scratch then persists a SCHEDULED version.
    @PostMapping("/save")
    public ResponseEntity<PricingVersionDto> save(
            @Valid @RequestBody SavePricingRequest request,
            @RequestHeader(value = "Authorization", required = false) String authToken) {

        PricingVersionDto saved = versionService.save(request, authToken);
        return ResponseEntity.ok(saved);
    }

    // ── GET /api/pricing/active?skuId=&marketplaceId= ────────────────────────
    @GetMapping("/active")
    public ResponseEntity<PricingVersionDto> getActive(
            @RequestParam Long skuId,
            @RequestParam Long marketplaceId) {

        PricingVersionDto active = versionService.getActiveVersion(skuId, marketplaceId);
        return ResponseEntity.ok(active);
    }

    // ── GET /api/pricing/history?skuId=&marketplaceId= ───────────────────────
    @GetMapping("/history")
    public ResponseEntity<List<PricingVersionDto>> getHistory(
            @RequestParam Long skuId,
            @RequestParam Long marketplaceId) {

        return ResponseEntity.ok(versionService.getHistory(skuId, marketplaceId));
    }

    // ── GET /api/pricing/health ──────────────────────────────────────────────
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("pricing-service OK");
    }
}
