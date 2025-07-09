package com.codesync.dto.chat;

import java.time.LocalDateTime;

import com.codesync.entity.ChatMessage;

public class ChatMessageDto {
    private Long id;
    private Long projectId;
    private Long userId;
    private String userName;
    private String userFullName;
    private String content;
    private String messageType;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    public ChatMessageDto() {}
    
    public ChatMessageDto(ChatMessage chatMessage) {
        this.id = chatMessage.getId();
        this.projectId = chatMessage.getProject().getId();
        this.userId = chatMessage.getUser().getId();
        this.userName = chatMessage.getUser().getUsername();
        this.userFullName = chatMessage.getUser().getFullName();
        this.content = chatMessage.getContent();
        this.messageType = chatMessage.getMessageType().name();
        this.createdAt = chatMessage.getCreatedAt();
        this.updatedAt = chatMessage.getUpdatedAt();
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public Long getProjectId() {
        return projectId;
    }
    
    public void setProjectId(Long projectId) {
        this.projectId = projectId;
    }
    
    public Long getUserId() {
        return userId;
    }
    
    public void setUserId(Long userId) {
        this.userId = userId;
    }
    
    public String getUserName() {
        return userName;
    }
    
    public void setUserName(String userName) {
        this.userName = userName;
    }
    
    public String getUserFullName() {
        return userFullName;
    }
    
    public void setUserFullName(String userFullName) {
        this.userFullName = userFullName;
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
}
