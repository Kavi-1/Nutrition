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

@RestController
@RequestMapping("/api/nutrition")
@RequiredArgsConstructor
public class NutritionAPIController {

    @Value("${nutrition.api.key}")
    private String apiKey;

    @Value("${nutrition.api.url}")
    private String apiUrl;

    private final RestTemplate restTemplate;
    private final FoodRetrievalService foodRetrievalService;

    @GetMapping("/food")
    public ResponseEntity<String> getFoodData(@RequestParam String name) {
        String url = apiUrl + "?query=" + name + "&apiKey=" + apiKey;
        String result = restTemplate.getForObject(url, String.class);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/barcode")
    public ResponseEntity<?> getFoodByBarcode(@RequestParam String barcode) {
        FoodItemResponse food = foodRetrievalService.getFoodByBarcode(barcode);
        if (food == null) {
            return ResponseEntity.status(404).body("Food item not found");
        }
        return ResponseEntity.ok(food);
    }
}