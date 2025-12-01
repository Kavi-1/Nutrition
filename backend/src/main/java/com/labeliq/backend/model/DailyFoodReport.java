package com.labeliq.backend.model;
import java.util.List;

import com.labeliq.backend.dto.FoodItemResponse;

public class DailyFoodReport {
    private double dailyScore;
    private List<FoodItemResponse> foodItems; // List of food items for the day

    // Getters and setters
    public double getDailyScore() {
        return dailyScore;
    }

    public void setDailyScore(double dailyScore) {
        this.dailyScore = dailyScore;
    }

    public List<FoodItemResponse> getFoodItems() {
        return foodItems;
    }

    public void setFoodItems(List<FoodItemResponse> foodItems) {
        this.foodItems = foodItems;
    }
}
