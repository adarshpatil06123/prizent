package com.elowen.admin.dto;

import com.elowen.admin.entity.Marketplace;
import com.elowen.admin.entity.MarketplaceCost;
import com.elowen.admin.enums.CostValueType;
import com.elowen.admin.enums.MarketplaceCostCategory;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

public class MarketplaceResponse {
    
    private Long id;
    private String name;
    private String description;
    private Boolean enabled;
    private LocalDateTime createDateTime;
    private List<CostResponse> costs;
    private List<CostResponse> brandCostsSummary;
    private Boolean hasBrandMappings = false;
    
    // Constructors
    public MarketplaceResponse() {}
    
    public MarketplaceResponse(Marketplace marketplace) {
        this.id = marketplace.getId();
        this.name = marketplace.getName();
        this.description = marketplace.getDescription();
        this.enabled = marketplace.getEnabled();
        this.createDateTime = marketplace.getCreateDateTime();
        
        if (marketplace.getCosts() != null) {
            this.costs = marketplace.getCosts().stream()
                    .map(CostResponse::new)
                    .collect(Collectors.toList());
        }
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
    
    public Boolean getEnabled() {
        return enabled;
    }
    
    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }
    
    public LocalDateTime getCreateDateTime() {
        return createDateTime;
    }
    
    public void setCreateDateTime(LocalDateTime createDateTime) {
        this.createDateTime = createDateTime;
    }
    
    public List<CostResponse> getCosts() {
        return costs;
    }
    
    public void setCosts(List<CostResponse> costs) {
        this.costs = costs;
    }
    
    public Boolean getHasBrandMappings() {
        return hasBrandMappings;
    }

    public void setHasBrandMappings(Boolean hasBrandMappings) {
        this.hasBrandMappings = hasBrandMappings;
    }

    public List<CostResponse> getBrandCostsSummary() {
        return brandCostsSummary;
    }

    public void setBrandCostsSummary(List<CostResponse> brandCostsSummary) {
        this.brandCostsSummary = brandCostsSummary;
    }

    public static class CostResponse {
        
        private Long id;
        private MarketplaceCostCategory costCategory;
        private CostValueType costValueType;
        private BigDecimal costValue;
        private String costProductRange;
        private Long brandId;
        private String brandName;
        
        // Constructors
        public CostResponse() {}
        
        public CostResponse(MarketplaceCost cost) {
            this.id = cost.getId();
            this.costCategory = cost.getCostCategory();
            this.costValueType = cost.getCostValueType();
            this.costValue = cost.getCostValue();
            this.costProductRange = cost.getCostProductRange();
            this.brandId = cost.getBrandId();
            this.brandName = cost.getBrandName();
        }
        
        // Getters and Setters
        public Long getId() {
            return id;
        }
        
        public void setId(Long id) {
            this.id = id;
        }
        
        public MarketplaceCostCategory getCostCategory() {
            return costCategory;
        }
        
        public void setCostCategory(MarketplaceCostCategory costCategory) {
            this.costCategory = costCategory;
        }
        
        public CostValueType getCostValueType() {
            return costValueType;
        }
        
        public void setCostValueType(CostValueType costValueType) {
            this.costValueType = costValueType;
        }
        
        public BigDecimal getCostValue() {
            return costValue;
        }
        
        public void setCostValue(BigDecimal costValue) {
            this.costValue = costValue;
        }
        
        public String getCostProductRange() {
            return costProductRange;
        }
        
        public void setCostProductRange(String costProductRange) {
            this.costProductRange = costProductRange;
        }

        public Long getBrandId() {
            return brandId;
        }

        public void setBrandId(Long brandId) {
            this.brandId = brandId;
        }

        public String getBrandName() {
            return brandName;
        }

        public void setBrandName(String brandName) {
            this.brandName = brandName;
        }
    }
}