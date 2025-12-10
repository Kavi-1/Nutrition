package com.labeliq.backend.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labeliq.backend.dto.HealthProfileUpdateRequest;
import com.labeliq.backend.model.HealthProfile;
import com.labeliq.backend.model.User;
import com.labeliq.backend.repository.HealthProfileRepository;
import com.labeliq.backend.repository.UserRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)     // disable JWT filter for testing
@ActiveProfiles("test")
class HealthProfileIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private UserRepository userRepo;
    @Autowired private HealthProfileRepository profileRepo;

    private User user;

    @BeforeEach
    void setup() {
        // Clean DB before each test
        profileRepo.deleteAll();
        userRepo.deleteAll();

        user = new User();
        user.setUsername("john");
        user.setPassword("encodedpass");   
        user.setFirstName("John");
        user.setLastName("Doe");
        user = userRepo.save(user);

        HealthProfile profile = new HealthProfile();
        profile.setUser(user);
        profile.setAge(20);
        profile.setHeight(170.0);
        profile.setWeight(70.0);
        profile.setGender("Male");
        profile.setAllergies(List.of("Peanuts"));
        profile.setDietaryPreference("Vegetarian");

        profileRepo.save(profile);
    }

    @Test
    @WithMockUser(username = "john")
    void getMyProfile_returnsProfile() throws Exception {
        mockMvc.perform(get("/api/profile/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.age").value(20))
                .andExpect(jsonPath("$.height").value(170.0))
                .andExpect(jsonPath("$.weight").value(70.0))
                .andExpect(jsonPath("$.gender").value("Male"))
                .andExpect(jsonPath("$.allergies[0]").value("Peanuts"))
                .andExpect(jsonPath("$.dietaryPreference").value("Vegetarian"));
    }

    @Test
    @WithMockUser(username = "john")
    void updateMyProfile_updatesAndReturnsProfile() throws Exception {
        HealthProfileUpdateRequest update = new HealthProfileUpdateRequest();
        update.setAge(25);
        update.setHeight(175.0);
        update.setWeight(72.5);
        update.setGender("Female");
        update.setAllergies(List.of("Dairy", "Gluten"));
        update.setDietaryPreference("Vegan");

        mockMvc.perform(put("/api/profile/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(update)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.age").value(25))
                .andExpect(jsonPath("$.height").value(175.0))
                .andExpect(jsonPath("$.weight").value(72.5))
                .andExpect(jsonPath("$.gender").value("Female"))
                .andExpect(jsonPath("$.allergies[0]").value("Dairy"))
                .andExpect(jsonPath("$.allergies[1]").value("Gluten"))
                .andExpect(jsonPath("$.dietaryPreference").value("Vegan"));
    }
}
