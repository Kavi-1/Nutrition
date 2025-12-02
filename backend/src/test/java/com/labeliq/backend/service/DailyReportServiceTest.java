package com.labeliq.backend.service;

import com.labeliq.backend.dto.FoodItemResponse;
import com.labeliq.backend.model.DailyFoodReport;
import com.labeliq.backend.model.HealthGoal;
import com.labeliq.backend.model.HealthProfile;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.*;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class DailyReportServiceTest {

    @Mock
    private FoodAnalysisService foodAnalysisService;

    @InjectMocks
    private DailyReportService dailyReportService;

    private HealthProfile profile;
    private FoodItemResponse itemA;
    private FoodItemResponse itemB;

    @BeforeEach
    void setup() {
        MockitoAnnotations.openMocks(this);

        profile = new HealthProfile();
        profile.setAge(25);
        profile.setHeight(175.0);
        profile.setWeight(70.0);
        profile.setGender("MALE");

        itemA = new FoodItemResponse();
        itemA.setCalories(200.0);

        itemB = new FoodItemResponse();
        itemB.setCalories(500.0);
    }

    @Test
    void calculateDailyFoodScore_success() {
        when(foodAnalysisService.calculateFoodScore(itemA, profile, HealthGoal.MAINTAIN_HEALTH))
                .thenReturn(50.0);
        when(foodAnalysisService.calculateFoodScore(itemB, profile, HealthGoal.MAINTAIN_HEALTH))
                .thenReturn(70.0);

        double score = dailyReportService.calculateDailyFoodScore(
                List.of(itemA, itemB),
                profile,
                HealthGoal.MAINTAIN_HEALTH
        );

        assertEquals(60.0, score);
        verify(foodAnalysisService, times(2))
                .calculateFoodScore(any(), any(), any());
    }

    @Test
    void generateReport_success() {
        when(foodAnalysisService.calculateFoodScore(any(), any(), any()))
                .thenReturn(100.0);

        DailyFoodReport report = dailyReportService.generateReport(
                List.of(itemA),
                profile,
                HealthGoal.MAINTAIN_HEALTH
        );

        assertNotNull(report);
        assertEquals(100.0, report.getDailyScore());
        assertEquals(1, report.getFoodItems().size());
    }

    @Test
    void calculateDailyFoodScore_emptyList_returnsNaN() {
        double score = dailyReportService.calculateDailyFoodScore(
                List.of(),
                profile,
                HealthGoal.MAINTAIN_HEALTH
        );

        assertTrue(Double.isNaN(score)); // division by zero
    }
}
