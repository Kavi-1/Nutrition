package com.labeliq.backend.service;

import com.spoonacular.MiscApi;
import com.spoonacular.client.ApiException;
import com.spoonacular.client.model.ImageClassificationByURL200Response;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ImageClassifierServiceTest {

    private ImageClassifierService service;
    private MiscApi mockApi;

    @BeforeEach
    void setup() throws Exception {
        // Create service (constructor builds a real api internally)
        service = new ImageClassifierService("dummy-key");

        // Replace internal api with our Mockito mock
        mockApi = mock(MiscApi.class);
        Field apiField = ImageClassifierService.class.getDeclaredField("api");
        apiField.setAccessible(true);
        apiField.set(service, mockApi);
    }

    @Test
    void classifyImage_success() throws Exception {
        // Create fake Spoonacular response
        ImageClassificationByURL200Response fakeResponse =
                new ImageClassificationByURL200Response();

        when(mockApi.imageClassificationByURL("img.jpg"))
                .thenReturn(fakeResponse);

        Object result = service.classifyImage("img.jpg");

        assertNotNull(result);
        assertSame(fakeResponse, result);

        verify(mockApi, times(1)).imageClassificationByURL("img.jpg");
    }

    @Test
    void classifyImage_throwsApiException() throws Exception {
        when(mockApi.imageClassificationByURL("bad.jpg"))
                .thenThrow(new ApiException("API failure"));

        assertThrows(ApiException.class,
                () -> service.classifyImage("bad.jpg"));

        verify(mockApi).imageClassificationByURL("bad.jpg");
    }
}
