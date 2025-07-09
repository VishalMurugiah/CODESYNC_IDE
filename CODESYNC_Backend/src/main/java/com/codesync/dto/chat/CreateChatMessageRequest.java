package com.codesync.dto.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class CreateChatMessageRequest {
    
    @NotNull(message = "Project ID is required")
    private Long projectId;
    
    @NotBlank(message = "Content is required")
    private String content;
    
    private String messageType = "TEXT";
    
    public CreateChatMessageRequest() {}
    
    public CreateChatMessageRequest(Long projectId, String content, String messageType) {
        this.projectId = projectId;
        this.content = content;
        this.messageType = messageType;
    }
    
    // Getters and Setters
    public Long getProjectId() {
        return projectId;
    }
    
    public void setProjectId(Long projectId) {
        this.projectId = projectId;
    }
    
    public String getContent() {
        return content;
    }
    
    public void setContent(String content) {
        this.content = content;
    }
    
    public String getMessageType() {
        return messageType;
    }
    
    public void setMessageType(String messageType) {
        this.messageType = messageType;
    }
}
