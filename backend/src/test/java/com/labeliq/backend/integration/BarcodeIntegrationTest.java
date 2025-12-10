package com.labeliq.backend.integration;

import com.labeliq.backend.dto.FoodNutrient;
import com.labeliq.backend.dto.FoodSearchItem;
import com.labeliq.backend.dto.FoodSearchResponse;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.client.RestTemplate;

import java.util.List;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class BarcodeIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RestTemplate restTemplate; // mocked from config

    @Test
    void barcodeLookup_returnsItem() throws Exception {

        FoodNutrient cal = new FoodNutrient();
        cal.setNutrientId(1008);
        cal.setValue(120.0);

        FoodNutrient protein = new FoodNutrient();
        protein.setNutrientId(1003);
        protein.setValue(8.0);

        FoodNutrient sodium = new FoodNutrient();
        sodium.setNutrientId(1093);
        sodium.setValue(340.0);

        FoodSearchItem item = new FoodSearchItem();
        item.setDescription("Greek Yogurt");
        item.setBrandOwner("Chobani");
        item.setIngredients("Milk, Cultures");
        item.setServingSize(150.0);
        item.setServingSizeUnit("g");
        item.setFoodNutrients(List.of(cal, protein, sodium));

        FoodSearchResponse response = new FoodSearchResponse();
        response.setFoods(List.of(item));

        when(restTemplate.getForObject(anyString(), Mockito.eq(FoodSearchResponse.class)))
                .thenReturn(response);

        mockMvc.perform(get("/api/nutrition/barcode")
                        .param("barcode", "12345")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.description").value("Greek Yogurt"))
                .andExpect(jsonPath("$.brandOwner").value("Chobani"))
                .andExpect(jsonPath("$.ingredients").value("Milk, Cultures"))
                .andExpect(jsonPath("$.servingSize").value(150.0))
                .andExpect(jsonPath("$.servingSizeUnit").value("g"))
                .andExpect(jsonPath("$.calories").value(120.0))
                .andExpect(jsonPath("$.protein").value(8.0))
                .andExpect(jsonPath("$.sodium").value(340.0));
    }

    @Test
    void barcodeLookup_notFound_returns404() throws Exception {

        FoodSearchResponse response = new FoodSearchResponse();
        response.setFoods(List.of());

        when(restTemplate.getForObject(anyString(), Mockito.eq(FoodSearchResponse.class)))
                .thenReturn(response);

        mockMvc.perform(get("/api/nutrition/barcode")
                        .param("barcode", "99999"))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Food item not found"));
    }
}
