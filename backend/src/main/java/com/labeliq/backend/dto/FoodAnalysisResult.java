package com.labeliq.backend.dto;

import lombok.Data;

@Data
public class FoodAnalysisResult {
    public String foodName;
    public String servingDescription;
    public int calories;
    public double proteinGrams;
    public double carbGrams;
    public double fatGrams;
    public double fiberGrams;
    public double confidence;
    public String reasoning;
}
