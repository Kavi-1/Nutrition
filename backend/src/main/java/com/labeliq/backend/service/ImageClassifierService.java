package com.labeliq.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.spoonacular.MiscApi;
import com.spoonacular.client.ApiClient;
import com.spoonacular.client.ApiException;
import com.spoonacular.client.Configuration;
import com.spoonacular.client.auth.ApiKeyAuth;

@Service
public class ImageClassifierService {
    private final MiscApi api;
    
    public ImageClassifierService(@Value("${spoonacular.api.key}") String apiKey) {
        ApiClient client = Configuration.getDefaultApiClient();
        client.setBasePath("https://api.spoonacular.com");
        ApiKeyAuth apiKeyAuth = (ApiKeyAuth) client.getAuthentication("apiKeyScheme");
        apiKeyAuth.setApiKey(apiKey);
        apiKeyAuth.setApiKeyPrefix(null);
        this.api = new MiscApi(client);
    }

    public Object classifyImage(String imageUrl) throws ApiException {
        return api.imageClassificationByURL(imageUrl);
    }
}