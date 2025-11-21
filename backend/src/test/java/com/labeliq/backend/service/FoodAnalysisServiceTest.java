package com.labeliq.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labeliq.backend.controller.NutritionAPIController;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class FoodAnalysisServiceTest {

    @Mock private ImageClassifierService classifier;
    @Mock private NutritionAPIController nutritionAPI;

    @InjectMocks private FoodAnalysisService service;

    private final ObjectMapper mapper = new ObjectMapper();

    @BeforeEach
    void setup() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void analyzeFood_success() throws Exception {
        // Mock classifier JSON
        String classifierJson = """
            { "category": { "name": "apple" } }
        """;

        Object classifierObj = mapper.readTree(classifierJson);

        when(classifier.classifyImage("image.jpg"))
                .thenReturn(classifierObj);

        // Mock USDA API response
        String nutritionJson = """
            { "calories": 150, "fiber": 4 }
        """;

        when(nutritionAPI.getFoodData("apple"))
                .thenReturn(ResponseEntity.ok(nutritionJson));

        // Run the service
        JsonNode result = service.analyzeFood("image.jpg");

        // Assertions
        assertEquals("apple", result.get("predictedFood").asText());
        assertEquals("image.jpg", result.get("imageUrl").asText());
        assertNotNull(result.get("nutrition"));
        assertNotNull(result.get("classification"));

        verify(classifier, times(1)).classifyImage("image.jpg");
        verify(nutritionAPI, times(1)).getFoodData("apple");
    }

    @Test
    void analyzeFood_missingCategoryName() throws Exception {
        // Returned classifier JSON: missing category name
        String classifierJson = """
            { "category": {} }
        """;

        Object classifierObj = mapper.readTree(classifierJson);
        when(classifier.classifyImage("image.jpg"))
                .thenReturn(classifierObj);

        // Should call API with "unknown food"
        when(nutritionAPI.getFoodData("unknown food"))
                .thenReturn(ResponseEntity.ok("{}"));

        JsonNode result = service.analyzeFood("image.jpg");

        assertEquals("unknown food", result.get("predictedFood").asText());
        verify(nutritionAPI, times(1)).getFoodData("unknown food");
    }

    @Test
    void analyzeFood_invalidNutritionJson_throwsException() throws Exception {
        Object classifierObj = mapper.readTree("""
            { "category": { "name": "banana" } }
        """);

        when(classifier.classifyImage("image.jpg"))
                .thenReturn(classifierObj);

        // Return invalid JSON
        when(nutritionAPI.getFoodData("banana"))
                .thenReturn(ResponseEntity.ok("INVALID_JSON"));

        assertThrows(Exception.class,
                () -> service.analyzeFood("image.jpg")
        );
    }
}
