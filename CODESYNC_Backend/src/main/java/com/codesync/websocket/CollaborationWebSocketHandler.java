package com.codesync.websocket;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.WebSocketMessage;
import org.springframework.web.socket.WebSocketSession;

import com.fasterxml.jackson.databind.ObjectMapper;

@Component
public class CollaborationWebSocketHandler implements WebSocketHandler {
    
    private static final Logger log = LoggerFactory.getLogger(CollaborationWebSocketHandler.class);
    
    private final ObjectMapper objectMapper;
    private final Map<String, Set<WebSocketSession>> projectSessions = new ConcurrentHashMap<>();
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    
    public CollaborationWebSocketHandler() {
        this.objectMapper = new ObjectMapper();
    }
    
    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        log.info("WebSocket connection established: {}", session.getId());
        
        String projectId = getProjectIdFromSession(session);
        String userId = getUserIdFromSession(session);
        String userName = getUserNameFromSession(session);
        
        if (projectId == null) {
            log.error("Project ID is null for session: {}", session.getId());
            session.close(CloseStatus.BAD_DATA.withReason("Missing project ID"));
            return;
        }
        
        sessions.put(session.getId(), session);
        projectSessions.computeIfAbsent(projectId, k -> new CopyOnWriteArraySet<>()).add(session);
        log.info("User joined project: {} with session: {} (userId: {}, userName: {})", projectId, session.getId(), userId, userName);
        
        // First, send existing users to the new user
        Set<WebSocketSession> existingSessions = projectSessions.get(projectId);
        if (existingSessions != null && existingSessions.size() > 1) {
            log.info("*** SENDING EXISTING USERS TO NEW USER *** Total sessions: {}", existingSessions.size());
            
            for (WebSocketSession existingSession : existingSessions) {
                if (!existingSession.getId().equals(session.getId())) {
                    String existingUserId = getUserIdFromSession(existingSession);
                    String existingUserName = getUserNameFromSession(existingSession);
                    
                    log.info("*** EXISTING USER FOUND: ID={}, Name={} ***", existingUserId, existingUserName);
                    
                    if (existingUserId != null && existingUserName != null) {
                        // Create existing user data
                        Map<String, Object> existingUserData = new HashMap<>();
                        existingUserData.put("id", Integer.parseInt(existingUserId));
                        existingUserData.put("name", existingUserName);
                        existingUserData.put("fullName", existingUserName);
                        existingUserData.put("userName", existingUserName);
                        existingUserData.put("color", generateUserColor(existingUserId));
                        
                        // Send existing user info to new user
                        CollaborationMessage existingUserMessage = new CollaborationMessage();
                        existingUserMessage.setType("user_joined");
                        existingUserMessage.setProjectId(projectId);
                        existingUserMessage.setUserId(existingUserId);
                        existingUserMessage.setContent("User joined the collaboration");
                        existingUserMessage.setTimestamp(System.currentTimeMillis());
                        
                        Map<String, Object> existingMessageData = new HashMap<>();
                        existingMessageData.put("user", existingUserData);
                        existingUserMessage.setData(existingMessageData);
                        
                        // Send only to the new user
                        try {
                            String messageJson = objectMapper.writeValueAsString(existingUserMessage);
                            session.sendMessage(new TextMessage(messageJson));
                            log.info("*** SENT EXISTING USER {} TO NEW USER {} ***", existingUserName, userName);
                        } catch (Exception e) {
                            log.error("Error sending existing user to new user", e);
                        }
                    }
                }
            }
        }
        
        // Send user_joined message with full user data for the new user
        CollaborationMessage welcomeMessage = new CollaborationMessage();
        welcomeMessage.setType("user_joined");
        welcomeMessage.setProjectId(projectId);
        welcomeMessage.setUserId(userId);
        welcomeMessage.setContent("User joined the collaboration");
        welcomeMessage.setTimestamp(System.currentTimeMillis());
        
        // Create user object with all necessary data
        Map<String, Object> userData = new HashMap<>();
        userData.put("id", Integer.parseInt(userId)); // Convert to number to match frontend
        userData.put("name", userName);
        userData.put("fullName", userName);
        userData.put("userName", userName);
        userData.put("color", generateUserColor(userId));
        
        // Debug the user data being created
        log.info("Created user data: {}", userData);
        
        Map<String, Object> messageData = new HashMap<>();
        messageData.put("user", userData);
        welcomeMessage.setData(messageData);
        
        // Debug log the message being sent
        log.info("Sending user_joined message: {}", welcomeMessage);
        log.info("User data: {}", userData);
        
