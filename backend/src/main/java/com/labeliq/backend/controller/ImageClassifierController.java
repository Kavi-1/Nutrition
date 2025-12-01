package com.labeliq.backend.controller;

import com.labeliq.backend.dto.FoodAnalysisResult;
import com.labeliq.backend.service.FoodVisionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import com.labeliq.backend.service.ImageClassifierService;
import com.spoonacular.client.ApiException;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/classify")
public class ImageClassifierController {

    private final ImageClassifierService classifierService;
    private final FoodVisionService foodVisionService;

    @GetMapping
    public Object classify(@RequestParam String imageUrl) throws ApiException {
        return classifierService.classifyImage(imageUrl);
    }

    @PostMapping("/analyze")
    public FoodAnalysisResult analyzeFood(@RequestParam String imageUrl) {
        return foodVisionService.analyzeImage(imageUrl);
    }
}