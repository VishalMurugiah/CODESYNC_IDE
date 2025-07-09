package com.codesync.dto.file;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class CreateFileRequest {
    
    @NotBlank(message = "File name is required")
    private String name;
    
    private String filePath;
    
    private String content = "";
    
    private String language;
    
    @NotNull(message = "Project ID is required")
    private Long projectId;
    
    public CreateFileRequest() {}
    
    public CreateFileRequest(String name, String filePath, String content, String language, Long projectId) {
        this.name = name;
        this.filePath = filePath;
        this.content = content;
        this.language = language;
        this.projectId = projectId;
    }
    
    // Getters and Setters
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public String getFilePath() {
        return filePath;
    }
    
    public void setFilePath(String filePath) {
        this.filePath = filePath;
    }
    
    public String getContent() {
        return content;
    }
    
    public void setContent(String content) {
        this.content = content;
    }
    
    public String getLanguage() {
        return language;
    }
    
    public void setLanguage(String language) {
        this.language = language;
    }
    
    public Long getProjectId() {
        return projectId;
    }
    
    public void setProjectId(Long projectId) {
        this.projectId = projectId;
    }
}