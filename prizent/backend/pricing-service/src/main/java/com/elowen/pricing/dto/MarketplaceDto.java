package com.elowen.pricing.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class MarketplaceDto {

    private Long id;
    private String name;
    private Boolean enabled;
    private List<MarketplaceCostDto> costs;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }

    public List<MarketplaceCostDto> getCosts() { return costs; }
    public void setCosts(List<MarketplaceCostDto> costs) { this.costs = costs; }
}
