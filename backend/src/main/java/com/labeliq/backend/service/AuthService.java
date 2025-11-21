package com.labeliq.backend.service;

import com.labeliq.backend.dto.AuthResponse;
import com.labeliq.backend.dto.LoginRequest;
import com.labeliq.backend.dto.RegisterRequest;
import com.labeliq.backend.model.HealthProfile;
import com.labeliq.backend.model.Role;
import com.labeliq.backend.model.User;
import com.labeliq.backend.repository.HealthProfileRepository;
import com.labeliq.backend.repository.UserRepository;
import com.labeliq.backend.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final HealthProfileRepository healthProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authManager;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new RuntimeException("Username already exists");
        }
        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setRole(Role.USER);
        user.setEnabled(true);
        User savedUser = userRepository.save(user);

        HealthProfile profile = new HealthProfile();
        profile.setUser(savedUser);
        healthProfileRepository.save(profile);

        String token = jwtService.generateToken(savedUser);
        return new AuthResponse(token);
    }

    public AuthResponse login(LoginRequest request) {
        try {
            authManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getUsername(),
                            request.getPassword()
                    )
            );
        } catch (Exception e) {
            System.out.println("Authentication failed: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        String token = jwtService.generateToken(user);
        return new AuthResponse(token);
    }
}
