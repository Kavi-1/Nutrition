package com.labeliq.backend.controller;

import com.labeliq.backend.dto.FoodAnalysisResult;
import com.labeliq.backend.security.JwtAuthenticationFilter;
import com.labeliq.backend.service.FoodVisionService;
import com.labeliq.backend.service.ImageClassifierService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = ImageClassifierController.class,
        excludeFilters = @ComponentScan.Filter(
                type = FilterType.ASSIGNABLE_TYPE,
                classes = JwtAuthenticationFilter.class
        )
)
@AutoConfigureMockMvc(addFilters = false)
@Import(ImageClassifierControllerTest.MockConfig.class)
@ActiveProfiles("test")
class ImageClassifierControllerTest {


    @Autowired
    MockMvc mockMvc;

    @Autowired
    ImageClassifierService classifierService;

    @Autowired
    FoodVisionService foodVisionService;

    @Test
    void get_classify_endpoint_executes() throws Exception {
        when(classifierService.classifyImage("http://test"))
                .thenReturn("OK");

        mockMvc.perform(get("/api/classify")
                        .param("imageUrl", "http://test"))
                .andExpect(status().isOk());
    }

    @Test
    void post_analyze_endpoint_executes() throws Exception {
        when(foodVisionService.analyzeImage("http://test"))
                .thenReturn(new FoodAnalysisResult());

        mockMvc.perform(post("/api/classify/analyze")
                        .param("imageUrl", "http://test"))
                .andExpect(status().isOk());
    }

    @TestConfiguration
    static class MockConfig {

        @Bean
        ImageClassifierService imageClassifierService() {
            return Mockito.mock(ImageClassifierService.class);
        }

        @Bean
        FoodVisionService foodVisionService() {
            return Mockito.mock(FoodVisionService.class);
        }
    }
}
