package com.elowen.admin.controller;

import com.elowen.admin.dto.ImportResultDTO;
import com.elowen.admin.security.UserPrincipal;
import com.elowen.admin.service.CategoryImportService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/categories/import")
@CrossOrigin(origins = "*")
public class CategoryImportController {

    private static final Logger log = LoggerFactory.getLogger(CategoryImportController.class);

    private final CategoryImportService importService;

    @Autowired
    public CategoryImportController(CategoryImportService importService) {
        this.importService = importService;
    }

    // ── GET /api/admin/categories/import/template ─────────────────────────────

    @GetMapping("/template")
    public ResponseEntity<byte[]> downloadTemplate(@AuthenticationPrincipal UserPrincipal principal) {
        Integer clientId = principal != null ? principal.getClientId() : 1;
        try {
            byte[] templateBytes = importService.generateImportTemplate(clientId);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDisposition(
                    ContentDisposition.attachment()
                            .filename("categories_import_template.xlsx")
                            .build());
            headers.setContentLength(templateBytes.length);

            log.info("Category import template generated ({} bytes)", templateBytes.length);
            return ResponseEntity.ok().headers(headers).body(templateBytes);

        } catch (IOException e) {
            log.error("Failed to generate category import template: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ── POST /api/admin/categories/import ────────────────────────────────────

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> importCategories(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserPrincipal principal) {

        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "No file uploaded. Please attach a file."));
        }

        String filename = file.getOriginalFilename();
        if (filename == null || (!filename.toLowerCase().endsWith(".xlsx")
                && !filename.toLowerCase().endsWith(".xls")
                && !filename.toLowerCase().endsWith(".csv"))) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Unsupported file format. Please upload a .xlsx, .xls, or .csv file."));
        }

        long maxBytes = 50L * 1024 * 1024;
        if (file.getSize() > maxBytes) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "File exceeds the 50 MB size limit."));
        }

        Integer clientId = principal != null ? principal.getClientId() : 1;

        try {
            ImportResultDTO result = importService.importCategories(file, clientId);
            return ResponseEntity.ok(result);
        } catch (IOException e) {
            log.error("Category import IO error for client {}: {}", clientId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to read file: " + e.getMessage()));
        } catch (Exception e) {
            log.error("Category import failed for client {}: {}", clientId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Import failed: " + e.getMessage()));
        }
    }
}
