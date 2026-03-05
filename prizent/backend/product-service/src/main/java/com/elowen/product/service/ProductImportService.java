package com.elowen.product.service;

import com.elowen.product.client.AdminServiceClient;
import com.elowen.product.dto.*;
import com.elowen.product.entity.Product;
import com.elowen.product.entity.ProductMarketplaceMapping;
import com.elowen.product.repository.ProductMarketplaceMappingRepository;
import com.elowen.product.repository.ProductRepository;
import com.elowen.product.security.UserPrincipal;
import com.elowen.product.util.ExcelParserUtil;
import com.elowen.product.validator.ProductImportValidator;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.*;

/**
 * Service for bulk product import.
 *
 * <h3>Template generation</h3>
 * Builds an Excel (.xlsx) template that includes all standard product columns
 * plus one column per active custom field fetched from admin-service.
 *
 * <h3>Import processing</h3>
 * <ol>
 *   <li>Parse uploaded file (xlsx / xls / csv)</li>
 *   <li>Validate each row – collect errors per row</li>
 *   <li>Batch-insert valid rows (100 per transaction chunk)</li>
 *   <li>Save custom-field values via admin-service</li>
 *   <li>Save marketplace mappings</li>
 *   <li>Return {@link ImportResultDTO} with success / fail counts and per-row errors</li>
 * </ol>
 */
@Service
public class ProductImportService {

    private static final Logger log = LoggerFactory.getLogger(ProductImportService.class);
    private static final int BATCH_SIZE = 100;

    private final ProductRepository                  productRepository;
    private final ProductMarketplaceMappingRepository mappingRepository;
    private final AdminServiceClient                 adminServiceClient;
    private final ExcelParserUtil                    excelParserUtil;

