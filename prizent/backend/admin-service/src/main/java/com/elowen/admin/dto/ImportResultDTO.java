package com.elowen.admin.dto;

import java.util.ArrayList;
import java.util.List;

public class ImportResultDTO {

    private int totalRows;
    private int successCount;
    private int failedCount;
    private List<ImportRowError> errors = new ArrayList<>();

    public ImportResultDTO() {}

    public ImportResultDTO(int totalRows, int successCount, int failedCount, List<ImportRowError> errors) {
        this.totalRows = totalRows;
        this.successCount = successCount;
        this.failedCount = failedCount;
        this.errors = errors;
    }

    public int getTotalRows() { return totalRows; }
    public void setTotalRows(int totalRows) { this.totalRows = totalRows; }

    public int getSuccessCount() { return successCount; }
    public void setSuccessCount(int successCount) { this.successCount = successCount; }

    public int getFailedCount() { return failedCount; }
    public void setFailedCount(int failedCount) { this.failedCount = failedCount; }

    public List<ImportRowError> getErrors() { return errors; }
    public void setErrors(List<ImportRowError> errors) { this.errors = errors; }
}
