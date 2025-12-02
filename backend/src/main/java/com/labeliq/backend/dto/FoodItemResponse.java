package com.labeliq.backend.dto;

import lombok.Data;

@Data
public class FoodItemResponse {

    // Basic info
    private String description;
    private String brandOwner;
    private String ingredients;

    // Serving
    private Double servingSize;
    private String servingSizeUnit;

    // Nutrients
    private Double calories;   // 1008
    private Double protein;    // 1003
    private Double carbs;      // 1005
    private Double fat;        // 1004
    private Double fiber;      // 1079
    private Double sodium;     // 1093

    public Double getCalories() {
        return calories;
    }
    public Double getProtein() {
        return protein;
    }
    public Double getCarbs() {
        return carbs;
    }
    public Double getFat() {
        return fat;
    }
    public Double getFiber() {
        return fiber;
    }
    public Double getSodium() {
        return sodium;
    }
}

