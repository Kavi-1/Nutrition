package com.labeliq.backend;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

@RestController
@RequestMapping("/api/nutrition")
public class connectionAPI {
    @Value("${nutrition.api.key}")
    private String apiKey;
    @Value("${nutrition.api.url}")
    private String apiUrl;
    private final RestTemplate restTemplate;
    public connectionAPI(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }
    @GetMapping("/food")
    public ResponseEntity<String> getFoodData(@RequestParam String name) {
        String url = apiUrl + "?query=" + name + "&apiKey=" + apiKey;
        String result = restTemplate.getForObject(url, String.class);
        return ResponseEntity.ok(result);
    }
}