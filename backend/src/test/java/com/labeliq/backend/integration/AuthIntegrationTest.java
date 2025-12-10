package com.labeliq.backend.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labeliq.backend.dto.LoginRequest;
import com.labeliq.backend.dto.RegisterRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
class AuthIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper mapper;

    @Test
    void register_createsUser_andReturnsJwt() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setUsername("john");
        req.setPassword("pass123");
        req.setFirstName("John");
        req.setLastName("Doe");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", not(emptyString())));
    }

    @Test
    void login_returnsJwt() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setUsername("john");
        req.setPassword("pass123");
        req.setFirstName("John");
        req.setLastName("Doe");

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(req)));

        LoginRequest login = new LoginRequest();
        login.setUsername("john");
        login.setPassword("pass123");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", not(emptyString())));
    }

    @Test
    void login_wrongPassword_fails() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.setUsername("john");
        req.setPassword("pass123");

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(req)));

        LoginRequest badLogin = new LoginRequest();
        badLogin.setUsername("john");
        badLogin.setPassword("WRONG");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(badLogin)))
                .andExpect(status().is4xxClientError());
    }
}
