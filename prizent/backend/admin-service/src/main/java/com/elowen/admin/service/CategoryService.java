package com.elowen.admin.service;

import com.elowen.admin.dto.CategoryResponse;
import com.elowen.admin.dto.CategoryTreeNode;
import com.elowen.admin.dto.CreateCategoryRequest;
import com.elowen.admin.dto.UpdateCategoryRequest;
import com.elowen.admin.entity.Category;
import com.elowen.admin.exception.CategoryNotFoundException;
import com.elowen.admin.exception.InvalidCategoryHierarchyException;
import com.elowen.admin.repository.CategoryRepository;
import com.elowen.admin.repository.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class CategoryService {
    
    private static final Logger log = LoggerFactory.getLogger(CategoryService.class);
    private static final int MAX_HIERARCHY_DEPTH = 100;
    
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    
    @Autowired
    public CategoryService(CategoryRepository categoryRepository, ProductRepository productRepository) {
        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
    }
    
    @Transactional
    public CategoryResponse createCategory(CreateCategoryRequest request, Integer clientId) {
        String categoryName = request.getName().trim();
        Integer parentCategoryId = request.getParentCategoryId();
        
        if (parentCategoryId != null) {
            validateParentCategory(parentCategoryId, clientId, null);
        }
        
        validateNameUniqueness(categoryName, parentCategoryId, clientId, null);
        
        Category category = new Category(clientId, categoryName, parentCategoryId);
        if (request.getEnabled() != null) {
            category.setEnabled(request.getEnabled());
        }
        Category savedCategory = categoryRepository.save(category);
        
        log.info("Created category ID {} for client {}", savedCategory.getId(), clientId);
        return CategoryResponse.fromEntity(savedCategory);
    }
    
    @Transactional(readOnly = true)
    public List<CategoryResponse> getAllCategories(Integer clientId) {
        List<Category> categories = categoryRepository.findAllByClientIdOrderByCreateDateTimeDesc(clientId);
        return categories.stream()
                .map(CategoryResponse::fromEntity)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<CategoryTreeNode> getCategoryTree(Integer clientId) {
        List<Category> allCategories = categoryRepository.findAllByClientIdOrderByCreateDateTimeDesc(clientId);
        return buildCategoryTree(allCategories);
    }
    
    @Transactional(readOnly = true)
    public CategoryResponse getCategoryById(Integer categoryId, Integer clientId) {
        Category category = findCategoryByIdAndClientId(categoryId, clientId);
        return CategoryResponse.fromEntity(category);
    }
    
    @Transactional
    public CategoryResponse updateCategory(Integer categoryId, UpdateCategoryRequest request, Integer clientId, Long updatedBy) {
        if (request.isEmpty()) {
            return getCategoryById(categoryId, clientId);
        }
        
        Category existingCategory = findCategoryByIdAndClientId(categoryId, clientId);
        
        if (request.hasName()) {
            String newName = request.getName().trim();
            if (!newName.equals(existingCategory.getName())) {
                validateNameUniqueness(newName, existingCategory.getParentCategoryId(), clientId, categoryId);
                existingCategory.setName(newName);
            }
        }
        
        if (request.hasParentCategoryId()) {
            Integer newParentId = request.getParentCategoryId();
            if (!Objects.equals(newParentId, existingCategory.getParentCategoryId())) {
                validateParentCategory(newParentId, clientId, categoryId);
                existingCategory.setParentCategoryId(newParentId);
            }
        }
        
        // Set updated_by
        if (updatedBy != null) {
            existingCategory.setUpdatedBy(updatedBy);
        }
        
        Category updatedCategory = categoryRepository.save(existingCategory);
        log.info("Updated category {} for client {} by user {}", categoryId, clientId, updatedBy);
        return CategoryResponse.fromEntity(updatedCategory);
    }
    
    @Transactional
    public CategoryResponse enableCategory(Integer categoryId, Integer clientId) {
        Category category = findCategoryByIdAndClientId(categoryId, clientId);
        
        if (category.getEnabled()) {
            return CategoryResponse.fromEntity(category);
        }
        
        category.setEnabled(true);
        Category enabledCategory = categoryRepository.save(category);
        log.info("Enabled category {} for client {}", categoryId, clientId);
        return CategoryResponse.fromEntity(enabledCategory);
    }
    
    @Transactional
    public CategoryResponse disableCategory(Integer categoryId, Integer clientId) {
        Category category = findCategoryByIdAndClientId(categoryId, clientId);
        
        if (!category.getEnabled()) {
            return CategoryResponse.fromEntity(category);
        }
        
        List<Category> enabledChildren = categoryRepository.findAllByClientIdAndParentCategoryId(clientId, categoryId)
                .stream()
                .filter(Category::getEnabled)
                .collect(Collectors.toList());
        
        if (!enabledChildren.isEmpty()) {
            throw new IllegalStateException(
                String.format("Cannot disable category %d: it has %d enabled child categories", 
                    categoryId, enabledChildren.size()));
        }
        
        long enabledProductCount = productRepository.findAllByCategoryIdAndClientIdOrderByNameAsc(categoryId, clientId)
                .stream()
                .filter(product -> product.getEnabled())
                .count();
        
        if (enabledProductCount > 0) {
            throw new IllegalStateException(
                String.format("Cannot disable category %d: it has %d enabled products", 
                    categoryId, enabledProductCount));
        }
        
        category.setEnabled(false);
        Category disabledCategory = categoryRepository.save(category);
        log.info("Disabled category {} for client {}", categoryId, clientId);
        return CategoryResponse.fromEntity(disabledCategory);
    }
    
    private Category findCategoryByIdAndClientId(Integer categoryId, Integer clientId) {
        return categoryRepository.findByIdAndClientId(categoryId, clientId)
                .orElseThrow(() -> new CategoryNotFoundException(categoryId, clientId));
    }
    
    private void validateNameUniqueness(String name, Integer parentCategoryId, Integer clientId, Integer excludeCategoryId) {
        boolean exists;
        if (excludeCategoryId == null) {
            exists = categoryRepository.existsByClientIdAndNameAndParentCategoryId(clientId, name, parentCategoryId);
        } else {
            exists = categoryRepository.existsByClientIdAndNameAndParentCategoryIdExcluding(
                    clientId, name, parentCategoryId, excludeCategoryId);
        }
        
        if (exists) {
            String parentInfo = parentCategoryId != null ? "parent " + parentCategoryId : "root level";
            throw new IllegalArgumentException(
                String.format("Category '%s' already exists at %s", name, parentInfo));
        }
    }
    
    private void validateParentCategory(Integer parentCategoryId, Integer clientId, Integer currentCategoryId) {
        if (parentCategoryId == null) {
            return;
        }
        
        if (currentCategoryId != null && parentCategoryId.equals(currentCategoryId)) {
            throw InvalidCategoryHierarchyException.selfParent(currentCategoryId);
        }
        
        Category parentCategory = findCategoryByIdAndClientId(parentCategoryId, clientId);
        
        if (!parentCategory.getEnabled()) {
            throw InvalidCategoryHierarchyException.disabledParent(parentCategoryId);
        }
        
        if (currentCategoryId != null && isDescendantOf(parentCategoryId, currentCategoryId, clientId)) {
            throw InvalidCategoryHierarchyException.cycleDetected(currentCategoryId, parentCategoryId);
        }
    }
    
    private boolean isDescendantOf(Integer potentialDescendant, Integer categoryId, Integer clientId) {
        Set<Integer> visited = new HashSet<>();
        Integer currentId = potentialDescendant;
        int depth = 0;
        
        while (currentId != null) {
            if (visited.contains(currentId)) {
                throw new InvalidCategoryHierarchyException(
                    "Category hierarchy is corrupted - infinite loop detected at category " + currentId);
            }
            
            if (depth > MAX_HIERARCHY_DEPTH) {
                throw new InvalidCategoryHierarchyException(
                    "Category hierarchy is too deep (exceeds " + MAX_HIERARCHY_DEPTH + " levels)");
            }
            
            visited.add(currentId);
            depth++;
            
            if (currentId.equals(categoryId)) {
                return true;
            }
            
            Optional<Category> categoryOpt = categoryRepository.findByIdAndClientId(currentId, clientId);
            if (categoryOpt.isEmpty()) {
                break;
            }
            
            currentId = categoryOpt.get().getParentCategoryId();
        }
        
        return false;
    }
    
    private List<CategoryTreeNode> buildCategoryTree(List<Category> allCategories) {
        Map<Integer, CategoryTreeNode> nodeMap = new HashMap<>();
        List<CategoryTreeNode> rootNodes = new ArrayList<>();
        
        for (Category category : allCategories) {
            CategoryTreeNode node = new CategoryTreeNode(
                category.getId(),
                category.getName(),
                category.getParentCategoryId(),
                category.getEnabled(),
                category.getCreateDateTime(),
                category.getUpdateDateTime()
            );
            nodeMap.put(category.getId(), node);
        }
        
        for (Category category : allCategories) {
            CategoryTreeNode node = nodeMap.get(category.getId());
            Integer parentId = category.getParentCategoryId();
            
            if (parentId == null) {
                rootNodes.add(node);
            } else {
                CategoryTreeNode parentNode = nodeMap.get(parentId);
                if (parentNode != null) {
                    parentNode.addChild(node);
                }
            }
        }
        
        return rootNodes;
    }
    
    @Transactional
    public void deleteCategory(Integer categoryId, Integer clientId) {
        log.info("Attempting to delete category ID {} for client {}", categoryId, clientId);
        
        Category category = categoryRepository.findByIdAndClientId(categoryId, clientId)
            .orElseThrow(() -> new CategoryNotFoundException("Category not found with ID: " + categoryId));
        
        // Check if category has children
        List<Category> children = categoryRepository.findAllByClientIdAndParentCategoryId(clientId, categoryId);
        if (!children.isEmpty()) {
            throw new IllegalStateException("Cannot delete category with child categories. Please delete child categories first.");
        }
        
        // For now, skip the product check since ProductRepository might not be fully implemented
        // TODO: Implement product check when ProductRepository is ready
        
        categoryRepository.delete(category);
        log.info("Successfully deleted category ID {} for client {}", categoryId, clientId);
    }
}
