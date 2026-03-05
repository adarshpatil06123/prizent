package com.elowen.product.util;

import com.elowen.product.dto.ImportRowDTO;
import com.elowen.product.dto.ImportRowError;
import com.opencsv.CSVReader;
import com.opencsv.exceptions.CsvException;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.*;

/**
 * Utility for parsing product import files (.xlsx / .xls / .csv).
 *
 * <p>Standard column headers expected in the file (row 1):
 * <pre>
 *   Product Name*  |  Product Number  |  Style Code  |  SKU Code*  |  Brand ID*  |  Category ID*  |  MRP  |
 *   Product Cost   |  Proposed Selling Price (Sales)  |  Proposed Selling Price (Non-Sales)  |
 *   Enabled (true/false)  |  Marketplace IDs (comma-sep)  |
 *   CF:&lt;CustomFieldName&gt;  ...
 * </pre>
 *
 * <p>Columns prefixed with <code>CF:</code> are treated as dynamic custom fields.
 */
@Component
public class ExcelParserUtil {

    private static final Logger log = LoggerFactory.getLogger(ExcelParserUtil.class);

    // ── Standard header constants ─────────────────────────────────────────────

    public static final String COL_PRODUCT_NAME      = "Product Name*";
    public static final String COL_PRODUCT_NUMBER     = "Product Number";
    public static final String COL_STYLE_CODE         = "Style Code";
    public static final String COL_SKU_CODE           = "SKU Code*";
    public static final String COL_BRAND_NAME         = "Brand Name*";
    public static final String COL_CATEGORY_NAME      = "Category Name*";
    public static final String COL_MRP                = "MRP";
    public static final String COL_PRODUCT_COST       = "Product Cost";
    public static final String COL_PSP_SALES          = "Proposed Selling Price (Sales)";
    public static final String COL_PSP_NON_SALES      = "Proposed Selling Price (Non-Sales)";
    public static final String COL_ENABLED            = "Enabled (true/false)";
    public static final String COL_MARKETPLACE_NAMES  = "Marketplace Names (comma-sep)";

    public static final List<String> STANDARD_HEADERS = List.of(
            COL_PRODUCT_NAME, COL_PRODUCT_NUMBER, COL_STYLE_CODE,
            COL_SKU_CODE, COL_BRAND_NAME, COL_CATEGORY_NAME,
            COL_MRP, COL_PRODUCT_COST, COL_PSP_SALES, COL_PSP_NON_SALES,
            COL_ENABLED, COL_MARKETPLACE_NAMES
    );

    public static final String CF_PREFIX = "CF:";

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Result of parsing a file.
     */
    public static class ParseResult {
        private final List<ImportRowDTO>   rows   = new ArrayList<>();
        private final List<ImportRowError> errors = new ArrayList<>();

        public List<ImportRowDTO>   getRows()   { return rows;   }
        public List<ImportRowError> getErrors() { return errors; }

        void addRow(ImportRowDTO row)       { rows.add(row);     }
        void addError(ImportRowError error) { errors.add(error); }
    }

    /**
     * Detect format from filename and delegate to the appropriate parser.
     */
    public ParseResult parseFile(MultipartFile file) throws IOException {
        String filename = Objects.requireNonNullElse(file.getOriginalFilename(), "").toLowerCase();
        if (filename.endsWith(".xlsx")) {
            return parseXlsx(file);
        } else if (filename.endsWith(".xls")) {
            return parseXls(file);
        } else if (filename.endsWith(".csv")) {
            return parseCsv(file);
        } else {
            throw new IllegalArgumentException(
                    "Unsupported file format. Please upload a .xlsx, .xls, or .csv file.");
        }
    }

    // ── XLSX ──────────────────────────────────────────────────────────────────

