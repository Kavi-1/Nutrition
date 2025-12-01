package com.labeliq.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;

import com.labeliq.backend.dto.FoodAnalysisResult;
import com.openai.client.OpenAIClient;
import com.openai.models.ChatModel;
import com.openai.models.chat.completions.ChatCompletion;
import com.openai.models.chat.completions.ChatCompletionCreateParams;

import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FoodVisionService {

    private final OpenAIClient openAIClient;
    private final ObjectMapper objectMapper;

    public FoodAnalysisResult analyzeImage(String imageUrl) {

        String systemPrompt = """
    You are an expert nutritionist and food recognition model.

    The user will provide a PUBLIC IMAGE URL of a single plate / cup / bowl of food.
    Your job is to:
    1. Infer the specific dish (e.g. "pepperoni pizza slice", "chicken burrito", "margherita pizza").
    2. Infer the approximate serving size from what is visible (e.g. "1 slice", "roughly 250g", "medium bowl").
    3. Estimate realistic macro-nutrients for THAT PORTION ONLY using typical values from USDA-style data.

    Return your answer as STRICT JSON ONLY.
    Do NOT include explanations outside the JSON, no prose, no markdown.

    The JSON must have this exact shape:

    {
      "foodName": "string - short human-readable name of the dish",
      "servingDescription": "string - how much food is on the plate (e.g. '1 large slice', 'medium bowl')",
      "calories": 0,
      "proteinGrams": 0.0,
      "carbGrams": 0.0,
      "fatGrams": 0.0,
      "fiberGrams": 0.0,
      "confidence": 0.0,
      "reasoning": "short explanation of how you estimated the macros and any uncertainty"
    }

    Rules:
    - ALWAYS return valid JSON parsable by standard JSON libraries.
    - Use lower-case keys exactly as shown.
    - If you are unsure, still make your best estimate but lower confidence.
    """;


        String userPrompt = "Analyze this food image: " + imageUrl;

        ChatCompletionCreateParams params = ChatCompletionCreateParams.builder()
                .addSystemMessage(systemPrompt)
                .addUserMessage(userPrompt)
                .model(ChatModel.GPT_4_1)
                .build();

        ChatCompletion completion = openAIClient.chat()
                .completions()
                .create(params);

        String content = completion.choices()
                .get(0)
                .message()
                .content()
                .orElseThrow();

        try {
            return objectMapper.readValue(content, FoodAnalysisResult.class);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Invalid JSON from model: " + content, e);
        }
    }
}
