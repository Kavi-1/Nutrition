package com.labeliq.backend.service;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.labeliq.backend.controller.NutritionAPIController;
import com.labeliq.backend.dto.FoodItemResponse;
import com.labeliq.backend.model.HealthGoal;
import com.labeliq.backend.model.HealthProfile;

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

    public double calculateFoodScore(FoodItemResponse foodItem, HealthProfile user, HealthGoal healthGoal) {
        double score = 0;

        // Calculate the Total Daily Energy Expenditure
        double tdee = calculateTDEE(user);
        double calorieGoal = setCalorieGoal(healthGoal, tdee);
        switch (healthGoal) {
            case LOSE_WEIGHT:
                score += normalize(foodItem.getCalories() == null ? 0 : foodItem.getCalories(), 0, calorieGoal) * 0.3;
                score -= normalize(foodItem.getCarbs() == null ? 0 : foodItem.getCarbs(), 0, 100) * 0.3;
                score += normalize(foodItem.getProtein() == null ? 0 : foodItem.getProtein(), 0, 30) * 0.2;
                score -= normalize(foodItem.getFat() == null ? 0 : foodItem.getFat(), 0, 20) * 0.2;
                break;
            case GAIN_MUSCLE:
                score += normalize(foodItem.getCalories() == null ? 0 : foodItem.getCalories(), 0, calorieGoal + 300) * 0.2;
                score += normalize(foodItem.getCarbs() == null ? 0 : foodItem.getCarbs(), 0, 150) * 0.2;
                score += normalize(foodItem.getProtein() == null ? 0 : foodItem.getProtein(), 0, 60) * 0.4;
                score += normalize(foodItem.getFat() == null ? 0 : foodItem.getFat(), 0, 40) * 0.2;
                break;
            case IMPROVE_ENDURANCE:
                score += normalize(foodItem.getCalories() == null ? 0 : foodItem.getCalories(), 0, calorieGoal) * 0.25;
                score += normalize(foodItem.getCarbs() == null ? 0 : foodItem.getCarbs(), 0, 150) * 0.4;
                score += normalize(foodItem.getProtein() == null ? 0 : foodItem.getProtein(), 0, 50) * 0.25;
                score += normalize(foodItem.getFat() == null ? 0 : foodItem.getFat(), 0, 30) * 0.1;
                break;
            case INCREASE_FLEXIBILITY:
                score += normalize(foodItem.getCalories() == null ? 0 : foodItem.getCalories(), 0, 500) * 0.3;
                score += normalize(foodItem.getCarbs() == null ? 0 : foodItem.getCarbs(), 0, 100) * 0.2;
                score += normalize(foodItem.getProtein() == null ? 0 : foodItem.getProtein(), 0, 30) * 0.2;
                score += normalize(foodItem.getFat() == null ? 0 : foodItem.getFat(), 0, 40) * 0.2;
                score += normalize(foodItem.getFiber() == null ? 0 : foodItem.getFiber(), 0, 30) * 0.1;
                break;
            case MAINTAIN_HEALTH:
                score += normalize(foodItem.getCalories() == null ? 0 : foodItem.getCalories(), 0, calorieGoal) * 0.2;
                score += normalize(foodItem.getCarbs() == null ? 0 : foodItem.getCarbs(), 0, 150) * 0.2;
                score += normalize(foodItem.getProtein() == null ? 0 : foodItem.getProtein(), 0, 50) * 0.2;
                score += normalize(foodItem.getFat() == null ? 0 : foodItem.getFat(), 0, 30) * 0.2;
                score += normalize(foodItem.getFiber() == null ? 0 : foodItem.getFiber(), 0, 30) * 0.1;
                score -= normalize(foodItem.getSodium() == null ? 0 : foodItem.getSodium(), 0, 2000) * 0.1;
                break;
        }
        return score;
    }

    // Calculate TDEE
    private double calculateTDEE(HealthProfile user) {
        double bmr = 0;
        if (user.getGender().equals("MALE")) {
            bmr = 10 * user.getWeight() + 6.25 * user.getHeight() - 5 * user.getAge() + 5;
        } else if (user.getGender().equals("FEMALE")) {
            bmr = 10 * user.getWeight() + 6.25 * user.getHeight() - 5 * user.getAge() - 161;
        }
        return bmr * 1.375; // Moderate activity
    }

    // Set calorie goal based on the user's health goal and TDEE
    private double setCalorieGoal(HealthGoal healthGoal, double tdee) {
        switch (healthGoal) {
            case LOSE_WEIGHT:
                return tdee-500;
            case GAIN_MUSCLE:
                return tdee+300;
            case MAINTAIN_HEALTH:
                return tdee;
            default:
                return tdee;
        }
    }

    private double normalize(Double value, double min, double max) {
        if (value == null) return 0;
        return (Math.min(Math.max(value, min),max)-min)/(max-min)*100;
    }
}