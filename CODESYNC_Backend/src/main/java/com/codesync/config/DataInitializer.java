package com.codesync.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.codesync.entity.Project;
import com.codesync.entity.ProjectFile;
import com.codesync.entity.Role;
import com.codesync.entity.User;
import com.codesync.entity.UserProjectPermission;
import com.codesync.repository.ProjectFileRepository;
import com.codesync.repository.ProjectRepository;
import com.codesync.repository.RoleRepository;
import com.codesync.repository.UserProjectPermissionRepository;
import com.codesync.repository.UserRepository;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private ProjectFileRepository projectFileRepository;

    @Autowired
    private UserProjectPermissionRepository permissionRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        // Initialize roles first
        initializeRoles();
        
        // Initialize sample data only if database is empty
        initializeSampleData();
    }

    private void initializeRoles() {
        System.out.println("Initializing roles...");
        
        // Create default roles if they don't exist
        for (Role.RoleName roleName : Role.RoleName.values()) {
            if (!roleRepository.existsByName(roleName)) {
                Role role = new Role(roleName);
                roleRepository.save(role);
                System.out.println("Created role: " + roleName.getDisplayName());
            }
        }
        
        // Update existing users without roles to have WRITE role
        Role writeRole = roleRepository.findByName(Role.RoleName.WRITE)
                .orElseThrow(() -> new RuntimeException("WRITE role not found"));
        
        userRepository.findAll().forEach(user -> {
            if (user.getRole() == null) {
                user.setRole(writeRole);
                userRepository.save(user);
                System.out.println("Assigned WRITE role to existing user: " + user.getUsername());
            }
        });
        
        System.out.println("Roles initialization completed.");
    }

    private void initializeSampleData() {
        // Check if data already exists
        if (userRepository.count() > 0) {
            System.out.println("Database already contains data, skipping initialization");
            return;
        }

        System.out.println("Initializing sample data...");

        // Create sample users with email as username and assign roles
        User adminUser = createUser("admin@codesync.com", "admin@codesync.com", "Admin User", "password123", Role.RoleName.ADMIN);
        User demoUser = createUser("demo@codesync.com", "demo@codesync.com", "Demo User", "password123", Role.RoleName.WRITE);
        User johnUser = createUser("john@codesync.com", "john@codesync.com", "John Doe", "password123", Role.RoleName.READ);

        // Create sample project (only one project)
        Project sampleProject = createProject("Sample Project", "A sample collaborative coding project");

        // Give admin permission to admin user
        createPermission(adminUser, sampleProject, UserProjectPermission.Permission.ADMIN);

        // Give write permission to demo user
        createPermission(demoUser, sampleProject, UserProjectPermission.Permission.WRITE);
        createPermission(johnUser, sampleProject, UserProjectPermission.Permission.READ);

        // Create sample files
        createSampleFile(sampleProject, "index.js", "/", getJavaScriptSampleCode(), "javascript");
        createSampleFile(sampleProject, "App.jsx", "/src", getReactSampleCode(), "jsx");
        createSampleFile(sampleProject, "styles.css", "/src", getCssSampleCode(), "css");
        createSampleFile(sampleProject, "README.md", "/", getReadmeSampleCode(), "markdown");
        createSampleFile(sampleProject, "main.py", "/", getPythonSampleCode(), "python");
        createSampleFile(sampleProject, "requirements.txt", "/", getPythonRequirements(), "text");

        System.out.println("Sample data initialization completed!");
        System.out.println("Demo users created:");
        System.out.println("- admin@codesync.com / password123 (Admin access)");
        System.out.println("- demo@codesync.com / password123 (Write access)");
        System.out.println("- john@codesync.com / password123 (Read access)");
    }

    private User createUser(String username, String email, String fullName, String password, Role.RoleName roleName) {
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new RuntimeException("Role not found: " + roleName));
        
        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setFullName(fullName);
        user.setPassword(passwordEncoder.encode(password));
        user.setRole(role);
        return userRepository.save(user);
    }

    private Project createProject(String name, String description) {
        Project project = new Project();
        project.setName(name);
        project.setDescription(description);
        return projectRepository.save(project);
    }

    private UserProjectPermission createPermission(User user, Project project, UserProjectPermission.Permission permission) {
        UserProjectPermission userPermission = new UserProjectPermission();
        userPermission.setUser(user);
        userPermission.setProject(project);
        userPermission.setPermission(permission);
        return permissionRepository.save(userPermission);
    }

    private ProjectFile createSampleFile(Project project, String name, String filePath, String content, String language) {
        ProjectFile file = new ProjectFile();
        file.setName(name);
        file.setFilePath(filePath);
        file.setContent(content);
        file.setLanguage(language);
        file.setProject(project);
        return projectFileRepository.save(file);
    }

    // Sample code content methods
    private String getJavaScriptSampleCode() {
        return """
            // Welcome to CodeSync!
            // This is a sample JavaScript file for demonstration
            
            console.log('Hello, CodeSync!');
            
            function greetUser(name) {
                return `Welcome to CodeSync, ${name}!`;
            }
            
            // Example of collaborative editing
            const users = ['admin', 'demo', 'john'];
            users.forEach(user => {
                console.log(greetUser(user));
            });
            
            // Real-time collaboration features:
            // - Live cursor tracking
            // - Instant code synchronization
            // - Multi-user editing
            """;
    }

    private String getReactSampleCode() {
        return """
            import React, { useState } from 'react';
            
            function App() {
                const [message, setMessage] = useState('Welcome to CodeSync!');
                
                return (
                    <div className="app">
                        <header className="app-header">
                            <h1>{message}</h1>
                            <p>
                                Real-time collaborative code editing made simple.
                            </p>
                            <button onClick={() => setMessage('Happy coding!')}>
                                Click me!
                            </button>
                        </header>
                    </div>
                );
            }
            
            export default App;
            """;
    }

    private String getCssSampleCode() {
        return """
            /* CodeSync Sample Styles */
            
            .app {
                text-align: center;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            
            .app-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 2rem;
                color: white;
                min-height: 50vh;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }
            
            h1 {
                font-size: 2.5rem;
                margin-bottom: 1rem;
                animation: fadeIn 1s ease-in;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            button {
                background: #4CAF50;
                border: none;
                color: white;
                padding: 15px 32px;
                text-align: center;
                font-size: 16px;
                margin: 4px 2px;
                cursor: pointer;
                border-radius: 5px;
                transition: background 0.3s;
            }
            
            button:hover {
                background: #45a049;
            }
            """;
    }

    private String getReadmeSampleCode() {
        return """
            # CodeSync Sample Project
            
            Welcome to your first CodeSync project! This is a demonstration of real-time collaborative code editing.
            
            ## Features
            
            - **Real-time Collaboration**: Multiple developers can edit the same file simultaneously
            - **Live Cursor Tracking**: See where other users are working in real-time
            - **Instant Synchronization**: Changes are reflected immediately across all connected clients
            - **Multi-language Support**: Syntax highlighting for various programming languages
            - **Project Management**: Organize your code in projects with file management
            
            ## Getting Started
            
            1. **Create an Account**: Sign up or log in to start collaborating
            2. **Create a Project**: Set up a new project for your team
            3. **Invite Collaborators**: Share your project with team members
            4. **Start Coding**: Edit files together in real-time
            
            ## Supported Languages
            
            - JavaScript / TypeScript
            - Python
            - Java
            - C++ / C
            - HTML / CSS
            - React / JSX
            - And many more!
            
            ## Demo Users
            
            This project comes with pre-configured demo users:
            
            - **admin** (Admin): Full project access
            - **demo** (Writer): Can edit files
            - **john** (Reader): Can view files
            
            Password for all demo users: `password123`
            
            ## Happy Coding!
            
            Start collaborating and experience the future of code editing with CodeSync!
            """;
    }

    private String getPythonSampleCode() {
        return """
            #!/usr/bin/env python3
            \"\"\"
            CodeSync Python Demo
            A simple Python script demonstrating real-time collaboration
            \"\"\"
            
            import datetime
            import json
            
            class CodeSyncDemo:
                def __init__(self):
                    self.users = []
                    self.session_start = datetime.datetime.now()
                
                def add_user(self, username, role="viewer"):
                    \"\"\"Add a user to the collaboration session\"\"\"
                    user = {
                        "username": username,
                        "role": role,
                        "joined_at": datetime.datetime.now().isoformat()
                    }
                    self.users.append(user)
                    print(f"User {username} joined as {role}")
                
                def get_session_info(self):
                    \"\"\"Get current session information\"\"\"
                    return {
                        "session_duration": str(datetime.datetime.now() - self.session_start),
                        "active_users": len(self.users),
                        "users": self.users
                    }
                
                def simulate_collaboration(self):
                    \"\"\"Simulate a collaborative coding session\"\"\"
                    print("=== CodeSync Collaboration Demo ===")
                    
                    # Add demo users
                    self.add_user("admin", "admin")
                    self.add_user("demo", "editor")
                    self.add_user("john", "viewer")
                    
                    # Show session info
                    session_info = self.get_session_info();
                    print("\\nSession Info:");
                    print(json.dumps(session_info, indent=2, default=str));
                    
                    print("\\n🚀 Real-time collaboration in action!")
                    print("📝 Multiple users editing simultaneously")
                    print("👀 Live cursor tracking and presence indicators")
                    print("⚡ Instant synchronization across all clients")
            
            if __name__ == "__main__":
                demo = CodeSyncDemo()
                demo.simulate_collaboration()
            """;
    }

    private String getPythonRequirements() {
        return """
            # CodeSync Python Demo Requirements
            # Install with: pip install -r requirements.txt
            
            # Core dependencies
            requests>=2.25.1
            websocket-client>=1.0.1
            
            # Development dependencies
            pytest>=6.2.2
            black>=21.0.0
            flake8>=3.8.4
            
            # Optional: For advanced features
            numpy>=1.20.0
            pandas>=1.2.0
            """;
    }
}