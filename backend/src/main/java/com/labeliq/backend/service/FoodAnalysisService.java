package com.labeliq.backend.service;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.labeliq.backend.controller.NutritionAPIController;

@Service
public class FoodAnalysisService {

    private final ImageClassifierService imageClassifierService;
    private final NutritionAPIController nutritionAPI;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public FoodAnalysisService(
            ImageClassifierService imageClassifierService,
            NutritionAPIController nutritionAPI) {
        this.imageClassifierService = imageClassifierService;
        this.nutritionAPI = nutritionAPI;
    }

    public JsonNode analyzeFood(String imageUrl) throws Exception {
        Object classification = imageClassifierService.classifyImage(imageUrl);
        JsonNode classificationJson = objectMapper.valueToTree(classification);
        String predictedFood =
                classificationJson.path("category").path("name").asText();
        if (predictedFood == null || predictedFood.isEmpty()) {
            predictedFood = "unknown food";
        }
        String nutritionRaw = nutritionAPI.getFoodData(predictedFood).getBody();
        JsonNode nutritionJson = objectMapper.readTree(nutritionRaw);
        ObjectNode result = objectMapper.createObjectNode();
        result.put("imageUrl", imageUrl);
        result.put("predictedFood", predictedFood);
        result.set("classification", classificationJson);
        result.set("nutrition", nutritionJson);
        return result;
    }
}
