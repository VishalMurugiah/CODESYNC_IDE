package com.codesync.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.codesync.entity.ChatMessage;
import com.codesync.entity.Project;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    
    /**
     * Find all chat messages for a specific project, ordered by creation time
     */
    List<ChatMessage> findByProjectOrderByCreatedAtAsc(Project project);
    
    /**
     * Find chat messages for a project with pagination
     */
    Page<ChatMessage> findByProjectOrderByCreatedAtDesc(Project project, Pageable pageable);
    
    /**
     * Find recent chat messages for a project (last N messages)
     */
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.project = :project ORDER BY cm.createdAt DESC")
    List<ChatMessage> findRecentMessagesByProject(@Param("project") Project project, Pageable pageable);
    
    /**
     * Count messages for a project
     */
    long countByProject(Project project);
    
    /**
     * Find chat messages by project ID
     */
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.project.id = :projectId ORDER BY cm.createdAt ASC")
    List<ChatMessage> findByProjectIdOrderByCreatedAtAsc(@Param("projectId") Long projectId);
}
