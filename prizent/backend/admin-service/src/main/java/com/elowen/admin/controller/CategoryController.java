package com.elowen.admin.controller;

import com.elowen.admin.dto.CategoryResponse;
import com.elowen.admin.dto.CategoryTreeNode;
import com.elowen.admin.dto.CreateCategoryRequest;
import com.elowen.admin.dto.UpdateCategoryRequest;
import com.elowen.admin.exception.CategoryNotFoundException;
import com.elowen.admin.security.JwtUtil;
import com.elowen.admin.security.UserPrincipal;
import com.elowen.admin.service.CategoryService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/categories")
// @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')") // Temporarily disabled for testing
@CrossOrigin(origins = "*")
public class CategoryController {
    
    private static final Logger log = LoggerFactory.getLogger(CategoryController.class);
    
    private final CategoryService categoryService;
    
    @Autowired
    private JwtUtil jwtUtil;
    
    @Autowired
    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }
    
    @PostMapping
    public ResponseEntity<Map<String, Object>> createCategory(
            @Valid @RequestBody CreateCategoryRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        
        Integer clientId = principal != null ? principal.getClientId() : 1; // Default clientId for testing
        CategoryResponse categoryResponse = categoryService.createCategory(request, clientId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Category created successfully");
        response.put("category", categoryResponse);
        
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
    
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllCategories(
            @AuthenticationPrincipal UserPrincipal principal) {
        
        Integer clientId = principal != null ? principal.getClientId() : 1; // Default clientId for testing
        List<CategoryResponse> categories = categoryService.getAllCategories(clientId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Categories retrieved successfully");
        response.put("categories", categories);
        response.put("count", categories.size());
        
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/tree")
    public ResponseEntity<Map<String, Object>> getCategoryTree(
            @AuthenticationPrincipal UserPrincipal principal) {
        
        Integer clientId = principal != null ? principal.getClientId() : 1; // Default clientId for testing
        List<CategoryTreeNode> tree = categoryService.getCategoryTree(clientId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Category tree retrieved successfully");
        response.put("tree", tree);
        
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/{categoryId}")
    public ResponseEntity<Map<String, Object>> getCategoryById(
            @PathVariable Integer categoryId,
            @AuthenticationPrincipal UserPrincipal principal) {
        
        Integer clientId = principal != null ? principal.getClientId() : 1; // Default clientId for testing
        CategoryResponse categoryResponse = categoryService.getCategoryById(categoryId, clientId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Category retrieved successfully");
        response.put("category", categoryResponse);
        
        return ResponseEntity.ok(response);
    }
    
    @PutMapping("/{categoryId}")
    public ResponseEntity<Map<String, Object>> updateCategory(
            @PathVariable Integer categoryId,
            @Valid @RequestBody UpdateCategoryRequest request,
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        
        Integer clientId = principal != null ? principal.getClientId() : 1; // Default clientId for testing
        Long updatedBy = extractUserIdFromToken(authHeader);
        
        CategoryResponse categoryResponse = categoryService.updateCategory(
                categoryId, request, clientId, updatedBy);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Category updated successfully");
        response.put("category", categoryResponse);
        
        return ResponseEntity.ok(response);
    }
    
    @PatchMapping("/{categoryId}/enable")
    public ResponseEntity<Map<String, Object>> enableCategory(
            @PathVariable Integer categoryId,
            @AuthenticationPrincipal UserPrincipal principal) {
        
        Integer clientId = principal != null ? principal.getClientId() : 1; // Default clientId for testing
        CategoryResponse categoryResponse = categoryService.enableCategory(categoryId, clientId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Category enabled successfully");
        response.put("category", categoryResponse);
        
        return ResponseEntity.ok(response);
    }
    
    @PatchMapping("/{categoryId}/disable")
    public ResponseEntity<Map<String, Object>> disableCategory(
            @PathVariable Integer categoryId,
            @AuthenticationPrincipal UserPrincipal principal) {
        
        Integer clientId = principal != null ? principal.getClientId() : 1; // Default clientId for testing
        CategoryResponse categoryResponse = categoryService.disableCategory(categoryId, clientId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Category disabled successfully");
        response.put("category", categoryResponse);
        
        return ResponseEntity.ok(response);
    }
    
    @DeleteMapping("/{categoryId}")
    public ResponseEntity<Map<String, Object>> deleteCategory(
            @PathVariable Integer categoryId,
            @AuthenticationPrincipal UserPrincipal principal) {
        
        Integer clientId = principal != null ? principal.getClientId() : 1; // Default clientId for testing
        
        try {
            categoryService.deleteCategory(categoryId, clientId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Category deleted successfully");
            
            return ResponseEntity.ok(response);
        } catch (IllegalStateException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (CategoryNotFoundException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(404).body(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Failed to delete category: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * Helper method to extract userId from JWT token
     */
    private Long extractUserIdFromToken(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            try {
                String token = authHeader.substring(7);
                String userIdStr = jwtUtil.extractUserId(token);
                return Long.parseLong(userIdStr);
            } catch (Exception e) {
                log.error("Error extracting userId from token: {}", e.getMessage());
            }
        }
        return null;
    }
}
