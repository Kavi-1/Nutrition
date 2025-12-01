package com.labeliq.backend.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.labeliq.backend.dto.FoodItemResponse;
import com.labeliq.backend.model.DailyFoodReport;
import com.labeliq.backend.model.HealthGoal;
import com.labeliq.backend.model.HealthProfile;

@Service
public class DailyReportService {

    @Autowired
    private FoodAnalysisService foodAnalysisService;

    public DailyFoodReport generateReport(List<FoodItemResponse> foodItems, HealthProfile user, HealthGoal healthGoal) {
        double dailyScore = calculateDailyFoodScore(foodItems, user, healthGoal);
        
        DailyFoodReport report = new DailyFoodReport();
        report.setDailyScore(dailyScore);
        report.setFoodItems(foodItems);
        return report;
    }
    public double calculateDailyFoodScore(List<FoodItemResponse> foodItems, HealthProfile user, HealthGoal healthGoal) {
        double totalScore = 0;
        for (FoodItemResponse foodItem : foodItems) {
            totalScore += foodAnalysisService.calculateFoodScore(foodItem, user, healthGoal);
        }
        return totalScore / foodItems.size();
    }
}