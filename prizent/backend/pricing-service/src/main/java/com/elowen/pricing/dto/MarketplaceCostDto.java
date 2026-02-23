package com.elowen.pricing.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * A single cost entry from admin-service marketplace costs.
 * costCategory: COMMISSION | SHIPPING | MARKETING
 * costValueType: P (percentage) | A (absolute amount)
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class MarketplaceCostDto {

    private Long id;
    private String costCategory;   // COMMISSION, SHIPPING, MARKETING
    private String costValueType;  // P, A
    private Double costValue;
    private String costProductRange;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCostCategory() { return costCategory; }
    public void setCostCategory(String costCategory) { this.costCategory = costCategory; }

    public String getCostValueType() { return costValueType; }
    public void setCostValueType(String costValueType) { this.costValueType = costValueType; }

    public Double getCostValue() { return costValue; }
    public void setCostValue(Double costValue) { this.costValue = costValue; }

    public String getCostProductRange() { return costProductRange; }
    public void setCostProductRange(String costProductRange) { this.costProductRange = costProductRange; }
}