    private ParseResult parseXlsx(MultipartFile file) throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            return parseSheet(sheet);
        }
    }

    // ── XLS ───────────────────────────────────────────────────────────────────

    private ParseResult parseXls(MultipartFile file) throws IOException {
        try (HSSFWorkbook workbook = new HSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            return parseSheet(sheet);
        }
    }

    // ── Generic POI sheet parser (xlsx + xls) ────────────────────────────────

    private ParseResult parseSheet(Sheet sheet) {
        ParseResult result = new ParseResult();

        // Read header row (row 0)
        Row headerRow = sheet.getRow(0);
        if (headerRow == null) {
            result.addError(new ImportRowError(1, "Header", "File is empty or missing header row"));
            return result;
        }

        Map<Integer, String> colIndexToName = readHeaderMap(headerRow);
        if (colIndexToName.isEmpty()) {
            result.addError(new ImportRowError(1, "Header", "No columns detected in header row"));
            return result;
        }

        // Validate required standard headers are present
        Set<String> presentCols = new HashSet<>(colIndexToName.values());
        for (String required : List.of(COL_PRODUCT_NAME, COL_SKU_CODE, COL_BRAND_NAME,
                COL_CATEGORY_NAME)) {
            if (!presentCols.contains(required)) {
                result.addError(new ImportRowError(1, "Header",
                        "Required column missing: '" + required + "'"));
            }
        }
        if (!result.getErrors().isEmpty()) return result;

        // Parse data rows (row 1 onwards)
        int lastRowNum = sheet.getLastRowNum();
        for (int ri = 1; ri <= lastRowNum; ri++) {
            Row row = sheet.getRow(ri);
            if (row == null || isRowEmpty(row)) continue;

            // Convert cells to a header-keyed map
            Map<String, String> cellValues = new LinkedHashMap<>();
            for (Map.Entry<Integer, String> entry : colIndexToName.entrySet()) {
                Cell cell = row.getCell(entry.getKey(), Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
                cellValues.put(entry.getValue(), getCellStringValue(cell));
            }

            // 1-based for user display: data starts at Excel row 2
            int excelRowNum = ri + 1;
            parseRowData(excelRowNum, cellValues, result);
        }

        return result;
    }

    // ── CSV ───────────────────────────────────────────────────────────────────

    private ParseResult parseCsv(MultipartFile file) throws IOException {
        ParseResult result = new ParseResult();

        try (CSVReader csvReader = new CSVReader(
                new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8)))) {

            List<String[]> allRows;
            try {
                allRows = csvReader.readAll();
            } catch (CsvException e) {
                result.addError(new ImportRowError(0, "CSV", "Failed to parse CSV: " + e.getMessage()));
                return result;
            }

            if (allRows.isEmpty()) {
                result.addError(new ImportRowError(1, "Header", "File is empty"));
                return result;
            }

            // Build header map from first row
            String[] headers = allRows.get(0);
            Map<Integer, String> colIndexToName = new LinkedHashMap<>();
            for (int i = 0; i < headers.length; i++) {
                String h = headers[i] == null ? "" : headers[i].trim();
                if (!h.isEmpty()) colIndexToName.put(i, h);
            }

            // Parse data rows
            for (int ri = 1; ri < allRows.size(); ri++) {
                String[] cells = allRows.get(ri);
                if (isArrayBlank(cells)) continue;

                Map<String, String> cellValues = new LinkedHashMap<>();
                for (Map.Entry<Integer, String> entry : colIndexToName.entrySet()) {
                    String value = entry.getKey() < cells.length ? cells[entry.getKey()] : "";
                    cellValues.put(entry.getValue(), value == null ? "" : value.trim());
                }

                int excelRowNum = ri + 1;
                parseRowData(excelRowNum, cellValues, result);
            }
        }

        return result;
    }

    // ── Row mapping ───────────────────────────────────────────────────────────

    /**
     * Parse one row's cell map into an {@link ImportRowDTO} and add to result.
     * Parse errors are recorded in {@code result.errors}.
     */
    private void parseRowData(int rowNum, Map<String, String> cells, ParseResult result) {
        ImportRowDTO dto = new ImportRowDTO(rowNum);
        List<ImportRowError> parseErrors = new ArrayList<>();

        dto.setName(cells.getOrDefault(COL_PRODUCT_NAME, "").trim());
        dto.setProductNumber(cells.getOrDefault(COL_PRODUCT_NUMBER, "").trim());
        dto.setStyleCode(cells.getOrDefault(COL_STYLE_CODE, "").trim());
        dto.setSkuCode(cells.getOrDefault(COL_SKU_CODE, "").trim());

        // Brand Name (resolved to ID later in ProductImportService)
        dto.setBrandName(cells.getOrDefault(COL_BRAND_NAME, "").trim());

        // Category Name (resolved to ID later in ProductImportService)
        dto.setCategoryName(cells.getOrDefault(COL_CATEGORY_NAME, "").trim());

        // Prices
        dto.setMrp(parseBigDecimal(rowNum, COL_MRP,
                cells.getOrDefault(COL_MRP, "0"), parseErrors));
        dto.setProductCost(parseBigDecimal(rowNum, COL_PRODUCT_COST,
                cells.getOrDefault(COL_PRODUCT_COST, "0"), parseErrors));
        dto.setProposedSellingPriceSales(parseBigDecimal(rowNum, COL_PSP_SALES,
                cells.getOrDefault(COL_PSP_SALES, "0"), parseErrors));
        dto.setProposedSellingPriceNonSales(parseBigDecimal(rowNum, COL_PSP_NON_SALES,
                cells.getOrDefault(COL_PSP_NON_SALES, "0"), parseErrors));

        // Enabled
        String enabledStr = cells.getOrDefault(COL_ENABLED, "true").trim().toLowerCase();
        dto.setEnabled(!"false".equals(enabledStr));

        // Marketplace Names (comma-separated) — resolved to IDs later
        String mpStr = cells.getOrDefault(COL_MARKETPLACE_NAMES, "").trim();
        if (!mpStr.isEmpty()) {
            List<String> mpNames = new ArrayList<>();
            for (String part : mpStr.split(",")) {
                String trimmed = part.trim();
                if (!trimmed.isEmpty()) {
                    mpNames.add(trimmed);
                }
            }
            dto.setMarketplaceNames(mpNames);
        }

        // Dynamic custom fields: any column starting with "CF:"
        Map<String, String> cfValues = new HashMap<>();
        for (Map.Entry<String, String> entry : cells.entrySet()) {
            if (entry.getKey().startsWith(CF_PREFIX)) {
                String fieldName = entry.getKey().substring(CF_PREFIX.length()).trim();
                String value = entry.getValue() != null ? entry.getValue().trim() : "";
                if (!fieldName.isEmpty() && !value.isEmpty()) {
                    cfValues.put(fieldName, value);
                }
            }
        }
        dto.setCustomFieldValues(cfValues);

        // Accumulate parse errors but still add the row (validator will re-check required fields)
        parseErrors.forEach(result::addError);
        result.addRow(dto);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Map<Integer, String> readHeaderMap(Row headerRow) {
        Map<Integer, String> map = new LinkedHashMap<>();
        for (int ci = 0; ci < headerRow.getLastCellNum(); ci++) {
            Cell cell = headerRow.getCell(ci);
            if (cell != null) {
                String header = getCellStringValue(cell).trim();
                if (!header.isEmpty()) map.put(ci, header);
            }
        }
        return map;
    }

    /**
     * Extract a string representation from any POI {@link Cell} type.
     */
    private String getCellStringValue(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING  -> cell.getStringCellValue().trim();
            case NUMERIC -> {
                if (DateUtil.isCellDateFormatted(cell)) {
                    yield cell.getLocalDateTimeCellValue().toString();
                }
                double num = cell.getNumericCellValue();
                // Avoid ".0" suffix for integer-valued cells
                if (num == Math.floor(num) && !Double.isInfinite(num)) {
                    yield String.valueOf((long) num);
                }
                yield String.valueOf(num);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> {
                try {
                    yield switch (cell.getCachedFormulaResultType()) {
                        case NUMERIC -> {
                            double num = cell.getNumericCellValue();
                            yield (num == Math.floor(num) && !Double.isInfinite(num))
                                    ? String.valueOf((long) num)
                                    : String.valueOf(num);
                        }
                        case STRING  -> cell.getStringCellValue();
                        case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
                        default -> "";
                    };
                } catch (Exception e) {
                    yield "";
                }
            }
            default -> "";
        };
    }

    private Long parseLong(int row, String field, String value, List<ImportRowError> errors) {
        String trimmed = value == null ? "" : value.trim();
        if (trimmed.isEmpty()) return null;
        try {
            return Long.parseLong(trimmed);
        } catch (NumberFormatException e) {
            errors.add(new ImportRowError(row, field, "Invalid numeric value for " + field + ": '" + trimmed + "'"));
            return null;
        }
    }

    private BigDecimal parseBigDecimal(int row, String field, String value, List<ImportRowError> errors) {
        String trimmed = value == null ? "" : value.trim();
        if (trimmed.isEmpty()) return BigDecimal.ZERO;
        try {
            return new BigDecimal(trimmed);
        } catch (NumberFormatException e) {
            errors.add(new ImportRowError(row, field, "Invalid decimal value for " + field + ": '" + trimmed + "'"));
            return BigDecimal.ZERO;
        }
    }

    private boolean isRowEmpty(Row row) {
        for (int ci = row.getFirstCellNum(); ci < row.getLastCellNum(); ci++) {
            Cell cell = row.getCell(ci);
            if (cell != null && cell.getCellType() != CellType.BLANK) {
                String v = getCellStringValue(cell);
                if (!v.isEmpty()) return false;
            }
        }
        return true;
    }

    private boolean isArrayBlank(String[] arr) {
        if (arr == null) return true;
        for (String s : arr) {
            if (s != null && !s.trim().isEmpty()) return false;
        }
        return true;
    }
}
