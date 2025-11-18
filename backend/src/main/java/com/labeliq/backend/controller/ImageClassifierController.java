package com.labeliq.backend.controller;

import org.springframework.web.bind.annotation.*;

import com.labeliq.backend.service.ImageClassifierService;
import com.spoonacular.client.ApiException;

@RestController
@RequestMapping("/api/classify")
public class ImageClassifierController {

    private final ImageClassifierService classifierService;

    public ImageClassifierController(ImageClassifierService classifierService) {
        this.classifierService = classifierService;
    }

    @GetMapping
    public Object classify(@RequestParam String imageUrl) throws ApiException {
        return classifierService.classifyImage(imageUrl);
    }
}

