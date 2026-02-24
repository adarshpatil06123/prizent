package com.elowen.admin.dto;

import com.elowen.admin.enums.CostValueType;
import com.elowen.admin.enums.MarketplaceCostCategory;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

public class BrandMappingRequest {
    
    @Valid
    private List<BrandMapping> mappings;
    
    public BrandMappingRequest() {}
    
    public List<BrandMapping> getMappings() {
        return mappings;
    }
    
    public void setMappings(List<BrandMapping> mappings) {
        this.mappings = mappings;
    }
    
    public static class BrandMapping {
        
        @NotNull(message = "Brand ID is required")
        private Long brandId;
        
        @Valid
        private List<CostRequest> costs;
        
        public BrandMapping() {}
        
        public Long getBrandId() {
            return brandId;
        }
        
        public void setBrandId(Long brandId) {
            this.brandId = brandId;
        }
        
        public List<CostRequest> getCosts() {
            return costs;
        }
        
        public void setCosts(List<CostRequest> costs) {
            this.costs = costs;
        }
    }
    
    public static class CostRequest {
        
        @NotNull(message = "Cost category is required")
        private MarketplaceCostCategory costCategory;
        
        @NotNull(message = "Cost value type is required")
        private CostValueType costValueType;
        
        @NotNull(message = "Cost value is required")
        @DecimalMin(value = "0.0", message = "Cost value must be greater than or equal to 0")
        private BigDecimal costValue;
        
        @NotBlank(message = "Cost product range is required")
        @Size(max = 100, message = "Cost product range must not exceed 100 characters")
        private String costProductRange;
        
        public CostRequest() {}
        
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
