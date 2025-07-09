package com.codesync.controller;

import com.codesync.dto.common.ApiResponse;
import com.codesync.dto.project.CreateProjectRequest;
import com.codesync.dto.project.ProjectResponse;
import com.codesync.service.ProjectService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
@CrossOrigin(origins = "*", maxAge = 3600)
public class ProjectController {

    @Autowired
    private ProjectService projectService;

    @PostMapping
    public ResponseEntity<ApiResponse<ProjectResponse>> createProject(
            @Valid @RequestBody CreateProjectRequest request,
            Authentication authentication) {
        try {
            ProjectResponse project = projectService.createProject(request, authentication.getName());
            return ResponseEntity.ok(ApiResponse.success("Project created successfully", project));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Failed to create project: " + e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProjectResponse>>> getUserProjects(Authentication authentication) {
        try {
            List<ProjectResponse> projects = projectService.getUserProjects(authentication.getName());
            return ResponseEntity.ok(ApiResponse.success("Projects retrieved successfully", projects));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Failed to retrieve projects: " + e.getMessage()));
        }
    }

    @GetMapping("/{projectId}")
    public ResponseEntity<ApiResponse<ProjectResponse>> getProject(
            @PathVariable Long projectId,
            Authentication authentication) {
        try {
            ProjectResponse project = projectService.getProject(projectId, authentication.getName());
            return ResponseEntity.ok(ApiResponse.success("Project retrieved successfully", project));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Failed to retrieve project: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{projectId}")
    public ResponseEntity<ApiResponse<String>> deleteProject(
            @PathVariable Long projectId,
            Authentication authentication) {
        try {
            projectService.deleteProject(projectId, authentication.getName());
            return ResponseEntity.ok(ApiResponse.success("Project deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Failed to delete project: " + e.getMessage()));
        }
    }
}