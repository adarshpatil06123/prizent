package com.elowen.admin.dto;

import com.elowen.admin.entity.MarketplaceCost;
import com.elowen.admin.enums.CostValueType;
import com.elowen.admin.enums.MarketplaceCostCategory;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class BrandMappingResponse {
    
    private Long id;
    private Long brandId;
    private String brandName;
    private List<CostResponse> costs;
    
    public BrandMappingResponse() {}
    
    public BrandMappingResponse(Long brandId, String brandName, List<MarketplaceCost> brandCosts) {
        this.brandId = brandId;
        this.brandName = brandName;
        this.costs = brandCosts.stream()
                .map(CostResponse::new)
                .collect(Collectors.toList());
        // Use the brand ID as a pseudo-ID for the mapping
        this.id = brandId;
    }
    
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
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
    
    public List<CostResponse> getCosts() {
        return costs;
    }
    
    public void setCosts(List<CostResponse> costs) {
        this.costs = costs;
    }
    
    public static class CostResponse {
        
        private Long id;
        private MarketplaceCostCategory costCategory;
        private CostValueType costValueType;
        private BigDecimal costValue;
        private String costProductRange;
        
        public CostResponse() {}
        
        public CostResponse(MarketplaceCost cost) {
            this.id = cost.getId();
            this.costCategory = cost.getCostCategory();
            this.costValueType = cost.getCostValueType();
            this.costValue = cost.getCostValue();
            this.costProductRange = cost.getCostProductRange();
        }
        
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
    }
}