    @Autowired
    public ProductImportService(ProductRepository productRepository,
                                ProductMarketplaceMappingRepository mappingRepository,
                                AdminServiceClient adminServiceClient,
                                ExcelParserUtil excelParserUtil) {
        this.productRepository  = productRepository;
        this.mappingRepository  = mappingRepository;
        this.adminServiceClient = adminServiceClient;
        this.excelParserUtil    = excelParserUtil;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Template generation
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Generate and return an Excel template (.xlsx) as a byte array.
     * Custom fields configured in admin-service are appended as extra columns.
     */
    public byte[] generateImportTemplate(String authToken) throws IOException {
        // Fetch custom field definitions (non-fatal if admin-service is down)
        List<Map<String, Object>> cfDefs =
                adminServiceClient.getCustomFieldDefinitions("p", authToken);

        // Fetch brands / categories / marketplaces for the Valid Options sheet
        List<Map<String, Object>> brands       = adminServiceClient.getBrandsForImport(authToken);
        List<Map<String, Object>> categories   = adminServiceClient.getCategoriesForImport(authToken);
        List<Map<String, Object>> marketplaces = adminServiceClient.getMarketplacesForImport(authToken);

        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet productsSheet    = workbook.createSheet("Products");
            Sheet infoSheet        = workbook.createSheet("Instructions");
            Sheet validOptionsSheet = workbook.createSheet("Valid Options (Reference)");

            buildProductsSheet(workbook, productsSheet, cfDefs, brands, categories, marketplaces);
            buildInstructionsSheet(infoSheet, cfDefs);
            buildValidOptionsSheet(validOptionsSheet, brands, categories, marketplaces);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }

    private void buildProductsSheet(XSSFWorkbook wb, Sheet sheet,
                                    List<Map<String, Object>> cfDefs,
                                    List<Map<String, Object>> brands,
                                    List<Map<String, Object>> categories,
                                    List<Map<String, Object>> marketplaces) {

        // ── Header style (dark background, white bold text) ───────────────────
        CellStyle headerStyle = wb.createCellStyle();
        Font headerFont = wb.createFont();
        headerFont.setBold(true);
        headerFont.setColor(IndexedColors.WHITE.getIndex());
        headerStyle.setFont(headerFont);
        headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        headerStyle.setAlignment(HorizontalAlignment.CENTER);
        headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        headerStyle.setBorderBottom(BorderStyle.THIN);
        headerStyle.setBorderTop(BorderStyle.THIN);
        headerStyle.setBorderLeft(BorderStyle.THIN);
        headerStyle.setBorderRight(BorderStyle.THIN);

        // Required column style (orange background)
        CellStyle requiredStyle = wb.createCellStyle();
        requiredStyle.cloneStyleFrom(headerStyle);
        requiredStyle.setFillForegroundColor(IndexedColors.ORANGE.getIndex());

        // Example row style (normal black)
        CellStyle exampleStyle = wb.createCellStyle();
        Font exampleFont = wb.createFont();
        exampleFont.setItalic(false);
        exampleFont.setColor(IndexedColors.BLACK.getIndex());
        exampleStyle.setFont(exampleFont);

        // Pick example names from real data (or fallback placeholders)
        String exampleBrand       = brands.isEmpty()       ? "YourBrandName"       : (String) brands.get(0).get("name");
        String exampleCategory    = categories.isEmpty()   ? "YourCategoryName"    : (String) categories.get(0).get("name");
        String exampleMarketplace = marketplaces.isEmpty() ? "YourMarketplaceName" : (String) marketplaces.get(0).get("name");

        // ── Build column list ─────────────────────────────────────────────────
        List<String> headers  = new ArrayList<>(ExcelParserUtil.STANDARD_HEADERS);
        List<Object> examples = new ArrayList<>(Arrays.asList(
                "My Product",         // Product Name*
                "PN-001",             // Product Number
                "SC-001",             // Style Code
                "SKU-001",            // SKU Code*
                exampleBrand,         // Brand Name*
                exampleCategory,      // Category Name*
                999.00,               // MRP
                750.00,               // Product Cost
                899.00,               // Proposed Selling Price (Sales)
                950.00,               // Proposed Selling Price (Non-Sales)
                "true",              // Enabled (true/false)
                exampleMarketplace    // Marketplace Names (comma-sep)
        ));

        // Add dynamic custom-field columns
        for (Map<String, Object> cf : cfDefs) {
            String name = (String) cf.get("name");
            if (name != null && !name.isBlank()) {
                headers.add(ExcelParserUtil.CF_PREFIX + name);
                examples.add("sample value");
            }
        }

        // ── Row 0: Header row ─────────────────────────────────────────────────
        Row headerRow = sheet.createRow(0);
        headerRow.setHeightInPoints(20);

        Set<String> requiredCols = Set.of(
                ExcelParserUtil.COL_PRODUCT_NAME,
                ExcelParserUtil.COL_SKU_CODE,
                ExcelParserUtil.COL_BRAND_NAME,
                ExcelParserUtil.COL_CATEGORY_NAME
        );

        for (int i = 0; i < headers.size(); i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers.get(i));
            cell.setCellStyle(requiredCols.contains(headers.get(i)) ? requiredStyle : headerStyle);
            sheet.setColumnWidth(i, 7000);
        }

        // ── Row 1: Example data row ───────────────────────────────────────────
        Row exampleRow = sheet.createRow(1);
        for (int i = 0; i < examples.size(); i++) {
            Cell cell = exampleRow.createCell(i);
            Object val = examples.get(i);
            if (val instanceof Number) {
                cell.setCellValue(((Number) val).doubleValue());
            } else {
                cell.setCellValue(val != null ? val.toString() : "");
            }
            cell.setCellStyle(exampleStyle);
        }

        // Freeze the header row
        sheet.createFreezePane(0, 1);
    }

