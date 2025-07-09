package com.codesync.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.codesync.dto.auth.JwtResponse;
import com.codesync.dto.auth.LoginRequest;
import com.codesync.dto.auth.RegisterRequest;
import com.codesync.dto.common.ApiResponse;
import com.codesync.service.AuthService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<JwtResponse>> login(/*@Valid*/ @RequestBody LoginRequest loginRequest) {
        try {
            System.out.println("=== LOGIN ATTEMPT DEBUG ===");
            System.out.println("Request received");
            System.out.println("Username: " + loginRequest.getUsername());
            System.out.println("Password provided: " + (loginRequest.getPassword() != null));
            System.out.println("About to call authService.authenticateUser...");
            
            JwtResponse jwtResponse = authService.authenticateUser(loginRequest);
            
            System.out.println("Login successful for user: " + loginRequest.getUsername());
            return ResponseEntity.ok(ApiResponse.success("Login successful", jwtResponse));
        } catch (Exception e) {
            System.err.println("=== LOGIN FAILED DEBUG ===");
            System.err.println("Exception type: " + e.getClass().getName());
            System.err.println("Exception message: " + e.getMessage());
            System.err.println("=== FULL STACK TRACE ===");
            e.printStackTrace();
            System.err.println("=== END STACK TRACE ===");
            return ResponseEntity.status(500).body(ApiResponse.error("Login failed: " + e.getMessage()));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<JwtResponse>> register(@Valid @RequestBody RegisterRequest registerRequest) {
        try {
            JwtResponse jwtResponse = authService.registerUser(registerRequest);
            return ResponseEntity.ok(ApiResponse.success("Registration successful", jwtResponse));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Registration failed: " + e.getMessage()));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<String>> logout() {
        // In a stateless JWT system, logout is typically handled on the client side
        // by removing the token from storage
        return ResponseEntity.ok(ApiResponse.success("Logged out successfully", null));
    }

    @GetMapping("/validate")
    public ResponseEntity<ApiResponse<String>> validateToken(@RequestHeader("Authorization") String token) {
        try {
            boolean isValid = authService.validateToken(token.replace("Bearer ", ""));
            if (isValid) {
                return ResponseEntity.ok(ApiResponse.success("Token is valid"));
            } else {
                return ResponseEntity.badRequest().body(ApiResponse.error("Invalid token"));
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Token validation failed: " + e.getMessage()));
        }
    }}
