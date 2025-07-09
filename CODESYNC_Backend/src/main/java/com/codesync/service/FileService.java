package com.codesync.service;

import com.codesync.dto.file.CreateFileRequest;
import com.codesync.dto.file.FileResponse;
import com.codesync.entity.Project;
import com.codesync.entity.ProjectFile;
import com.codesync.entity.User;
import com.codesync.repository.ProjectFileRepository;
import com.codesync.repository.ProjectRepository;
import com.codesync.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class FileService {

    @Autowired
    private ProjectFileRepository fileRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private UserRepository userRepository;

    public FileResponse createFile(CreateFileRequest request, String username) {
        User user = userRepository.findByEmail(username)  // Changed from findByUsername to findByEmail
                .orElseThrow(() -> new RuntimeException("User not found"));

        Project project = projectRepository.findById(request.getProjectId())
                .orElseThrow(() -> new RuntimeException("Project not found"));

        // Check if user has write permission (simplified - in production, check permissions)

        ProjectFile file = new ProjectFile();
        file.setName(request.getName());
        file.setFilePath(request.getFilePath());
        file.setContent(request.getContent());
        file.setLanguage(request.getLanguage());
        file.setProject(project);

        ProjectFile savedFile = fileRepository.save(file);
        return convertToResponse(savedFile);
    }

    public List<FileResponse> getProjectFiles(Long projectId, String username) {
        User user = userRepository.findByEmail(username)  // Changed from findByUsername to findByEmail
                .orElseThrow(() -> new RuntimeException("User not found"));

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        // Check permissions (simplified)

        return fileRepository.findByProjectId(projectId)
                .stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    public FileResponse getFile(Long fileId, String username) {
        User user = userRepository.findByEmail(username)  // Changed from findByUsername to findByEmail
                .orElseThrow(() -> new RuntimeException("User not found"));

        ProjectFile file = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        // Check permissions (simplified)

        return convertToResponse(file);
    }

    public FileResponse updateFileContent(Long fileId, String content, String username) {
        User user = userRepository.findByEmail(username)  // Changed from findByUsername to findByEmail
                .orElseThrow(() -> new RuntimeException("User not found"));

        ProjectFile file = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        // Check permissions (simplified)

        file.setContent(content);
        ProjectFile savedFile = fileRepository.save(file);
        return convertToResponse(savedFile);
    }

    public void deleteFile(Long fileId, String username) {
        User user = userRepository.findByEmail(username)  // Changed from findByUsername to findByEmail
                .orElseThrow(() -> new RuntimeException("User not found"));

        ProjectFile file = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        // Check permissions (simplified)

        fileRepository.delete(file);
    }

    private FileResponse convertToResponse(ProjectFile file) {
        return new FileResponse(
                file.getId(),
                file.getName(),
                file.getFilePath(),
                file.getContent(),
                file.getLanguage(),
                file.getCreatedAt(),
                file.getUpdatedAt(),
                file.getProject().getId()
        );
    }
}
