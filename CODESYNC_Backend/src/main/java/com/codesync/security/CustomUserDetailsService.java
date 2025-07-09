package com.codesync.security;

import java.util.ArrayList;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.codesync.entity.User;
import com.codesync.repository.UserRepository;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // Try to find user by email first (for email-based login)
        User user = userRepository.findByEmail(username)
                .orElseGet(() -> {
                    // If not found by email, try by username (fallback)
                    return userRepository.findByUsername(username)
                            .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
                });

        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getEmail()) // Use email as the principal
                .password(user.getPassword())
                .authorities(new ArrayList<>()) // Add roles/authorities here if needed
                .build();
    }
}
