package com.elowen.pricing.client;

import com.elowen.pricing.dto.ProductDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;

@Component
public class ProductServiceClient {

    private final RestTemplate restTemplate;

    @Value("${product.service.url}")
    private String productServiceUrl;

    public ProductServiceClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * Fetches a product by its numeric ID from product-service.
     * Response is cached per-id for 10 minutes (see CacheConfig).
     */
    @Cacheable(value = "products", key = "#productId")
    public ProductDto getProductById(Long productId, String authToken) {
        String url = productServiceUrl + "/products/" + productId;

        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.AUTHORIZATION, authToken);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        ResponseEntity<ProductDto> response =
            restTemplate.exchange(url, HttpMethod.GET, entity, ProductDto.class);

        return response.getBody();
    }
}
