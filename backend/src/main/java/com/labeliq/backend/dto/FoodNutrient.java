package com.labeliq.backend.dto;

import lombok.Data;

@Data
public class FoodNutrient {
    private int nutrientId;
    private String nutrientName;
    private String unitName;
    private Double value;
}
