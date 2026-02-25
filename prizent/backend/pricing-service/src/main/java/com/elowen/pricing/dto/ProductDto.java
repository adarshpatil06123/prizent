package com.elowen.pricing.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Minimal projection of a product returned by product-service.
 * Only fields needed for pricing calculations are mapped.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class ProductDto {

    private Long id;
    private String name;
    private String skuCode;
    private Double productCost;
    private Double mrp;
    private Double proposedSellingPriceSales;
    private String currentType;  // "T", "A", "N"
    private Boolean enabled;
    private Long brandId;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getSkuCode() { return skuCode; }
    public void setSkuCode(String skuCode) { this.skuCode = skuCode; }

    public Double getProductCost() { return productCost; }
    public void setProductCost(Double productCost) { this.productCost = productCost; }

    public Double getMrp() { return mrp; }
    public void setMrp(Double mrp) { this.mrp = mrp; }

    public Double getProposedSellingPriceSales() { return proposedSellingPriceSales; }
    public void setProposedSellingPriceSales(Double v) { this.proposedSellingPriceSales = v; }

    public String getCurrentType() { return currentType; }
    public void setCurrentType(String currentType) { this.currentType = currentType; }

    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }

    public Long getBrandId() { return brandId; }
    public void setBrandId(Long brandId) { this.brandId = brandId; }
}
