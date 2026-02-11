package com.elowen.product.dto;

import com.elowen.product.entity.ProductType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * DTO for creating new products
 * Client ID is not included as it's extracted from JWT
 */
public class CreateProductRequest {

    @NotBlank(message = "Product name is required")
    @Size(max = 255, message = "Product name must not exceed 255 characters")
    private String name;

    @NotNull(message = "Brand ID is required")
    private Long brandId;

    @NotBlank(message = "SKU code is required")
    @Size(max = 100, message = "SKU code must not exceed 100 characters")
    private String skuCode;

    @NotNull(message = "Category ID is required")
    private Long categoryId;

    @DecimalMin(value = "0.0", inclusive = true, message = "MRP must be greater than or equal to 0")
    private BigDecimal mrp = BigDecimal.ZERO;

    @DecimalMin(value = "0.0", inclusive = true, message = "Product cost must be greater than or equal to 0")
    private BigDecimal productCost = BigDecimal.ZERO;

    @DecimalMin(value = "0.0", inclusive = true, message = "Proposed selling price (sales) must be greater than or equal to 0")
    private BigDecimal proposedSellingPriceSales = BigDecimal.ZERO;

    @DecimalMin(value = "0.0", inclusive = true, message = "Proposed selling price (non-sales) must be greater than or equal to 0")
    private BigDecimal proposedSellingPriceNonSales = BigDecimal.ZERO;

    @NotNull(message = "Current type is required")
    private ProductType currentType;

    // Constructors
    public CreateProductRequest() {}

    public CreateProductRequest(String name, Long brandId, String skuCode, Long categoryId,
                               BigDecimal mrp, BigDecimal productCost, BigDecimal proposedSellingPriceSales,
                               BigDecimal proposedSellingPriceNonSales, ProductType currentType) {
        this.name = name;
        this.brandId = brandId;
        this.skuCode = skuCode;
        this.categoryId = categoryId;
        this.mrp = mrp;
        this.productCost = productCost;
        this.proposedSellingPriceSales = proposedSellingPriceSales;
        this.proposedSellingPriceNonSales = proposedSellingPriceNonSales;
        this.currentType = currentType;
    }

    // Getters and Setters
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

    @Override
    public String toString() {
        return "CreateProductRequest{" +
                "name='" + name + '\'' +
                ", brandId=" + brandId +
                ", skuCode='" + skuCode + '\'' +
                ", categoryId=" + categoryId +
                ", currentType=" + currentType +
                '}';
    }
}