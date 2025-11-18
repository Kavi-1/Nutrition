package com.labeliq.backend;

import org.springframework.stereotype.Service;

import com.spoonacular.MiscApi;
import com.spoonacular.client.ApiClient;
import com.spoonacular.client.ApiException;
import com.spoonacular.client.Configuration;
import com.spoonacular.client.auth.ApiKeyAuth;

@Service
public class ImageClassifierController {

    private final MiscApi api;

    public ImageClassifierController() {
        ApiClient client = Configuration.getDefaultApiClient();
        client.setBasePath("https://api.spoonacular.com");
        ApiKeyAuth apiKeyAuth = (ApiKeyAuth) client.getAuthentication("apiKeyScheme");
        apiKeyAuth.setApiKey("bb993e03da1841c8a66c25b00c39699a");
        apiKeyAuth.setApiKeyPrefix("Token");
        this.api = new MiscApi(client);
    }

    public Object classifyImage(String imageUrl) throws ApiException {
        return api.imageClassificationByURL(imageUrl);
    }
}