    private void buildInstructionsSheet(Sheet sheet,
                                         List<Map<String, Object>> cfDefs) {
        int ri = 0;
        addInfoRow(sheet, ri++, "=== Product Import Instructions ===");
        addInfoRow(sheet, ri++, "Fill product data in the 'Products' sheet starting from row 3.");
        addInfoRow(sheet, ri++, "Orange headers = required fields.  Blue headers = optional.");
        addInfoRow(sheet, ri++, "");
        addInfoRow(sheet, ri++, "COLUMN GUIDE:");
        addInfoRow(sheet, ri++, "  Product Name*              : Full product name (max 255 chars)");
        addInfoRow(sheet, ri++, "  Product Number             : Optional product number");
        addInfoRow(sheet, ri++, "  Style Code                 : Optional style code");
        addInfoRow(sheet, ri++, "  SKU Code*                  : Unique stock-keeping unit code");
        addInfoRow(sheet, ri++, "  Brand Name*                : Exact brand name (see 'Valid Options (Reference)' sheet)");
        addInfoRow(sheet, ri++, "  Category Name*             : Exact category name (see 'Valid Options (Reference)' sheet)");
        addInfoRow(sheet, ri++, "  MRP                        : Maximum Retail Price (>= 0)");
        addInfoRow(sheet, ri++, "  Product Cost               : Cost price (>= 0)");
        addInfoRow(sheet, ri++, "  Proposed SP (Sales)        : Proposed Selling Price for sales period");
        addInfoRow(sheet, ri++, "  Proposed SP (Non-S.)       : Proposed Selling Price outside sales");
        addInfoRow(sheet, ri++, "  Enabled                    : true / false  (default: true)");
        addInfoRow(sheet, ri++, "  Marketplace Names          : Comma-separated marketplace names e.g. Amazon,Ebay");
        addInfoRow(sheet, ri++, "                               (see 'Valid Options (Reference)' sheet for allowed names)");
        addInfoRow(sheet, ri++, "");
        addInfoRow(sheet, ri++, "TIP: Open the 'Valid Options (Reference)' sheet to see all allowed Brand,");
        addInfoRow(sheet, ri++, "     Category, and Marketplace names. Copy-paste to avoid typos.");

        if (!cfDefs.isEmpty()) {
            addInfoRow(sheet, ri++, "");
            addInfoRow(sheet, ri++, "CUSTOM FIELDS (CF: prefix columns):");
            for (Map<String, Object> cf : cfDefs) {
                String name  = (String) cf.get("name");
                String type  = (String) cf.get("fieldType");
                String desc  = (name != null ? name : "?") + "  [type: " + (type != null ? type : "TEXT") + "]";
                addInfoRow(sheet, ri++, "  CF:" + desc);
            }
        }

        sheet.setColumnWidth(0, 25000);
    }

    private void buildValidOptionsSheet(Sheet sheet,
                                         List<Map<String, Object>> brands,
                                         List<Map<String, Object>> categories,
                                         List<Map<String, Object>> marketplaces) {
        int ri = 0;
        // Header row
        Row headerRow = sheet.createRow(ri++);
        headerRow.createCell(0).setCellValue("Valid Brand Names");
        headerRow.createCell(1).setCellValue("Valid Category Names");
        headerRow.createCell(2).setCellValue("Valid Marketplace Names");

        // Data rows
        int maxRows = Math.max(brands.size(), Math.max(categories.size(), marketplaces.size()));
        for (int i = 0; i < maxRows; i++) {
            Row row = sheet.createRow(ri++);
            if (i < brands.size()) {
                Object name = brands.get(i).get("name");
                row.createCell(0).setCellValue(name != null ? name.toString() : "");
            }
            if (i < categories.size()) {
                Object name = categories.get(i).get("name");
                row.createCell(1).setCellValue(name != null ? name.toString() : "");
            }
            if (i < marketplaces.size()) {
                Object name = marketplaces.get(i).get("name");
                row.createCell(2).setCellValue(name != null ? name.toString() : "");
            }
        }

        sheet.setColumnWidth(0, 8000);
        sheet.setColumnWidth(1, 8000);
        sheet.setColumnWidth(2, 8000);
    }

