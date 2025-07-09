package com.codesync.dto.file;

import java.time.LocalDateTime;

public class FileResponse {
    
    private Long id;
    private String name;
    private String filePath;
    private String content;
    private String language;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long projectId;
    
    public FileResponse() {}
    
    public FileResponse(Long id, String name, String filePath, String content, String language, 
                       LocalDateTime createdAt, LocalDateTime updatedAt, Long projectId) {
        this.id = id;
        this.name = name;
        this.filePath = filePath;
        this.content = content;
        this.language = language;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.projectId = projectId;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
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
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
    
    public Long getProjectId() {
        return projectId;
    }
    
    public void setProjectId(Long projectId) {
        this.projectId = projectId;
    }
}