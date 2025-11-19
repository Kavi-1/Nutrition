package com.labeliq.backend.dto;

import lombok.Data;

import java.util.List;

@Data
public class FoodSearchItem {
    private long fdcId;
    private String description;
    private String brandOwner;
    private String ingredients;
    private Double servingSize;
    private String servingSizeUnit;

    private List<FoodNutrient> foodNutrients;
}

