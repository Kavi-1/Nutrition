package com.labeliq.backend.controller;

import com.labeliq.backend.dto.FoodItemResponse;
import com.labeliq.backend.service.FoodRetrievalService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.bind.annotation.CrossOrigin;

@RestController
@RequestMapping("/api/nutrition")
@RequiredArgsConstructor
public class NutritionAPIController {

    /**
     * USDA FoodData Central API key, injected from application.properties.
     */
    @Value("${nutrition.api.key}")
    private String apiKey;

    /**
     * USDA FoodData Central Search API endpoint.
     * Example: https://api.nal.usda.gov/fdc/v1/foods/search
     */
    @Value("${nutrition.api.url}")
    private String apiUrl;

    /**
     * RestTemplate used to perform outbound HTTP requests
     * (backend → USDA API).
     */
    private final RestTemplate restTemplate;

    /**
     * Service layer for barcode-based food retrieval.
     * This is separate from name-based search and wraps USDA’s barcode API.
     */
    private final FoodRetrievalService foodRetrievalService;


    /**
     * GET /api/nutrition/food?name=<query>
     *
     * Performs a food search using USDA FoodData Central's text search API.
     * The backend simply forwards the request and returns the raw JSON response
     * received from USDA.
     *
     * @param name Search keyword (e.g., "apple", "banana").
     * @return Raw JSON response from USDA FDC API.
     */
    @GetMapping("/food")
    public ResponseEntity<String> getFoodData(@RequestParam String name) {

        // Build USDA API request:
        // /foods/search?query=<name>&api_key=<API_KEY>
        String url = apiUrl
                + "?query=" + name
                + "&api_key=" + apiKey;

        // Perform external API request
        String result = restTemplate.getForObject(url, String.class);

        // Return raw JSON to frontend
        return ResponseEntity.ok(result);
    }


    /**
     * GET /api/nutrition/barcode?barcode=<UPC>
     *
     * Looks up a food item using a barcode/UPC code.
     * This method delegates to FoodRetrievalService, which wraps USDA’s
     * FDC “food details by barcode” endpoint.
     *
     * @param barcode Example: "041631000564"
     * @return A mapped FoodItemResponse object, or 404 if not found.
     */
    @GetMapping("/barcode")
    public ResponseEntity<?> getFoodByBarcode(@RequestParam String barcode) {

        // Query the service layer
        FoodItemResponse food = foodRetrievalService.getFoodByBarcode(barcode);

        // If no result found in USDA API
        if (food == null) {
            return ResponseEntity.status(404).body("Food item not found");
        }

        // Return structured DTO to frontend
        return ResponseEntity.ok(food);
    }
}