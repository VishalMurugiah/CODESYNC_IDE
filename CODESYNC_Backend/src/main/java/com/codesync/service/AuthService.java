package com.codesync.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.codesync.dto.auth.JwtResponse;
import com.codesync.dto.auth.LoginRequest;
import com.codesync.dto.auth.RegisterRequest;
import com.codesync.entity.Role;
import com.codesync.entity.User;
import com.codesync.repository.RoleRepository;
import com.codesync.repository.UserRepository;
import com.codesync.security.JwtTokenProvider;

@Service
public class AuthService {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider tokenProvider;

    public JwtResponse authenticateUser(LoginRequest loginRequest) {
        try {
            System.out.println("AuthService: Starting authentication for: " + loginRequest.getUsername());
            
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            loginRequest.getUsername(),
                            loginRequest.getPassword()
                    )
            );
            System.out.println("AuthService: Authentication successful");

            SecurityContextHolder.getContext().setAuthentication(authentication);
            System.out.println("AuthService: About to generate JWT token");
            
            String jwt = tokenProvider.generateToken(authentication);
            System.out.println("AuthService: JWT token generated");

            // Get the authenticated identifier (now it's email from CustomUserDetailsService)
            String authenticatedIdentifier = authentication.getName();
            System.out.println("AuthService: Looking up user in database: " + authenticatedIdentifier);

            // Since CustomUserDetailsService returns email as username, look up by email
            User user = userRepository.findByEmail(authenticatedIdentifier)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            System.out.println("AuthService: User found: " + user.getEmail());

            System.out.println("AuthService: Creating JWT response");
            return new JwtResponse(jwt, user.getId(), user.getUsername(),
                    user.getEmail(), user.getFullName(), 
                    user.getRole() != null ? List.of(user.getRole().getName().getDisplayName()) : List.of("WRITE"));
        } catch (Exception e) {
            System.err.println("AuthService ERROR: " + e.getClass().getName() + ": " + e.getMessage());
            throw e;
        }
    }

    public JwtResponse registerUser(RegisterRequest registerRequest) {
        // Check if username already exists
        if (userRepository.existsByUsername(registerRequest.getUsername())) {
            throw new RuntimeException("Username is already taken!");
        }

        // Check if email already exists
        if (userRepository.existsByEmail(registerRequest.getEmail())) {
            throw new RuntimeException("Email is already in use!");
        }

        // Get default WRITE role for new users
        Role writeRole = roleRepository.findByName(Role.RoleName.WRITE)
                .orElse(null); // Allow null if roles haven't been initialized yet

        // Create new user
        User user = new User();
        user.setUsername(registerRequest.getUsername());
        user.setEmail(registerRequest.getEmail());
        user.setFullName(registerRequest.getFullName());
        user.setPassword(passwordEncoder.encode(registerRequest.getPassword()));
        user.setRole(writeRole); // This can be null initially

        User savedUser = userRepository.save(user);

        // Generate JWT token
        String jwt = tokenProvider.generateTokenFromUsername(savedUser.getUsername());

        return new JwtResponse(jwt, savedUser.getId(), savedUser.getUsername(),
                savedUser.getEmail(), savedUser.getFullName(),
                savedUser.getRole() != null ? List.of(savedUser.getRole().getName().getDisplayName()) : List.of("WRITE"));
    }

    public boolean validateToken(String token) {
        return tokenProvider.validateToken(token);
    }

    public String getUsernameFromToken(String token) {
        return tokenProvider.getUsernameFromToken(token);
    }
}
