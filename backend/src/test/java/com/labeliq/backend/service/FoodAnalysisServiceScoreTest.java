package com.labeliq.backend.service;

import com.labeliq.backend.dto.FoodItemResponse;
import com.labeliq.backend.model.HealthGoal;
import com.labeliq.backend.model.HealthProfile;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class FoodAnalysisServiceScoreTest {

    private FoodAnalysisService service;

    @BeforeEach
    void setup() {
        // analyzeFood() isn't tested here → dependencies set to null
        service = new FoodAnalysisService(null, null);
    }

    private HealthProfile profileMale() {
        HealthProfile p = new HealthProfile();
        p.setAge(25);
        p.setHeight(175.0);
        p.setWeight(70.0);
        p.setGender("MALE");
        return p;
    }

    private FoodItemResponse sampleItem() {
        FoodItemResponse f = new FoodItemResponse();
        f.setCalories(300.0);
        f.setCarbs(40.0);
        f.setProtein(20.0);
        f.setFat(10.0);
        f.setFiber(5.0);
        f.setSodium(500.0);
        return f;
    }

    private void assertValidScore(double score) {
        assertFalse(Double.isNaN(score));
        assertFalse(Double.isInfinite(score));
    }

    @Test
    void calculateFoodScore_loseWeight() {
        double score = service.calculateFoodScore(
                sampleItem(), profileMale(), HealthGoal.LOSE_WEIGHT);
        assertValidScore(score);
    }

    @Test
    void calculateFoodScore_femaleProfile_executesFemaleTDEEBranch() {
        HealthProfile female = new HealthProfile();
        female.setAge(25);
        female.setHeight(165.0);
        female.setWeight(60.0);
        female.setGender("FEMALE");

        double score = service.calculateFoodScore(
                sampleItem(), female, HealthGoal.MAINTAIN_HEALTH
        );

        assertValidScore(score);
    }

    @Test
    void calculateFoodScore_gainMuscle() {
        double score = service.calculateFoodScore(
                sampleItem(), profileMale(), HealthGoal.GAIN_MUSCLE);
        assertValidScore(score);
    }

    @Test
    void calculateFoodScore_endurance() {
        double score = service.calculateFoodScore(
                sampleItem(), profileMale(), HealthGoal.IMPROVE_ENDURANCE);
        assertValidScore(score);
    }

    @Test
    void calculateFoodScore_flexibility() {
        double score = service.calculateFoodScore(
                sampleItem(), profileMale(), HealthGoal.INCREASE_FLEXIBILITY);
        assertValidScore(score);
    }

    @Test
    void calculateFoodScore_maintainHealth() {
        double score = service.calculateFoodScore(
                sampleItem(), profileMale(), HealthGoal.MAINTAIN_HEALTH);
        assertValidScore(score);
    }

    @Test
    void calculateFoodScore_handlesNullValues_gracefully() {
        FoodItemResponse empty = new FoodItemResponse(); // all nulls
        double score = service.calculateFoodScore(
                empty, profileMale(), HealthGoal.MAINTAIN_HEALTH);

        assertValidScore(score);
    }
}
