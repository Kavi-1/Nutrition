package com.labeliq.backend.service;

import com.labeliq.backend.dto.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.web.client.RestTemplate;

import java.util.List;

class FoodRetrievalServiceTest {

    @Mock private RestTemplate restTemplate;

    @InjectMocks private FoodRetrievalService service;

    @BeforeEach
    void setup() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void getFoodByBarcode_success() {
        FoodNutrient nutrient1 = new FoodNutrient();
        nutrient1.setNutrientId(1008); // calories
        nutrient1.setValue(150.0);

        FoodSearchItem item = new FoodSearchItem();
        item.setDescription("Apple");
        item.setBrandOwner("Fresh Farms");
        item.setIngredients("Apple");
        item.setServingSize(100.0);
        item.setServingSizeUnit("g");
        item.setFoodNutrients(List.of(nutrient1));

        FoodSearchResponse mockResponse = new FoodSearchResponse();
        mockResponse.setFoods(List.of(item));

        when(restTemplate.getForObject(anyString(), eq(FoodSearchResponse.class)))
                .thenReturn(mockResponse);

        FoodItemResponse response = service.getFoodByBarcode("12345");

        assertNotNull(response);
        assertEquals("Apple", response.getDescription());
        assertEquals(150.0, response.getCalories());
    }

    @Test
    void getFoodByBarcode_noFoods() {
        FoodSearchResponse mockResponse = new FoodSearchResponse();
        mockResponse.setFoods(List.of());

        when(restTemplate.getForObject(anyString(), eq(FoodSearchResponse.class)))
                .thenReturn(mockResponse);

        assertNull(service.getFoodByBarcode("99999"));
    }

    @Test
    void getFoodByBarcode_nullResponse() {
        when(restTemplate.getForObject(anyString(), eq(FoodSearchResponse.class)))
                .thenReturn(null);

        assertNull(service.getFoodByBarcode("99999"));
    }
}
