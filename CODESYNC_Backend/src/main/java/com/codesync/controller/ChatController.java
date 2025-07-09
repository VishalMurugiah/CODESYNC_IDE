package com.codesync.controller;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.codesync.dto.chat.ChatMessageDto;
import com.codesync.dto.chat.CreateChatMessageRequest;
import com.codesync.entity.User;
import com.codesync.service.ChatService;
import com.codesync.service.UserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "http://localhost:3000")
public class ChatController {
    
    private static final Logger log = LoggerFactory.getLogger(ChatController.class);
    
    @Autowired
    private ChatService chatService;
    
    @Autowired
    private UserService userService;
    
    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate;
    
    /**
     * Send a new chat message
     */
    @PostMapping("/messages")
    public ResponseEntity<ChatMessageDto> sendMessage(
            @Valid @RequestBody CreateChatMessageRequest request,
            Authentication authentication) {
        
        try {
            User user = userService.getUserByEmail(authentication.getName())  // Changed from getUserByUsername to getUserByEmail
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            ChatMessageDto message = chatService.createMessage(request, user.getId());
            
            // Broadcast the message to all connected clients in the project
            if (messagingTemplate != null) {
                messagingTemplate.convertAndSend(
                    "/topic/project/" + request.getProjectId() + "/chat",
                    message
                );
            }
            
            log.info("Chat message sent successfully by user {} to project {}", user.getId(), request.getProjectId());
            return ResponseEntity.ok(message);
            
        } catch (Exception e) {
            log.error("Error sending chat message", e);
            return ResponseEntity.status(500).build();
        }
    }
    
    /**
     * Get chat messages for a project
     */
    @GetMapping("/projects/{projectId}/messages")
    public ResponseEntity<List<ChatMessageDto>> getProjectMessages(
            @PathVariable Long projectId,
            @RequestParam(defaultValue = "50") int limit,
            Authentication authentication) {
        
        try {
            // Verify user exists
            userService.getUserByEmail(authentication.getName())  // Changed from getUserByUsername to getUserByEmail
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            List<ChatMessageDto> messages;
            if (limit > 0) {
                messages = chatService.getRecentProjectMessages(projectId, limit);
            } else {
                messages = chatService.getProjectMessages(projectId);
            }
            
            return ResponseEntity.ok(messages);
            
        } catch (Exception e) {
            log.error("Error fetching chat messages for project {}", projectId, e);
            return ResponseEntity.status(500).build();
        }
    }
    
    /**
     * Get message count for a project
     */
    @GetMapping("/projects/{projectId}/count")
    public ResponseEntity<Long> getProjectMessageCount(
            @PathVariable Long projectId,
            Authentication authentication) {
        
        try {
            // Verify user exists
            userService.getUserByEmail(authentication.getName())  // Changed from getUserByUsername to getUserByEmail
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            long count = chatService.getProjectMessageCount(projectId);
            return ResponseEntity.ok(count);
            
        } catch (Exception e) {
            log.error("Error fetching message count for project {}", projectId, e);
            return ResponseEntity.status(500).build();
        }
    }
}
