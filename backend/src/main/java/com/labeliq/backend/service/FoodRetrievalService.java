package com.labeliq.backend.service;

import com.labeliq.backend.dto.FoodItemResponse;
import com.labeliq.backend.dto.FoodNutrient;
import com.labeliq.backend.dto.FoodSearchItem;
import com.labeliq.backend.dto.FoodSearchResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
public class FoodRetrievalService {

    private final RestTemplate restTemplate;

    @Value("${nutrition.api.key}")
    private String apiKey;

    public FoodItemResponse getFoodByBarcode(String barcode) {
        String url =
                "https://api.nal.usda.gov/fdc/v1/foods/search"
                        + "?query=gtinUpc:" + barcode
                        + "&api_key=" + apiKey;
        FoodSearchResponse response =
                restTemplate.getForObject(url, FoodSearchResponse.class);
        if (response == null || response.getFoods() == null || response.getFoods().isEmpty()) {
            return null;
        }
        FoodSearchItem item = response.getFoods().get(0);
        return mapToDto(item);
    }

    private FoodItemResponse mapToDto(FoodSearchItem item) {
        FoodItemResponse dto = new FoodItemResponse();
        dto.setDescription(item.getDescription());
        dto.setBrandOwner(item.getBrandOwner());
        dto.setIngredients(item.getIngredients());
        dto.setServingSize(item.getServingSize());
        dto.setServingSizeUnit(item.getServingSizeUnit());

        if (item.getFoodNutrients() != null) {
            for (FoodNutrient n : item.getFoodNutrients()) {
                switch (n.getNutrientId()) {
                    case 1008 -> dto.setCalories(n.getValue());
                    case 1003 -> dto.setProtein(n.getValue());
                    case 1005 -> dto.setCarbs(n.getValue());
                    case 1004 -> dto.setFat(n.getValue());
                    case 1079 -> dto.setFiber(n.getValue());
                    case 1093 -> dto.setSodium(n.getValue());
                }
            }
        }
        return dto;
    }
}
