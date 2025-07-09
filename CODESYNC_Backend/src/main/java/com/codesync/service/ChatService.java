package com.codesync.service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.codesync.dto.chat.ChatMessageDto;
import com.codesync.dto.chat.CreateChatMessageRequest;
import com.codesync.entity.ChatMessage;
import com.codesync.entity.Project;
import com.codesync.entity.User;
import com.codesync.repository.ChatMessageRepository;
import com.codesync.repository.ProjectRepository;
import com.codesync.repository.UserRepository;

@Service
@Transactional
public class ChatService {
    
    private static final Logger log = LoggerFactory.getLogger(ChatService.class);
    
    @Autowired
    private ChatMessageRepository chatMessageRepository;
    
    @Autowired
    private ProjectRepository projectRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    /**
     * Create a new chat message
     */
    public ChatMessageDto createMessage(CreateChatMessageRequest request, Long userId) {
        log.debug("Creating chat message for user {} in project {}", userId, request.getProjectId());
        
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            throw new RuntimeException("User not found");
        }
        
        Optional<Project> projectOpt = projectRepository.findById(request.getProjectId());
        if (projectOpt.isEmpty()) {
            throw new RuntimeException("Project not found");
        }
        
        User user = userOpt.get();
        Project project = projectOpt.get();
        
        // TODO: Check if user has permission to access this project
        
        ChatMessage.MessageType messageType;
        try {
            messageType = ChatMessage.MessageType.valueOf(request.getMessageType().toUpperCase());
        } catch (IllegalArgumentException e) {
            messageType = ChatMessage.MessageType.TEXT;
        }
        
        ChatMessage chatMessage = new ChatMessage(project, user, request.getContent(), messageType);
        chatMessage = chatMessageRepository.save(chatMessage);
        
        log.debug("Created chat message with ID: {}", chatMessage.getId());
        return new ChatMessageDto(chatMessage);
    }
    
    /**
     * Get all chat messages for a project
     */
    @Transactional(readOnly = true)
    public List<ChatMessageDto> getProjectMessages(Long projectId) {
        log.debug("Fetching chat messages for project {}", projectId);
        
        Optional<Project> projectOpt = projectRepository.findById(projectId);
        if (projectOpt.isEmpty()) {
            throw new RuntimeException("Project not found");
        }
        
        Project project = projectOpt.get();
        List<ChatMessage> messages = chatMessageRepository.findByProjectOrderByCreatedAtAsc(project);
        
        return messages.stream()
                .map(ChatMessageDto::new)
                .collect(Collectors.toList());
    }
    
    /**
     * Get recent chat messages for a project (last N messages)
     */
    @Transactional(readOnly = true)
    public List<ChatMessageDto> getRecentProjectMessages(Long projectId, int limit) {
        log.debug("Fetching {} recent chat messages for project {}", limit, projectId);
        
        Optional<Project> projectOpt = projectRepository.findById(projectId);
        if (projectOpt.isEmpty()) {
            throw new RuntimeException("Project not found");
        }
        
        Project project = projectOpt.get();
        Pageable pageable = PageRequest.of(0, limit);
        List<ChatMessage> messages = chatMessageRepository.findRecentMessagesByProject(project, pageable);
        
        // Reverse the list to get chronological order (oldest first)
        messages = messages.stream()
                .sorted((m1, m2) -> m1.getCreatedAt().compareTo(m2.getCreatedAt()))
                .collect(Collectors.toList());
        
        return messages.stream()
                .map(ChatMessageDto::new)
                .collect(Collectors.toList());
    }
    
    /**
     * Get message count for a project
     */
    @Transactional(readOnly = true)
    public long getProjectMessageCount(Long projectId) {
        Optional<Project> projectOpt = projectRepository.findById(projectId);
        if (projectOpt.isEmpty()) {
            return 0;
        }
        
        return chatMessageRepository.countByProject(projectOpt.get());
    }
}
