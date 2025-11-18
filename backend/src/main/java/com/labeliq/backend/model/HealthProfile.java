package com.labeliq.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "health_profiles")
public class HealthProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Integer age;
    private Double height; // in cm
    private Double weight; // in kg
    private String gender;
    @ElementCollection
    @CollectionTable(name = "user_allergies", joinColumns = @JoinColumn(name = "health_profile_id"))
    private List<String> allergies = new ArrayList<>();
    private String dietaryPreference;
}
