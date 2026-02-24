package com.elowen.admin.entity;

import com.elowen.admin.enums.CostValueType;
import com.elowen.admin.enums.MarketplaceCostCategory;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "p_marketplace_brand_costs")
public class MarketplaceBrandCost {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "client_id", nullable = false)
    private Integer clientId;
    
    @Column(name = "marketplace_id", nullable = false)
    private Long marketplaceId;
    
    @Column(name = "brand_id", nullable = false)
    private Long brandId;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "marketplace_id", insertable = false, updatable = false)
    private Marketplace marketplace;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "brand_id", insertable = false, updatable = false)
    private Brand brand;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "cost_category", nullable = false, length = 20)
    private MarketplaceCostCategory costCategory;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "cost_value_type", nullable = false, length = 1)
    private CostValueType costValueType;
    
    @Column(name = "cost_value", nullable = false, precision = 12, scale = 2)
    private BigDecimal costValue;
    
    @Column(name = "cost_product_range", nullable = false, length = 100)
    private String costProductRange;
    
    @Column(nullable = false)
    private Boolean enabled = true;
    
    @Column(name = "create_date_time", nullable = false, updatable = false)
    private LocalDateTime createDateTime;
    
    @Column(name = "updated_by")
    private Long updatedBy;
    
    // Constructors
    public MarketplaceBrandCost() {}
    
    public MarketplaceBrandCost(Integer clientId, Long marketplaceId, Long brandId, 
                                MarketplaceCostCategory costCategory, CostValueType costValueType, 
                                BigDecimal costValue, String costProductRange) {
        this.clientId = clientId;
        this.marketplaceId = marketplaceId;
        this.brandId = brandId;
        this.costCategory = costCategory;
        this.costValueType = costValueType;
        this.costValue = costValue;
        this.costProductRange = costProductRange;
    }
    
    @PrePersist
    protected void onCreate() {
        this.createDateTime = LocalDateTime.now();
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public Integer getClientId() {
        return clientId;
    }
    
    public void setClientId(Integer clientId) {
        this.clientId = clientId;
    }
    
    public Long getMarketplaceId() {
        return marketplaceId;
    }
    
    public void setMarketplaceId(Long marketplaceId) {
        this.marketplaceId = marketplaceId;
    }
    
    public Long getBrandId() {
        return brandId;
    }
    
    public void setBrandId(Long brandId) {
        this.brandId = brandId;
    }
    
    public Marketplace getMarketplace() {
        return marketplace;
    }
    
    public void setMarketplace(Marketplace marketplace) {
        this.marketplace = marketplace;
    }
    
    public Brand getBrand() {
        return brand;
    }
    
    public void setBrand(Brand brand) {
        this.brand = brand;
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
}
