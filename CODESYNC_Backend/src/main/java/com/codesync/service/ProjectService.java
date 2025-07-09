package com.codesync.service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.codesync.dto.project.CreateProjectRequest;
import com.codesync.dto.project.ProjectResponse;
import com.codesync.entity.Project;
import com.codesync.entity.User;
import com.codesync.entity.UserProjectPermission;
import com.codesync.repository.ProjectRepository;
import com.codesync.repository.UserProjectPermissionRepository;
import com.codesync.repository.UserRepository;

@Service
public class ProjectService {

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserProjectPermissionRepository permissionRepository;

    public ProjectResponse createProject(CreateProjectRequest request, String username) {
        User user = userRepository.findByEmail(username)  // Changed from findByUsername to findByEmail
                .orElseThrow(() -> new RuntimeException("User not found"));

        Project project = new Project();
        project.setName(request.getName());
        project.setDescription(request.getDescription());

        Project savedProject = projectRepository.save(project);

        // Give creator admin permission for this project
        UserProjectPermission permission = new UserProjectPermission();
        permission.setUser(user);
        permission.setProject(savedProject);
        permission.setPermission(UserProjectPermission.Permission.ADMIN);
        permissionRepository.save(permission);

        return convertToResponse(savedProject);
    }

    public List<ProjectResponse> getUserProjects(String username) {
        User user = userRepository.findByEmail(username)  // Changed from findByUsername to findByEmail
                .orElseThrow(() -> new RuntimeException("User not found"));

        System.out.println("Getting projects for user: " + username + " (ID: " + user.getId() + ")");

        // Get all permissions for this user
        List<UserProjectPermission> userPermissions = permissionRepository.findByUserId(user.getId());
        System.out.println("Found " + userPermissions.size() + " permissions for user");
        
        // Extract project IDs and fetch projects
        List<Long> projectIds = userPermissions.stream()
                .map(permission -> {
                    Long projectId = permission.getProject().getId();
                    System.out.println("User has permission for project ID: " + projectId + " with permission: " + permission.getPermission());
                    return projectId;
                })
                .collect(Collectors.toList());
        
        System.out.println("Project IDs: " + projectIds);
        
        if (projectIds.isEmpty()) {
            System.out.println("No project IDs found, returning empty list");
            return new ArrayList<>();
        }
        
        // Fetch projects by IDs
        List<Project> projects = projectRepository.findAllById(projectIds);
        System.out.println("Found " + projects.size() + " projects");
        
        List<ProjectResponse> responses = projects.stream()
                .map(project -> {
                    System.out.println("Converting project: " + project.getName() + " (ID: " + project.getId() + ")");
                    return convertToResponse(project);
                })
                .collect(Collectors.toList());
        
        System.out.println("Returning " + responses.size() + " project responses");
        return responses;
    }

    public ProjectResponse getProject(Long projectId, String username) {
        User user = userRepository.findByEmail(username)  // Changed from findByUsername to findByEmail
                .orElseThrow(() -> new RuntimeException("User not found"));

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        // Check if user has permission to access this project
        permissionRepository.findByUserIdAndProjectId(user.getId(), projectId)
                .orElseThrow(() -> new RuntimeException("Access denied"));

        return convertToResponse(project);
    }

    public void deleteProject(Long projectId, String username) {
        User user = userRepository.findByEmail(username)  // Changed from findByUsername to findByEmail
                .orElseThrow(() -> new RuntimeException("User not found"));

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        // Check if user has admin permission
        UserProjectPermission permission = permissionRepository.findByUserIdAndProjectId(user.getId(), projectId)
                .orElseThrow(() -> new RuntimeException("Access denied"));

        if (permission.getPermission() != UserProjectPermission.Permission.ADMIN) {
            throw new RuntimeException("Only admin can delete project");
        }

        projectRepository.delete(project);
    }

    private ProjectResponse convertToResponse(Project project) {
        ProjectResponse response = new ProjectResponse();
        response.setId(project.getId());
        response.setName(project.getName());
        response.setDescription(project.getDescription());
        response.setCreatedAt(project.getCreatedAt());
        response.setUpdatedAt(project.getUpdatedAt());

        // Set files and collaborators if needed
        // This can be optimized to avoid N+1 queries in production

        return response;
    }
}
