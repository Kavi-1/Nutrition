package com.labeliq.backend.dto;

import lombok.Data;

import java.util.List;

@Data
public class FoodSearchResponse {
    private int totalHits;
    private List<FoodSearchItem> foods;
}

