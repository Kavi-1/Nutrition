package com.labeliq.backend.dto;

import lombok.Data;

import java.util.List;

@Data
public class HealthProfileUpdateRequest {
    private Integer age;
    private Double height;
    private Double weight;
    private String gender;
    private List<String> allergies;
    private String dietaryPreference;
}