    private void addInfoRow(Sheet sheet, int rowIndex, String text) {
        Row row = sheet.createRow(rowIndex);
        row.createCell(0).setCellValue(text);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Import processing
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Parse, validate, and bulk-save products from an uploaded file.
     *
     * @param file      the uploaded .xlsx / .xls / .csv file
     * @param authToken forward to admin-service for custom-field operations
     * @return summary with success / fail counts and per-row errors
     */
    @Transactional
    public ImportResultDTO importProducts(MultipartFile file, String authToken) throws IOException {
        log.info("Starting bulk product import: file={}, size={}",
                file.getOriginalFilename(), file.getSize());

        // ── 1. Fetch custom field definitions for CF-column mapping ────────────
        List<Map<String, Object>> cfDefs =
                adminServiceClient.getCustomFieldDefinitions("p", authToken);
        Map<String, Long> cfNameToId = buildCfNameToIdMap(cfDefs);

        // ── 2. Resolve current user / tenant ──────────────────────────────────
        UserPrincipal principal = getCurrentUserPrincipal();
        Integer clientId = principal.getClientId();
        Long    userId   = principal.getId();

        // ── 3. Parse the uploaded file ─────────────────────────────────────────
        ExcelParserUtil.ParseResult parseResult = excelParserUtil.parseFile(file);
        List<ImportRowDTO>   rows      = parseResult.getRows();
        List<ImportRowError> allErrors = new ArrayList<>(parseResult.getErrors());

        log.info("Parsed {} rows, {} parse errors", rows.size(), allErrors.size());

        // ── 4. Fetch lookup data for name → ID resolution ─────────────────────
        Map<String, Long> brandNameToId       = buildNameIdMap(adminServiceClient.getBrandsForImport(authToken));
        Map<String, Long> categoryNameToId    = buildNameIdMap(adminServiceClient.getCategoriesForImport(authToken));
        Map<String, Long> marketplaceNameToId = buildNameIdMap(adminServiceClient.getMarketplacesForImport(authToken));

        log.info("Loaded {} brands, {} categories, {} marketplaces for import name resolution",
                brandNameToId.size(), categoryNameToId.size(), marketplaceNameToId.size());
        if (!marketplaceNameToId.isEmpty()) {
            log.debug("Available marketplace names: {}", marketplaceNameToId.keySet());
        } else {
            log.warn("WARNING: No marketplaces loaded from admin-service. Products will not be mapped to marketplaces.");
        }

        // ── 5. Resolve names → IDs. Track rows with resolution errors ──────────
        Set<Integer> resolutionErrorRows = new HashSet<>();
        for (ImportRowDTO row : rows) {
            int errorsBefore = allErrors.size();
            resolveNames(row, brandNameToId, categoryNameToId, marketplaceNameToId, allErrors);
            if (allErrors.size() > errorsBefore) {
                resolutionErrorRows.add(row.getRowNumber());
            }
        }

        // ── 6. Row-level validation ────────────────────────────────────────────
        ProductImportValidator validator = new ProductImportValidator(productRepository, clientId);
        Set<String>            seenSkus  = new HashSet<>();
        List<ImportRowDTO>     validRows = new ArrayList<>();

        for (ImportRowDTO row : rows) {
            // Skip rows that already failed name resolution (errors already recorded)
            if (resolutionErrorRows.contains(row.getRowNumber())) continue;

            List<ImportRowError> rowErrors = validator.validate(row, seenSkus);
            if (rowErrors.isEmpty()) {
                seenSkus.add(normalise(row.getSkuCode()));
                validRows.add(row);
            } else {
                allErrors.addAll(rowErrors);
            }
        }

        log.info("{} valid rows after validation, {} rows failed", validRows.size(),
                rows.size() - validRows.size());

        // ── 8. Batch insert ────────────────────────────────────────────────────
        int successCount = 0;
        List<List<ImportRowDTO>> batches = partition(validRows, BATCH_SIZE);

        for (List<ImportRowDTO> batch : batches) {
            try {
                successCount += saveBatch(batch, clientId, userId, cfNameToId, authToken, allErrors);
            } catch (Exception e) {
                log.error("Unexpected error saving batch starting row {}: {}",
                        batch.get(0).getRowNumber(), e.getMessage(), e);
                for (ImportRowDTO row : batch) {
                    allErrors.add(new ImportRowError(row.getRowNumber(), "Save",
                            "Batch save failed: " + e.getMessage()));
                }
            }
        }

        int failedCount = rows.size() - successCount;
        log.info("Import complete: {} succeeded, {} failed", successCount, failedCount);
        return new ImportResultDTO(successCount, failedCount, rows.size(), allErrors);
    }

    // ── Batch save ────────────────────────────────────────────────────────────

    @Transactional
    protected int saveBatch(List<ImportRowDTO> batch,
                             Integer clientId,
                             Long userId,
                             Map<String, Long> cfNameToId,
                             String authToken,
                             List<ImportRowError> allErrors) {

        log.debug("Saving batch of {} rows", batch.size());

        // Build Product entities
        List<Product> entities = new ArrayList<>();
        for (ImportRowDTO row : batch) {
            log.debug("Row {}: Building product entity: name={}, sku={}, brandId={}, categoryId={}, marketplaceIds={}",
                    row.getRowNumber(), row.getName(), row.getSkuCode(), row.getBrandId(), row.getCategoryId(), row.getMarketplaceIds());
            entities.add(buildProduct(row, clientId, userId));
        }

        // Batch-insert all products in this chunk
        List<Product> saved = productRepository.saveAll(entities);
        log.info("Batch: Saved {} products to database", saved.size());

        int savedCount = 0;
        for (int i = 0; i < batch.size(); i++) {
            ImportRowDTO row     = batch.get(i);
            Product      product = saved.get(i);
            
            log.debug("Row {}: Processing post-save for product {}: customFields={}, marketplaces={}",
                    row.getRowNumber(), product.getId(), 
                    row.getCustomFieldValues() != null ? row.getCustomFieldValues().size() : 0,
                    row.getMarketplaceIds() != null ? row.getMarketplaceIds().size() : 0);
            
            savedCount++;

            // Save custom field values
            saveCustomFields(row, product.getId(), cfNameToId, authToken, row.getRowNumber(), allErrors);

            // Save marketplace mappings
            saveMarketplaceMappings(row, product, clientId, userId, row.getRowNumber(), allErrors);
        }
        log.info("Batch: Completed processing {} rows", savedCount);
        return savedCount;
    }

    private void saveCustomFields(ImportRowDTO row, Long productId,
                                   Map<String, Long> cfNameToId, String authToken,
                                   int rowNum, List<ImportRowError> allErrors) {
        if (row.getCustomFieldValues() == null || row.getCustomFieldValues().isEmpty()) return;

        List<CustomFieldValueRequest> cfRequests = new ArrayList<>();
        for (Map.Entry<String, String> entry : row.getCustomFieldValues().entrySet()) {
            Long fieldId = cfNameToId.get(entry.getKey());
            if (fieldId == null) {
                log.debug("Row {}: No fieldId found for custom field '{}'", rowNum, entry.getKey());
                continue;
            }
            cfRequests.add(new CustomFieldValueRequest(fieldId, entry.getValue()));
        }

        if (!cfRequests.isEmpty()) {
            try {
                adminServiceClient.bulkSaveCustomFieldValues("p", productId, cfRequests, authToken);
            } catch (Exception e) {
                log.warn("Row {}: Failed to save custom fields for productId {}: {}",
                        rowNum, productId, e.getMessage());
                // Non-fatal – product was saved; log a warning-level error for the user
                allErrors.add(new ImportRowError(rowNum, "Custom Fields",
                        "Product saved but custom fields could not be stored: " + e.getMessage()));
            }
        }
    }

    private void saveMarketplaceMappings(ImportRowDTO row, Product product,
                                          Integer clientId, Long userId,
                                          int rowNum, List<ImportRowError> allErrors) {
        if (row.getMarketplaceIds() == null || row.getMarketplaceIds().isEmpty()) {
            log.trace("Row {}: No marketplace IDs to save for product {}", rowNum, product.getName());
            return;
        }

        log.debug("Row {}: Saving {} marketplace mappings for product {} (ID: {})", 
                rowNum, row.getMarketplaceIds().size(), product.getName(), product.getId());

        for (Long marketplaceId : row.getMarketplaceIds()) {
            try {
                ProductMarketplaceMapping mapping = new ProductMarketplaceMapping(
                        clientId.longValue(),
                        product.getId(),
                        product.getName(),
                        marketplaceId,
                        "",    // marketplaceName – enriched async / lookup can be added later
                        "",    // productMarketplaceName
                        userId
                );
                mappingRepository.save(mapping);
                log.debug("Row {}: Saved marketplace mapping: product={}, marketplace={}", 
                        rowNum, product.getId(), marketplaceId);
            } catch (Exception e) {
                log.error("Row {}: Failed to save marketplace mapping marketplaceId={}: {}",
                        rowNum, marketplaceId, e.getMessage(), e);
                allErrors.add(new ImportRowError(rowNum, "Marketplace IDs",
                        "Marketplace mapping " + marketplaceId + " could not be saved: " + e.getMessage()));
            }
        }
        log.info("Row {}: Completed marketplace mapping saves for product {}", rowNum, product.getName());
    }

    // ── Entity builder ────────────────────────────────────────────────────────

    private Product buildProduct(ImportRowDTO row, Integer clientId, Long userId) {

        String normalizedName = row.getName().trim();
        String normalizedSku  = normalise(row.getSkuCode());

        Product p = new Product(
                clientId,
                normalizedName,
                row.getBrandId(),
                normalizedSku,
                row.getCategoryId(),
                nvl(row.getMrp()),
                nvl(row.getProductCost()),
                nvl(row.getProposedSellingPriceSales()),
                nvl(row.getProposedSellingPriceNonSales()),
                userId
        );
        p.setEnabled(row.isEnabled());
        if (row.getProductNumber() != null && !row.getProductNumber().isBlank()) {
            p.setProductNumber(row.getProductNumber().trim());
        }
        if (row.getStyleCode() != null && !row.getStyleCode().isBlank()) {
            p.setStyleCode(row.getStyleCode().trim());
        }
        return p;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Map<String, Long> buildCfNameToIdMap(List<Map<String, Object>> cfDefs) {
        Map<String, Long> map = new HashMap<>();
        for (Map<String, Object> cf : cfDefs) {
            String name = (String) cf.get("name");
            Number id   = (Number) cf.get("id");
            if (name != null && id != null) {
                map.put(name.trim(), id.longValue());
            }
        }
        return map;
    }

    /**
     * Build a case-insensitive name → ID map from a list of entity maps
     * (each map must have "id" and "name" keys as returned by admin-service).
     */
    private Map<String, Long> buildNameIdMap(List<Map<String, Object>> entities) {
        Map<String, Long> map = new HashMap<>();
        for (Map<String, Object> entity : entities) {
            Object nameObj = entity.get("name");
            Object idObj   = entity.get("id");
            if (nameObj != null && idObj != null) {
                map.put(nameObj.toString().trim().toLowerCase(), ((Number) idObj).longValue());
            }
        }
        return map;
    }

    /**
     * Resolve brandName, categoryName, and marketplaceNames in a parsed row to their
     * corresponding IDs. Unresolvable names are recorded as row errors.
     */
    private void resolveNames(ImportRowDTO row,
                               Map<String, Long> brandNameToId,
                               Map<String, Long> categoryNameToId,
                               Map<String, Long> marketplaceNameToId,
                               List<ImportRowError> allErrors) {
        int rowNum = row.getRowNumber();

        // Brand Name → Brand ID
        String brandName = row.getBrandName();
        if (brandName != null && !brandName.isBlank()) {
            Long brandId = brandNameToId.get(brandName.trim().toLowerCase());
            if (brandId != null) {
                row.setBrandId(brandId);
                log.debug("Row {}: Resolved brand '{}' to ID {}", rowNum, brandName, brandId);
            } else {
                log.warn("Row {}: Brand not found: '{}'", rowNum, brandName);
                allErrors.add(new ImportRowError(rowNum, "Brand Name",
                        "Brand not found: '" + brandName.trim() + "'. Check the Valid Options sheet for allowed names."));
            }
        }

        // Category Name → Category ID
        String categoryName = row.getCategoryName();
        if (categoryName != null && !categoryName.isBlank()) {
            Long categoryId = categoryNameToId.get(categoryName.trim().toLowerCase());
            if (categoryId != null) {
                row.setCategoryId(categoryId);
                log.debug("Row {}: Resolved category '{}' to ID {}", rowNum, categoryName, categoryId);
            } else {
                log.warn("Row {}: Category not found: '{}'", rowNum, categoryName);
                allErrors.add(new ImportRowError(rowNum, "Category Name",
                        "Category not found: '" + categoryName.trim() + "'. Check the Valid Options sheet for allowed names."));
            }
        }

        // Marketplace Names → Marketplace IDs
        if (row.getMarketplaceNames() != null && !row.getMarketplaceNames().isEmpty()) {
            log.debug("Row {}: Resolving {} marketplace names to IDs", rowNum, row.getMarketplaceNames().size());
            List<Long> resolvedIds = new ArrayList<>();
            for (String mpName : row.getMarketplaceNames()) {
                Long mpId = marketplaceNameToId.get(mpName.trim().toLowerCase());
                if (mpId != null) {
                    resolvedIds.add(mpId);
                    log.debug("Row {}: Resolved marketplace '{}' to ID {}", rowNum, mpName, mpId);
                } else {
                    log.warn("Row {}: Marketplace not found: '{}' (available keys: {})", rowNum, mpName, marketplaceNameToId.keySet());
                    allErrors.add(new ImportRowError(rowNum, "Marketplace Names",
                            "Marketplace not found: '" + mpName.trim() + "'. Check the Valid Options sheet for allowed names."));
                }
            }
            row.setMarketplaceIds(resolvedIds);
            log.debug("Row {}: Resolved {} marketplace names to {} IDs", rowNum, row.getMarketplaceNames().size(), resolvedIds.size());
        }
    }

    private <T> List<List<T>> partition(List<T> list, int size) {
        List<List<T>> parts = new ArrayList<>();
        for (int i = 0; i < list.size(); i += size) {
            parts.add(list.subList(i, Math.min(i + size, list.size())));
        }
        return parts;
    }

    private String normalise(String sku) {
        return sku == null ? "" : sku.trim().toUpperCase();
    }

    private BigDecimal nvl(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }

    private UserPrincipal getCurrentUserPrincipal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal up) {
            return up;
        }
        // Fallback for testing (security is permissive on /api/products/**)
        return new UserPrincipal(1L, 1, "import-user", "ADMIN");
    }
}
