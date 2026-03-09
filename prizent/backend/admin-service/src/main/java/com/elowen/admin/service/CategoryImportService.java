package com.elowen.admin.service;

import com.elowen.admin.dto.ImportResultDTO;
import com.elowen.admin.dto.ImportRowError;
import com.elowen.admin.dto.SaveCustomFieldValueRequest;
import com.elowen.admin.entity.Category;
import com.elowen.admin.entity.CustomFieldConfiguration;
import com.elowen.admin.repository.CategoryRepository;
import com.elowen.admin.repository.CustomFieldConfigurationRepository;
import com.opencsv.CSVReader;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;

/**
 * Service for category bulk import.
 *
 * <h3>Template columns</h3>
 * <ol>
 *   <li>Category Name* — required, max 255 chars</li>
 *   <li>Parent Category Name — optional; leave blank for a root category</li>
 *   <li>Enabled — optional; TRUE/FALSE (default TRUE)</li>
 * </ol>
 *
 * <h3>Import processing</h3>
 * <ol>
 *   <li>Parse uploaded file (.xlsx / .xls / .csv)</li>
 *   <li>Validate each row; collect per-row errors</li>
 *   <li>Resolve parent by name (case-insensitive) from categories already in DB +
 *       categories successfully saved in this import batch</li>
 *   <li>Skip duplicate names at the same level (already exists check)</li>
 *   <li>Return {@link ImportResultDTO}</li>
 * </ol>
 */
@Service
public class CategoryImportService {

    private static final Logger log = LoggerFactory.getLogger(CategoryImportService.class);

    // Column indexes in the template
    private static final int COL_NAME    = 0;
    private static final int COL_PARENT  = 1;
    private static final int COL_ENABLED = 2;
    private static final int FIXED_COLS  = 3;

    private final CategoryRepository categoryRepository;
    private final CustomFieldConfigurationRepository customFieldConfigRepository;
    private final CustomFieldValueService customFieldValueService;

