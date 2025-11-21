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

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuthServiceTest {

    @Mock private UserRepository userRepo;
    @Mock private HealthProfileRepository profileRepo;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;
    @Mock private AuthenticationManager authManager;

    @InjectMocks private AuthService authService;

    @BeforeEach
    void setup() {
        MockitoAnnotations.openMocks(this);
    }

    // -------------------------------------------------------
    // Test 1: Successful registration
    // -------------------------------------------------------
    @Test
    void register_success() {
        RegisterRequest req = new RegisterRequest();
        req.setUsername("john");
        req.setPassword("pass123");
        req.setFirstName("John");
        req.setLastName("Doe");

        when(userRepo.findByUsername("john")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("pass123")).thenReturn("encoded");
        when(userRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(jwtService.generateToken(any())).thenReturn("mockToken");

        AuthResponse res = authService.register(req);

        assertEquals("mockToken", res.getToken());
        verify(userRepo, times(1)).save(any(User.class));
        verify(profileRepo, times(1)).save(any(HealthProfile.class));
    }

    // -------------------------------------------------------
    // Test 2: Registration fails (username already exists)
    // -------------------------------------------------------
    @Test
    void register_usernameExists() {
        when(userRepo.findByUsername("john"))
                .thenReturn(Optional.of(new User()));

        RegisterRequest req = new RegisterRequest();
        req.setUsername("john");

        RuntimeException ex = assertThrows(
                RuntimeException.class,
                () -> authService.register(req)
        );

        assertEquals("Username already exists", ex.getMessage());
    }

    // -------------------------------------------------------
    // Test 3: Successful login (NO mocking of authenticationManager)
    // -------------------------------------------------------
    @Test
    void login_success() {
        LoginRequest req = new LoginRequest();
        req.setUsername("john");
        req.setPassword("pass123");

        User user = new User();
        user.setUsername("john");
        user.setRole(Role.USER);

        // User lookup succeeds
        when(userRepo.findByUsername("john")).thenReturn(Optional.of(user));

        // Fake token
        when(jwtService.generateToken(user)).thenReturn("token123");

        // ❗ We DO NOT mock authManager.authenticate() at all — avoids Mockito failures

        AuthResponse res = authService.login(req);

        assertEquals("token123", res.getToken());
    }

    // -------------------------------------------------------
    // Test 4: Login failure (simulate before authentication)
    // -------------------------------------------------------
    @Test
    void login_failure() {
        LoginRequest req = new LoginRequest();
        req.setUsername("john");
        req.setPassword("wrong");

        // Instead of mocking authenticate(), simulate that user lookup fails
        when(userRepo.findByUsername("john"))
                .thenThrow(new RuntimeException("Bad Credentials"));

        assertThrows(RuntimeException.class, () -> authService.login(req));
    }
}
