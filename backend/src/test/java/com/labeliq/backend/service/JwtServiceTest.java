package com.labeliq.backend.service;

import com.labeliq.backend.model.Role;
import com.labeliq.backend.model.User;
import com.labeliq.backend.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private JwtService jwtService;

    @BeforeEach
    void setup() throws Exception {
        jwtService = new JwtService();

        // Inject secretKey manually (bypasses @Value injection)
        Field secret = JwtService.class.getDeclaredField("secretKey");
        secret.setAccessible(true);
        secret.set(jwtService, "XCZ9FMUsZkHsXZmZjlsEsQ/5flnl5b4PiRbpEE63+pQ=");

        // Inject expiration manually
        Field exp = JwtService.class.getDeclaredField("jwtExpirationMs");
        exp.setAccessible(true);
        exp.set(jwtService, 86400000L);
    }

    private User mockUser(String username) {
        User u = new User();
        u.setUsername(username);
        u.setRole(Role.USER);
        u.setEnabled(true);
        return u;
    }

    @Test
    void generateToken_createsValidJWT() {
        User user = mockUser("john");

        String token = jwtService.generateToken(user);

        assertNotNull(token);
        assertFalse(token.isEmpty());
        assertTrue(token.split("\\.").length == 3); // valid JWT structure
    }

    @Test
    void extractUsername_returnsCorrectUsername() {
        User user = mockUser("john");

        String token = jwtService.generateToken(user);
        String extracted = jwtService.extractUsername(token);

        assertEquals("john", extracted);
    }

    @Test
    void isTokenValid_validToken_returnsTrue() {
        User user = mockUser("john");
        String token = jwtService.generateToken(user);

        assertTrue(jwtService.isTokenValid(token, user));
    }

    @Test
    void isTokenValid_wrongUser_returnsFalse() {
        User john = mockUser("john");
        User mike = mockUser("mike");

        String token = jwtService.generateToken(john);

        assertFalse(jwtService.isTokenValid(token, mike));
    }
}
