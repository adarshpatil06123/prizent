package com.elowen.product.dto;



import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * DTO representing one data row parsed from an import Excel/CSV file.
 * Row numbers are 1-based (matching what the user sees in Excel).
 */
public class ImportRowDTO {

    /** 1-based row number in the upload file (for error reporting) */
    private int rowNumber;

    private String name;
    private String productNumber;
    private String styleCode;
    private String skuCode;

    /** Name-based fields (from the new name-based import template) */
    private String brandName;
    private String categoryName;
    /** Comma-separated marketplace names → resolved to IDs during import */
    private List<String> marketplaceNames = new ArrayList<>();

    /** Resolved numeric IDs – populated during name-lookup phase, not from Excel */
    private Long brandId;
    private Long categoryId;
    private BigDecimal mrp            = BigDecimal.ZERO;
    private BigDecimal productCost    = BigDecimal.ZERO;
    private BigDecimal proposedSellingPriceSales    = BigDecimal.ZERO;
    private BigDecimal proposedSellingPriceNonSales = BigDecimal.ZERO;

    private boolean enabled = true;

    /** Comma-separated marketplace IDs parsed into a list */
    private List<Long> marketplaceIds = new ArrayList<>();

    /**
     * Dynamic custom field values keyed by field NAME (as it appears in the admin-service).
     * Mapped to a Long fieldId during the import phase.
     */
    private Map<String, String> customFieldValues = new HashMap<>();

    // ── constructors ──────────────────────────────────────────────────────────

    public ImportRowDTO() {}

    public ImportRowDTO(int rowNumber) {
        this.rowNumber = rowNumber;
    }

    // ── getters / setters ────────────────────────────────────────────────────

    public int getRowNumber() { return rowNumber; }
    public void setRowNumber(int rowNumber) { this.rowNumber = rowNumber; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getProductNumber() { return productNumber; }
    public void setProductNumber(String productNumber) { this.productNumber = productNumber; }

    public String getStyleCode() { return styleCode; }
    public void setStyleCode(String styleCode) { this.styleCode = styleCode; }

    public String getSkuCode() { return skuCode; }
    public void setSkuCode(String skuCode) { this.skuCode = skuCode; }

    public String getBrandName() { return brandName; }
    public void setBrandName(String brandName) { this.brandName = brandName; }

    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }

    public List<String> getMarketplaceNames() { return marketplaceNames; }
    public void setMarketplaceNames(List<String> marketplaceNames) { this.marketplaceNames = marketplaceNames; }

    public Long getBrandId() { return brandId; }
    public void setBrandId(Long brandId) { this.brandId = brandId; }

    public Long getCategoryId() { return categoryId; }
    public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }

    public BigDecimal getMrp() { return mrp; }
    public void setMrp(BigDecimal mrp) { this.mrp = mrp; }

    public BigDecimal getProductCost() { return productCost; }
    public void setProductCost(BigDecimal productCost) { this.productCost = productCost; }

    public BigDecimal getProposedSellingPriceSales() { return proposedSellingPriceSales; }
    public void setProposedSellingPriceSales(BigDecimal v) { this.proposedSellingPriceSales = v; }

    public BigDecimal getProposedSellingPriceNonSales() { return proposedSellingPriceNonSales; }
    public void setProposedSellingPriceNonSales(BigDecimal v) { this.proposedSellingPriceNonSales = v; }



    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public List<Long> getMarketplaceIds() { return marketplaceIds; }
    public void setMarketplaceIds(List<Long> marketplaceIds) { this.marketplaceIds = marketplaceIds; }

    public Map<String, String> getCustomFieldValues() { return customFieldValues; }
    public void setCustomFieldValues(Map<String, String> customFieldValues) {
        this.customFieldValues = customFieldValues;
    }
}
