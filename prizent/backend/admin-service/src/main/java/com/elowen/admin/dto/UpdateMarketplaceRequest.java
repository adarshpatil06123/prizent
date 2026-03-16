package com.elowen.admin.dto;

import com.elowen.admin.enums.CostValueType;
import com.elowen.admin.enums.MarketplaceCostCategory;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.DecimalMin;

import java.math.BigDecimal;
import java.util.List;

public class UpdateMarketplaceRequest {
    
    @NotBlank(message = "Marketplace name is required")
    @Size(max = 255, message = "Marketplace name must not exceed 255 characters")
    private String name;
    
    @Size(max = 500, message = "Description must not exceed 500 characters")
    private String description;

    @Size(max = 100, message = "Account number must not exceed 100 characters")
    private String accNo;
    
    private Boolean enabled;
    
    @Valid
    private List<CostRequest> costs;
    
    // Constructors
    public UpdateMarketplaceRequest() {}
    
    // Getters and Setters
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

    public String getAccNo() {
        return accNo;
    }

    public void setAccNo(String accNo) {
        this.accNo = accNo;
    }
    
    public Boolean getEnabled() {
        return enabled;
    }
    
    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }
    
    public List<CostRequest> getCosts() {
        return costs;
    }
    
    public void setCosts(List<CostRequest> costs) {
        this.costs = costs;
    }
    
    public static class CostRequest {
        
        private Long id; // For updates
        
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

        private Long categoryId;

        private Long brandId;
        
        // Constructors
        public CostRequest() {}
        
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

        public Long getCategoryId() {
            return categoryId;
        }

        public void setCategoryId(Long categoryId) {
            this.categoryId = categoryId;
        }

        public Long getBrandId() {
            return brandId;
        }

        public void setBrandId(Long brandId) {
            this.brandId = brandId;
        }
    }
}