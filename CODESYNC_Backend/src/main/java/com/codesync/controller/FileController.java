package com.codesync.controller;

import com.codesync.dto.common.ApiResponse;
import com.codesync.dto.file.CreateFileRequest;
import com.codesync.dto.file.FileResponse;
import com.codesync.service.FileService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/files")
@CrossOrigin(origins = "*", maxAge = 3600)
public class FileController {

    @Autowired
    private FileService fileService;

    @PostMapping
    public ResponseEntity<ApiResponse<FileResponse>> createFile(
            @Valid @RequestBody CreateFileRequest request,
            Authentication authentication) {
        try {
            FileResponse file = fileService.createFile(request, authentication.getName());
            return ResponseEntity.ok(ApiResponse.success("File created successfully", file));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Failed to create file: " + e.getMessage()));
        }
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<ApiResponse<List<FileResponse>>> getProjectFiles(
            @PathVariable Long projectId,
            Authentication authentication) {
        try {
            List<FileResponse> files = fileService.getProjectFiles(projectId, authentication.getName());
            return ResponseEntity.ok(ApiResponse.success("Files retrieved successfully", files));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Failed to retrieve files: " + e.getMessage()));
        }
    }

    @GetMapping("/{fileId}")
    public ResponseEntity<ApiResponse<FileResponse>> getFile(
            @PathVariable Long fileId,
            Authentication authentication) {
        try {
            FileResponse file = fileService.getFile(fileId, authentication.getName());
            return ResponseEntity.ok(ApiResponse.success("File retrieved successfully", file));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Failed to retrieve file: " + e.getMessage()));
        }
    }

    @PutMapping("/{fileId}")
    public ResponseEntity<ApiResponse<FileResponse>> updateFile(
            @PathVariable Long fileId,
            @RequestBody Map<String, String> request,
            Authentication authentication) {
        try {
            String content = request.get("content");
            FileResponse file = fileService.updateFileContent(fileId, content, authentication.getName());
            return ResponseEntity.ok(ApiResponse.success("File updated successfully", file));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Failed to update file: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{fileId}")
    public ResponseEntity<ApiResponse<String>> deleteFile(
            @PathVariable Long fileId,
            Authentication authentication) {
        try {
            fileService.deleteFile(fileId, authentication.getName());
            return ResponseEntity.ok(ApiResponse.success("File deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Failed to delete file: " + e.getMessage()));
        }
    }
}
