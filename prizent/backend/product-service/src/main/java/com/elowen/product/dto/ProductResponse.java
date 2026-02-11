package com.elowen.product.dto;

import com.elowen.product.entity.Product;
import com.elowen.product.entity.ProductType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO for product responses
 * Returns all fields except clientId (for security)
 */
public class ProductResponse {

    private Long id;
    private String name;
    private Long brandId;
    private String skuCode;
    private Long categoryId;
    private BigDecimal mrp;
    private BigDecimal productCost;
    private BigDecimal proposedSellingPriceSales;
    private BigDecimal proposedSellingPriceNonSales;
    private ProductType currentType;
    private Boolean enabled;
    private LocalDateTime createDateTime;
    private Long updatedBy;

    // Constructors
    public ProductResponse() {}

    public ProductResponse(Product product) {
        this.id = product.getId();
        this.name = product.getName();
        this.brandId = product.getBrandId();
        this.skuCode = product.getSkuCode();
        this.categoryId = product.getCategoryId();
        this.mrp = product.getMrp();
        this.productCost = product.getProductCost();
        this.proposedSellingPriceSales = product.getProposedSellingPriceSales();
        this.proposedSellingPriceNonSales = product.getProposedSellingPriceNonSales();
        this.currentType = product.getCurrentType();
        this.enabled = product.getEnabled();
        this.createDateTime = product.getCreateDateTime();
        this.updatedBy = product.getUpdatedBy();
    }

    public ProductResponse(Long id, String name, Long brandId, String skuCode, Long categoryId,
                          BigDecimal mrp, BigDecimal productCost, BigDecimal proposedSellingPriceSales,
                          BigDecimal proposedSellingPriceNonSales, ProductType currentType, 
                          Boolean enabled, LocalDateTime createDateTime, Long updatedBy) {
        this.id = id;
        this.name = name;
        this.brandId = brandId;
        this.skuCode = skuCode;
        this.categoryId = categoryId;
        this.mrp = mrp;
        this.productCost = productCost;
        this.proposedSellingPriceSales = proposedSellingPriceSales;
        this.proposedSellingPriceNonSales = proposedSellingPriceNonSales;
        this.currentType = currentType;
        this.enabled = enabled;
        this.createDateTime = createDateTime;
        this.updatedBy = updatedBy;
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

    public Long getBrandId() {
        return brandId;
    }

    public void setBrandId(Long brandId) {
        this.brandId = brandId;
    }

    public String getSkuCode() {
        return skuCode;
    }

    public void setSkuCode(String skuCode) {
        this.skuCode = skuCode;
    }

    public Long getCategoryId() {
        return categoryId;
    }

    public void setCategoryId(Long categoryId) {
        this.categoryId = categoryId;
    }

    public BigDecimal getMrp() {
        return mrp;
    }

    public void setMrp(BigDecimal mrp) {
        this.mrp = mrp;
    }

    public BigDecimal getProductCost() {
        return productCost;
    }

    public void setProductCost(BigDecimal productCost) {
        this.productCost = productCost;
    }

    public BigDecimal getProposedSellingPriceSales() {
        return proposedSellingPriceSales;
    }

    public void setProposedSellingPriceSales(BigDecimal proposedSellingPriceSales) {
        this.proposedSellingPriceSales = proposedSellingPriceSales;
    }

    public BigDecimal getProposedSellingPriceNonSales() {
        return proposedSellingPriceNonSales;
    }

    public void setProposedSellingPriceNonSales(BigDecimal proposedSellingPriceNonSales) {
        this.proposedSellingPriceNonSales = proposedSellingPriceNonSales;
    }

    public ProductType getCurrentType() {
        return currentType;
    }

    public void setCurrentType(ProductType currentType) {
        this.currentType = currentType;
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

    public Long getUpdatedBy() {
        return updatedBy;
    }

    public void setUpdatedBy(Long updatedBy) {
        this.updatedBy = updatedBy;
    }

    @Override
    public String toString() {
        return "ProductResponse{" +
                "id=" + id +
                ", name='" + name + '\'' +
                ", skuCode='" + skuCode + '\'' +
                ", currentType=" + currentType +
                ", enabled=" + enabled +
                '}';
    }
}