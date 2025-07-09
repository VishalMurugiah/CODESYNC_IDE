package com.codesync.dto.project;

import java.time.LocalDateTime;
import java.util.List;

public class ProjectResponse {
    
    private Long id;
    private String name;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<FileInfo> files;
    private List<UserInfo> collaborators;
    
    public ProjectResponse() {}
    
    public ProjectResponse(Long id, String name, String description, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
    
    // Inner classes for nested data
    public static class FileInfo {
        private Long id;
        private String name;
        private String filePath;
        private String language;
        
        public FileInfo() {}
        
        public FileInfo(Long id, String name, String filePath, String language) {
            this.id = id;
            this.name = name;
            this.filePath = filePath;
            this.language = language;
        }
        
        // Getters and Setters
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getFilePath() { return filePath; }
        public void setFilePath(String filePath) { this.filePath = filePath; }
        public String getLanguage() { return language; }
        public void setLanguage(String language) { this.language = language; }
    }
    
    public static class UserInfo {
        private Long id;
        private String username;
        private String fullName;
        private String permission;
        
        public UserInfo() {}
        
        public UserInfo(Long id, String username, String fullName, String permission) {
            this.id = id;
            this.username = username;
            this.fullName = fullName;
            this.permission = permission;
        }
        
        // Getters and Setters
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getFullName() { return fullName; }
        public void setFullName(String fullName) { this.fullName = fullName; }
        public String getPermission() { return permission; }
        public void setPermission(String permission) { this.permission = permission; }
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
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
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
    
    public List<FileInfo> getFiles() {
        return files;
    }
    
    public void setFiles(List<FileInfo> files) {
        this.files = files;
    }
    
    public List<UserInfo> getCollaborators() {
        return collaborators;
    }
    
    public void setCollaborators(List<UserInfo> collaborators) {
        this.collaborators = collaborators;
    }
}