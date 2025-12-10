package com.labeliq.backend.controller;

import com.labeliq.backend.security.CustomUserDetailsService;
import com.labeliq.backend.security.JwtService;
import com.labeliq.backend.service.FoodRetrievalService;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;

import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import org.springframework.web.client.RestTemplate;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(NutritionAPIController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(NutritionAPIControllerTest.MockConfig.class)
@ActiveProfiles("test")
class NutritionAPIControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private FoodRetrievalService foodRetrievalService;

    /* ------------------------
       /api/nutrition/food
       ------------------------ */
    @Test
    void food_search_endpoint_executes() throws Exception {
        when(restTemplate.getForObject(anyString(), Mockito.eq(String.class)))
                .thenReturn("{}");

        mockMvc.perform(get("/api/nutrition/food")
                        .param("name", "apple")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    /* ------------------------
       /api/nutrition/barcode
       ------------------------ */
    @Test
    void barcode_not_found_returns_404() throws Exception {
        when(foodRetrievalService.getFoodByBarcode("123"))
                .thenReturn(null);

        mockMvc.perform(get("/api/nutrition/barcode")
                        .param("barcode", "123"))
                .andExpect(status().isNotFound());
    }

    /* ========================
       Test-only Bean Overrides
       ======================== */
    @TestConfiguration
    static class MockConfig {

        @Bean
        RestTemplate restTemplate() {
            return Mockito.mock(RestTemplate.class);
        }

        @Bean
        FoodRetrievalService foodRetrievalService() {
            return Mockito.mock(FoodRetrievalService.class);
        }

        // Required because JwtAuthenticationFilter is in the context
        @Bean
        JwtService jwtService() {
            return Mockito.mock(JwtService.class);
        }

        @Bean
        CustomUserDetailsService customUserDetailsService() {
            return Mockito.mock(CustomUserDetailsService.class);
        }
    }
}
