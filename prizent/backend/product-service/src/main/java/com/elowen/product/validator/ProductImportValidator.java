package com.elowen.product.validator;

import com.elowen.product.dto.ImportRowDTO;
import com.elowen.product.dto.ImportRowError;
import com.elowen.product.repository.ProductRepository;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * Validates a single parsed import row against business rules.
 *
 * <p>Checks performed:
 * <ul>
 *   <li>Required fields not blank (name, skuCode, brandId, categoryId, currentType)</li>
 *   <li>Numeric field constraints (prices &gt;= 0)</li>
 *   <li>Duplicate SKU within the current file (via the {@code seenSkus} set)</li>
 *   <li>Duplicate SKU already in the database for the same client</li>
 * </ul>
 *
 * <p>Brand and Category existence are NOT validated here because cross-service
 * calls are prohibited per the architecture rules of this service.
 */
public class ProductImportValidator {

    private final ProductRepository productRepository;
    private final Integer clientId;

    public ProductImportValidator(ProductRepository productRepository, Integer clientId) {
        this.productRepository = productRepository;
        this.clientId          = clientId;
    }

    /**
     * Validate one row.
     *
     * @param row      the parsed row DTO
     * @param seenSkus set of already-encountered (normalised, upper-cased) SKUs from
     *                 earlier rows in the same file – used for duplicate detection
     * @return list of errors; empty means the row is valid
     */
    public List<ImportRowError> validate(ImportRowDTO row, Set<String> seenSkus) {
        List<ImportRowError> errors = new ArrayList<>();
        int rowNum = row.getRowNumber();

        // ── Required: Product Name ────────────────────────────────────────────
        if (isBlank(row.getName())) {
            errors.add(new ImportRowError(rowNum, "Product Name", "Product Name is required"));
        }

        // ── Required: SKU Code ────────────────────────────────────────────────
        if (isBlank(row.getSkuCode())) {
            errors.add(new ImportRowError(rowNum, "SKU Code", "SKU Code is required"));
        } else {
            String normSku = row.getSkuCode().trim().toUpperCase();

            // Duplicate within this file
            if (seenSkus.contains(normSku)) {
                errors.add(new ImportRowError(rowNum, "SKU Code",
                        "Duplicate SKU within the uploaded file: '" + normSku + "'"));
            }
            // Duplicate already in the database
            else if (productRepository.findByClientIdAndSkuCode(clientId, normSku).isPresent()) {
                errors.add(new ImportRowError(rowNum, "SKU Code",
                        "SKU already exists in the system: '" + normSku + "'"));
            }
        }

        // ── Required: Brand Name (resolved to ID before validation) ────────────────
        if (row.getBrandId() == null) {
            // Only show if no parse/resolution error was already added by resolveNames()
            if (row.getBrandName() == null || row.getBrandName().isBlank()) {
                errors.add(new ImportRowError(rowNum, "Brand Name",
                        "Brand Name is required"));
            }
            // If brandName was provided but not resolved, the error was added in resolveNames()
        } else if (row.getBrandId() <= 0) {
            errors.add(new ImportRowError(rowNum, "Brand Name",
                    "Brand could not be resolved to a valid ID"));
        }

        // ── Required: Category Name (resolved to ID before validation) ──────────────
        if (row.getCategoryId() == null) {
            if (row.getCategoryName() == null || row.getCategoryName().isBlank()) {
                errors.add(new ImportRowError(rowNum, "Category Name",
                        "Category Name is required"));
            }
            // If categoryName was provided but not resolved, the error was added in resolveNames()
        } else if (row.getCategoryId() <= 0) {
            errors.add(new ImportRowError(rowNum, "Category Name",
                    "Category could not be resolved to a valid ID"));
        }

        // ── Numeric constraints ───────────────────────────────────────────────
        validateNonNegative(rowNum, "MRP", row.getMrp(), errors);
        validateNonNegative(rowNum, "Product Cost", row.getProductCost(), errors);
        validateNonNegative(rowNum, "Proposed Selling Price (Sales)",
                row.getProposedSellingPriceSales(), errors);
        validateNonNegative(rowNum, "Proposed Selling Price (Non-Sales)",
                row.getProposedSellingPriceNonSales(), errors);

        return errors;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private void validateNonNegative(int rowNum, String fieldName,
                                     BigDecimal value, List<ImportRowError> errors) {
        if (value != null && value.compareTo(BigDecimal.ZERO) < 0) {
            errors.add(new ImportRowError(rowNum, fieldName,
                    fieldName + " cannot be negative"));
        }
    }
}