        // Broadcast to all users in the project (including self for initial user list)
        broadcastToProject(projectId, welcomeMessage, null); // Don't exclude anyone
    }
    
    @Override
    public void handleMessage(WebSocketSession session, WebSocketMessage<?> message) throws Exception {
        if (message instanceof TextMessage) {
            String payload = ((TextMessage) message).getPayload();
            @SuppressWarnings("unchecked")
            Map<String, Object> messageData = objectMapper.readValue(payload, Map.class);
            
            String type = (String) messageData.get("type");
            String projectId = getProjectIdFromSession(session);
            
            switch (type) {
                case "code_change":
                    handleCodeChange(session, messageData, projectId);
                    break;
                case "cursor_position":
                    handleCursorPosition(session, messageData, projectId);
                    break;
                case "file_selection":
                    handleFileSelection(session, messageData, projectId);
                    break;
                case "user_typing":
                    handleUserTyping(session, messageData, projectId);
                    break;
                case "file_saved":
                    handleFileSaved(session, messageData, projectId);
                    break;
                case "chat_message":
                    handleChatMessage(session, messageData, projectId);
                    break;
                default:
                    log.warn("Unknown message type: {}", type);
            }
        }
    }
    
    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        log.error("WebSocket transport error for session: {}", session.getId(), exception);
    }
    
    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus closeStatus) throws Exception {
        log.info("WebSocket connection closed: {} with status: {}", session.getId(), closeStatus);
        
        String projectId = getProjectIdFromSession(session);
        sessions.remove(session.getId());
        if (projectId != null) {
            Set<WebSocketSession> projectSessionSet = projectSessions.get(projectId);
            if (projectSessionSet != null) {
                projectSessionSet.remove(session);
                if (projectSessionSet.isEmpty()) {
                    projectSessions.remove(projectId);
                }
                
                // Notify other users that this user left
                CollaborationMessage leaveMessage = new CollaborationMessage();
                leaveMessage.setType("user_left");
                leaveMessage.setProjectId(projectId);
                leaveMessage.setUserId(getUserIdFromSession(session));
                leaveMessage.setContent("User left the collaboration");
                leaveMessage.setTimestamp(System.currentTimeMillis());
                
                broadcastToProject(projectId, leaveMessage, session.getId());
            }
        }
    }
    
    @Override
    public boolean supportsPartialMessages() {
        return false;
    }
    
    private void handleCodeChange(WebSocketSession session, Map<String, Object> messageData, String projectId) {
        log.debug("Handling code change for project: {}", projectId);
        // Broadcast code changes to all users in the same project except sender
        broadcastToProject(projectId, messageData, session.getId());
    }
    
    private void handleCursorPosition(WebSocketSession session, Map<String, Object> messageData, String projectId) {
        // Broadcast cursor position to all users in the same project except sender
        broadcastToProject(projectId, messageData, session.getId());
    }
    
    private void handleFileSelection(WebSocketSession session, Map<String, Object> messageData, String projectId) {
        // Broadcast file selection to all users in the same project except sender
        broadcastToProject(projectId, messageData, session.getId());
    }
    
    private void handleUserTyping(WebSocketSession session, Map<String, Object> messageData, String projectId) {
        // Broadcast user typing to all users in the same project except sender
        broadcastToProject(projectId, messageData, session.getId());
    }
    
    private void handleFileSaved(WebSocketSession session, Map<String, Object> messageData, String projectId) {
        log.debug("Handling file saved for project: {}", projectId);
        // Broadcast file saved event to all users in the same project except sender
        broadcastToProject(projectId, messageData, session.getId());
    }
    
    private void handleChatMessage(WebSocketSession session, Map<String, Object> messageData, String projectId) {
        log.debug("Handling chat message for project: {}", projectId);
        // Broadcast chat message to all users in the same project except sender
        broadcastToProject(projectId, messageData, session.getId());
    }
    
    private void broadcastToProject(String projectId, Map<String, Object> message, String excludeSessionId) {
        Set<WebSocketSession> currentProjectSessions = projectSessions.get(projectId);
        if (currentProjectSessions != null) {
            String messageJson;
            try {
                messageJson = objectMapper.writeValueAsString(message);
            } catch (Exception e) {
                log.error("Error serializing message", e);
                return;
            }
            
            currentProjectSessions.parallelStream()
                    .filter(session -> !session.getId().equals(excludeSessionId))
                    .filter(WebSocketSession::isOpen)
                    .forEach(session -> {
                        try {
                            session.sendMessage(new TextMessage(messageJson));
                        } catch (Exception e) {
                            log.error("Error sending message to session: {}", session.getId(), e);
                        }
                    });
        }
    }
    
    private void broadcastToProject(String projectId, CollaborationMessage message, String excludeSessionId) {
        Set<WebSocketSession> currentProjectSessions = projectSessions.get(projectId);
        log.info("Broadcasting message type '{}' to project {} with {} sessions", message.getType(), projectId, 
                currentProjectSessions != null ? currentProjectSessions.size() : 0);
        
        if (currentProjectSessions != null) {
            String messageJson;
            try {
                messageJson = objectMapper.writeValueAsString(message);
                log.info("Message JSON: {}", messageJson);
            } catch (Exception e) {
                log.error("Error serializing message", e);
                return;
            }
            
            currentProjectSessions.parallelStream()
                    .filter(session -> excludeSessionId == null || !session.getId().equals(excludeSessionId))
                    .filter(WebSocketSession::isOpen)
                    .forEach(session -> {
                        try {
                            log.info("Sending message to session: {}", session.getId());
                            session.sendMessage(new TextMessage(messageJson));
                        } catch (Exception e) {
                            log.error("Error sending message to session: {}", session.getId(), e);
                        }
                    });
        }
    }
    
    private String getProjectIdFromSession(WebSocketSession session) {
        // Extract project ID from session attributes or URI parameters
        Object projectId = session.getAttributes().get("projectId");
        if (projectId != null) {
            return projectId.toString();
        }
        
        // Fallback: try to extract from URI path (e.g., /ws/collaboration/1)
        if (session.getUri() != null) {
            String uri = session.getUri().toString();
            
            // First try query parameter
            if (uri.contains("projectId=")) {
                int start = uri.indexOf("projectId=") + 10;
                int end = uri.indexOf("&", start);
                if (end == -1) end = uri.length();
                return uri.substring(start, end);
            }
            
            // Then try to extract from path (e.g., /ws/collaboration/1)
            if (uri.contains("/ws/collaboration/")) {
                int start = uri.lastIndexOf("/ws/collaboration/") + 18;
                int end = uri.indexOf("?", start);
                if (end == -1) end = uri.length();
                String pathSegment = uri.substring(start, end);
                if (!pathSegment.isEmpty() && pathSegment.matches("\\d+")) {
                    return pathSegment;
                }
            }
        }
        
        return "1"; // Default project ID if not found
    }
    
    private String getUserIdFromSession(WebSocketSession session) {
        Object userId = session.getAttributes().get("userId");
        if (userId != null) {
            return userId.toString();
        }
        
        // Fallback: try to extract from URI query parameters
        if (session.getUri() != null) {
            String uri = session.getUri().toString();
            if (uri.contains("userId=")) {
                int start = uri.indexOf("userId=") + 7;
                int end = uri.indexOf("&", start);
                if (end == -1) end = uri.length();
                return uri.substring(start, end);
            }
        }
        
        return "anonymous";
    }
    
    private String getUserNameFromSession(WebSocketSession session) {
        Object userName = session.getAttributes().get("userName");
        if (userName != null) {
            return userName.toString();
        }
        
        // Fallback: try to extract from URI query parameters
        if (session.getUri() != null) {
            String uri = session.getUri().toString();
            if (uri.contains("userName=")) {
                int start = uri.indexOf("userName=") + 9;
                int end = uri.indexOf("&", start);
                if (end == -1) end = uri.length();
                try {
                    return java.net.URLDecoder.decode(uri.substring(start, end), "UTF-8");
                } catch (Exception e) {
                    log.error("Error decoding userName from URI", e);
                }
            }
        }
        
        return "Anonymous";
    }
    
    private String generateUserColor(String userId) {
        // Generate a consistent color based on user ID
        String[] colors = {
            "#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", 
            "#06b6d4", "#ec4899", "#10b981", "#f97316", "#6366f1"
        };
        int index = Math.abs(userId.hashCode()) % colors.length;
        return colors[index];
    }
    
    // Message class for collaboration
    public static class CollaborationMessage {
        private String type;
        private String projectId;
        private String fileId;
        private String userId;
        private String content;
        private Object data;
        private long timestamp;
        
        // Getters and setters
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        
        public String getProjectId() { return projectId; }
        public void setProjectId(String projectId) { this.projectId = projectId; }
        
        public String getFileId() { return fileId; }
        public void setFileId(String fileId) { this.fileId = fileId; }
        
        public String getUserId() { return userId; }
        public void setUserId(String userId) { this.userId = userId; }
        
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        
        public Object getData() { return data; }
        public void setData(Object data) { this.data = data; }
        
        public long getTimestamp() { return timestamp; }
        public void setTimestamp(long timestamp) { this.timestamp = timestamp; }
    }
}
