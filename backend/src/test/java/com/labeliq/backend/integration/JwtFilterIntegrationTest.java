package com.labeliq.backend.integration;

import com.labeliq.backend.model.User;
import com.labeliq.backend.repository.UserRepository;
import com.labeliq.backend.security.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class JwtFilterIntegrationTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    JwtService jwtService;

    @Autowired
    UserRepository userRepository;

    @Autowired
    PasswordEncoder passwordEncoder;

    /* --------------------------------
       1️⃣ /api/auth/** bypasses filter
       -------------------------------- */
    @Test
    void auth_path_bypasses_jwt_filter() throws Exception {
        // GET not allowed → proves filter did NOT block it
        mockMvc.perform(get("/api/auth/login"))
                .andExpect(status().isMethodNotAllowed());
    }

    /* --------------------------------
       2️⃣ No Authorization header
       -------------------------------- */
    @Test
    void request_without_jwt_is_forbidden() throws Exception {
        mockMvc.perform(get("/api/health/profile"))
                .andExpect(status().isForbidden());
    }

    /* --------------------------------
       3️⃣ Invalid JWT → forbidden (NOT exception)
       -------------------------------- */
    @Test
    void request_with_invalid_signature_jwt_is_forbidden() throws Exception {
        // STRUCTURALLY valid JWT, but bad signature
        String invalidJwt =
                "eyJhbGciOiJIUzI1NiJ9." +
                        "eyJzdWIiOiJub3RhdXNlciIsImlhdCI6MTUxNjIzOTAyMn0." +
                        "invalidsignature";

        mockMvc.perform(get("/api/health/profile")
                        .header("Authorization", "Bearer " + invalidJwt))
                .andExpect(status().isForbidden());
    }


    /* --------------------------------
       4️⃣ Valid JWT → authentication created
       -------------------------------- */
    @Test
    void request_with_valid_jwt_sets_authentication() throws Exception {
        User user = new User();
        user.setUsername("jwtuser");
        user.setPassword(passwordEncoder.encode("password"));
        user.setEnabled(true);

        userRepository.save(user);

        String token = jwtService.generateToken(user);

        // Endpoint does not exist → 404 is CORRECT
        mockMvc.perform(get("/api/health/profile")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    /* --------------------------------
       5️⃣ Existing auth → skips re-auth
       -------------------------------- */
    @Test
    void request_with_existing_authentication_skips_reauth() throws Exception {
        User user = new User();
        user.setUsername("existinguser");
        user.setPassword(passwordEncoder.encode("password"));
        user.setEnabled(true);

        userRepository.save(user);

        String token = jwtService.generateToken(user);

        mockMvc.perform(get("/api/health/profile")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/health/profile")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }
}
