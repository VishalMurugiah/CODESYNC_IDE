package com.codesync;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.socket.config.annotation.EnableWebSocket;

@SpringBootApplication
@EnableWebSocket
public class CodeSyncApplication {

    public static void main(String[] args) {
        SpringApplication.run(CodeSyncApplication.class, args);
        System.out.println("CodeSync Backend is running on http://localhost:8080");
    }
}