    @Autowired
    public CategoryImportService(CategoryRepository categoryRepository,
                                  CustomFieldConfigurationRepository customFieldConfigRepository,
                                  CustomFieldValueService customFieldValueService) {
        this.categoryRepository = categoryRepository;
        this.customFieldConfigRepository = customFieldConfigRepository;
        this.customFieldValueService = customFieldValueService;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Template generation
    // ══════════════════════════════════════════════════════════════════════════

    public byte[] generateImportTemplate(Integer clientId) throws IOException {
        List<CustomFieldConfiguration> customFields =
                customFieldConfigRepository.findAllByClientIdAndModuleAndEnabledTrueOrderByCreateDateTimeDesc(clientId, "c");
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            buildDataSheet(workbook, workbook.createSheet("Categories"), customFields);
            buildInstructionsSheet(workbook.createSheet("Instructions"), customFields);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }

    private void buildDataSheet(XSSFWorkbook wb, Sheet sheet,
                                  List<CustomFieldConfiguration> customFields) {
        // Header style — dark blue bg, white bold text
        CellStyle headerStyle = wb.createCellStyle();
        Font headerFont = wb.createFont();
        headerFont.setBold(true);
        headerFont.setColor(IndexedColors.WHITE.getIndex());
        headerStyle.setFont(headerFont);
        headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        headerStyle.setAlignment(HorizontalAlignment.CENTER);
        headerStyle.setBorderBottom(BorderStyle.THIN);
        headerStyle.setBorderTop(BorderStyle.THIN);
        headerStyle.setBorderLeft(BorderStyle.THIN);
        headerStyle.setBorderRight(BorderStyle.THIN);

        // Required column — orange bg
        CellStyle requiredStyle = wb.createCellStyle();
        requiredStyle.cloneStyleFrom(headerStyle);
        requiredStyle.setFillForegroundColor(IndexedColors.ORANGE.getIndex());

        Row headerRow = sheet.createRow(0);
        headerRow.setHeightInPoints(22);

        // Fixed columns
        String[] fixedHeaders   = {"Category Name*", "Parent Category Name", "Enabled (TRUE/FALSE)"};
        boolean[] fixedRequired = {true, false, false};
        for (int i = 0; i < fixedHeaders.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(fixedHeaders[i]);
            cell.setCellStyle(fixedRequired[i] ? requiredStyle : headerStyle);
            sheet.setColumnWidth(i, 28 * 256);
        }

        // Dynamic custom field columns
        for (int i = 0; i < customFields.size(); i++) {
            CustomFieldConfiguration cf = customFields.get(i);
            int colIdx = FIXED_COLS + i;
            Cell cell = headerRow.createCell(colIdx);
            cell.setCellValue(cf.getName() + (Boolean.TRUE.equals(cf.getRequired()) ? "*" : ""));
            cell.setCellStyle(Boolean.TRUE.equals(cf.getRequired()) ? requiredStyle : headerStyle);
            sheet.setColumnWidth(colIdx, 28 * 256);
        }
    }

    private void buildInstructionsSheet(Sheet sheet, List<CustomFieldConfiguration> customFields) {
        List<String> lines = new ArrayList<>();
        lines.add("CATEGORY IMPORT INSTRUCTIONS");
        lines.add("");
        lines.add("Sheet: Categories");
        lines.add("─────────────────────────────────────────────────────────");
        lines.add("Column A — Category Name*");
        lines.add("  Required. The display name of the category. Max 255 characters.");
        lines.add("  A name must be unique within the same parent level.");
        lines.add("");
        lines.add("Column B — Parent Category Name");
        lines.add("  Optional. Leave blank to create a root-level category.");
        lines.add("  Enter the exact name of an existing (or previously imported) parent category.");
        lines.add("");
        lines.add("Column C — Enabled (TRUE/FALSE)");
        lines.add("  Optional. Defaults to TRUE if left blank.");
        lines.add("  Set to FALSE to import as inactive.");

        if (!customFields.isEmpty()) {
            lines.add("");
            lines.add("Custom Fields (columns D onwards)");
            lines.add("─────────────────────────────────────────────────────────");
            char colLetter = 'D';
            for (CustomFieldConfiguration cf : customFields) {
                String req = Boolean.TRUE.equals(cf.getRequired()) ? " (Required)" : " (Optional)";
                lines.add("Column " + colLetter + " — " + cf.getName() + req + " [" + cf.getFieldType() + "]");
                colLetter++;
            }
        }

        lines.add("");
        lines.add("Notes");
        lines.add("─────────────────────────────────────────────────────────");
        lines.add("• Columns marked with * are required.");
        lines.add("• Rows with errors are skipped; successful rows are still saved.");
        lines.add("• Duplicate names at the same level are skipped with a warning.");

        for (int i = 0; i < lines.size(); i++) {
            Row row = sheet.createRow(i);
            row.createCell(0).setCellValue(lines.get(i));
        }
        sheet.setColumnWidth(0, 80 * 256);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Import processing
    // ══════════════════════════════════════════════════════════════════════════

    @Transactional
    public ImportResultDTO importCategories(MultipartFile file, Integer clientId) throws IOException {
        List<CustomFieldConfiguration> customFields =
                customFieldConfigRepository.findAllByClientIdAndModuleAndEnabledTrueOrderByCreateDateTimeDesc(clientId, "c");
        int totalCols = FIXED_COLS + customFields.size();

        String filename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();

        List<String[]> rows;
        if (filename.endsWith(".csv")) {
            rows = parseCsv(file);
        } else {
            rows = parseExcel(file, filename.endsWith(".xls"), totalCols);
        }

        if (rows.isEmpty()) {
            ImportResultDTO empty = new ImportResultDTO();
            empty.setTotalRows(0);
            return empty;
        }

        // Load all existing categories for this client into memory for name→id lookup
        List<Category> existingCategories = categoryRepository.findAllByClientIdOrderByCreateDateTimeDesc(clientId);
        // name (lower) → id map — updated as we save new ones
        Map<String, Integer> nameToId = new LinkedHashMap<>();
        for (Category c : existingCategories) {
            nameToId.put(c.getName().toLowerCase(), c.getId());
        }

        List<ImportRowError> errors = new ArrayList<>();
        int successCount = 0;

        for (int i = 0; i < rows.size(); i++) {
            int rowNumber = i + 2; // 1-based row, row 1 = header
            String[] cols = rows.get(i);

            // ── Extract fields ──────────────────────────────────────────────
            String name       = col(cols, COL_NAME);
            String parentName = col(cols, COL_PARENT);
            String enabledStr = col(cols, COL_ENABLED);

            // ── Validate name ───────────────────────────────────────────────
            if (name.isEmpty()) {
                errors.add(new ImportRowError(rowNumber, "Category Name", "Category Name is required"));
                continue;
            }
            if (name.length() > 255) {
                errors.add(new ImportRowError(rowNumber, "Category Name", "Category Name must not exceed 255 characters"));
                continue;
            }

            // ── Resolve parent ID ───────────────────────────────────────────
            Integer parentId = null;
            if (!parentName.isEmpty()) {
                parentId = nameToId.get(parentName.toLowerCase());
                if (parentId == null) {
                    errors.add(new ImportRowError(rowNumber, "Parent Category Name",
                            "Parent category '" + parentName + "' not found. Make sure it exists or appears earlier in the file."));
                    continue;
                }
            }

            // ── Duplicate check ─────────────────────────────────────────────
            boolean duplicate = categoryRepository.existsByClientIdAndNameAndParentCategoryId(clientId, name, parentId);
            if (duplicate) {
                errors.add(new ImportRowError(rowNumber, "Category Name",
                        "Category '" + name + "' already exists at this level — skipped."));
                continue;
            }

            // ── Parse enabled ───────────────────────────────────────────────
            boolean enabled = true;
            if (!enabledStr.isEmpty()) {
                if (enabledStr.equalsIgnoreCase("false") || enabledStr.equals("0") || enabledStr.equalsIgnoreCase("no")) {
                    enabled = false;
                } else if (!enabledStr.equalsIgnoreCase("true") && !enabledStr.equals("1") && !enabledStr.equalsIgnoreCase("yes")) {
                    errors.add(new ImportRowError(rowNumber, "Enabled",
                            "Enabled must be TRUE or FALSE (got '" + enabledStr + "'). Defaulting to TRUE."));
                    // non-fatal — proceed with default true
                }
            }

            // ── Validate required custom fields before saving ─────────────────
            boolean cfValidationFailed = false;
            for (int cfIdx = 0; cfIdx < customFields.size(); cfIdx++) {
                CustomFieldConfiguration cf = customFields.get(cfIdx);
                if (Boolean.TRUE.equals(cf.getRequired())) {
                    String cfValue = col(cols, FIXED_COLS + cfIdx);
                    if (cfValue.isEmpty()) {
                        errors.add(new ImportRowError(rowNumber, cf.getName(), cf.getName() + " is required"));
                        cfValidationFailed = true;
                    }
                }
            }
            if (cfValidationFailed) continue;

            // ── Save ────────────────────────────────────────────────────────
            try {
                Category category = new Category(clientId, name, parentId);
                category.setEnabled(enabled);
                Category saved = categoryRepository.save(category);
                nameToId.put(saved.getName().toLowerCase(), saved.getId());

                // Save custom field values
                for (int cfIdx = 0; cfIdx < customFields.size(); cfIdx++) {
                    String cfValue = col(cols, FIXED_COLS + cfIdx);
                    if (!cfValue.isEmpty()) {
                        CustomFieldConfiguration cf = customFields.get(cfIdx);
                        SaveCustomFieldValueRequest req = new SaveCustomFieldValueRequest(
                                cf.getId(), (long) saved.getId(), "c", cfValue);
                        try {
                            customFieldValueService.saveCustomFieldValue(req, clientId, null);
                        } catch (Exception ex) {
                            log.warn("Could not save custom field '{}' for category '{}' at row {}: {}",
                                    cf.getName(), name, rowNumber, ex.getMessage());
                        }
                    }
                }

                successCount++;
                log.debug("Imported category '{}' (row {}) for client {}", name, rowNumber, clientId);
            } catch (Exception ex) {
                log.warn("Failed to save category at row {}: {}", rowNumber, ex.getMessage());
                errors.add(new ImportRowError(rowNumber, "Category Name", "Save failed: " + ex.getMessage()));
            }
        }

        ImportResultDTO result = new ImportResultDTO();
        result.setTotalRows(rows.size());
        result.setSuccessCount(successCount);
        result.setFailedCount(errors.size());
        result.setErrors(errors);

        log.info("Category import for client {}: {}/{} rows imported successfully", clientId, successCount, rows.size());
        return result;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Parsers
    // ══════════════════════════════════════════════════════════════════════════

    private List<String[]> parseCsv(MultipartFile file) throws IOException {
        List<String[]> rows = new ArrayList<>();
        try (CSVReader reader = new CSVReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            List<String[]> all = reader.readAll();
            if (all.size() > 1) {
                rows.addAll(all.subList(1, all.size())); // skip header
            }
        } catch (Exception e) {
            throw new IOException("Failed to parse CSV: " + e.getMessage(), e);
        }
        return rows;
    }

    private List<String[]> parseExcel(MultipartFile file, boolean isXls, int totalCols) throws IOException {
        List<String[]> rows = new ArrayList<>();
        try (Workbook workbook = isXls
                ? new HSSFWorkbook(file.getInputStream())
                : new XSSFWorkbook(file.getInputStream())) {

            Sheet sheet = workbook.getSheetAt(0);
            int lastRow = sheet.getLastRowNum();
            DataFormatter formatter = new DataFormatter();

            for (int r = 1; r <= lastRow; r++) { // skip header row 0
                Row row = sheet.getRow(r);
                if (row == null) continue;

                // Skip entirely blank rows
                boolean allBlank = true;
                for (int c = 0; c < totalCols; c++) {
                    Cell cell = row.getCell(c);
                    if (cell != null && !formatter.formatCellValue(cell).trim().isEmpty()) {
                        allBlank = false;
                        break;
                    }
                }
                if (allBlank) continue;

                String[] cols = new String[totalCols];
                for (int c = 0; c < totalCols; c++) {
                    Cell cell = row.getCell(c);
                    cols[c] = cell == null ? "" : formatter.formatCellValue(cell).trim();
                }
                rows.add(cols);
            }
        }
        return rows;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Helpers
    // ══════════════════════════════════════════════════════════════════════════

    private String col(String[] cols, int index) {
        if (cols == null || index >= cols.length || cols[index] == null) return "";
        return cols[index].trim();
    }
}
