package com.labeliq.backend.service;

import com.labeliq.backend.dto.HealthProfileUpdateRequest;
import com.labeliq.backend.model.HealthProfile;
import com.labeliq.backend.model.User;
import com.labeliq.backend.repository.HealthProfileRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class HealthProfileServiceTest {

    @Mock
    private HealthProfileRepository repo;

    @Mock
    private UserService userService;

    @InjectMocks
    private HealthProfileService service;

    private User mockUser;
    private HealthProfile mockProfile;

    @BeforeEach
    void setup() {
        MockitoAnnotations.openMocks(this);

        mockUser = new User();
        mockUser.setId(1L);

        mockProfile = new HealthProfile();
        mockProfile.setAge(25);
        mockProfile.setHeight(170.0);
        mockProfile.setWeight(60.0);
        mockProfile.setGender("Male");
        mockProfile.setUser(mockUser);
    }

    @Test
    void getMyProfile_success() {
        when(userService.getCurrentUser()).thenReturn(mockUser);
        when(repo.findByUser(mockUser)).thenReturn(Optional.of(mockProfile));

        HealthProfile profile = service.getMyProfile();

        assertNotNull(profile);
        assertEquals(25, profile.getAge());
        verify(repo, times(1)).findByUser(mockUser);
    }

    @Test
    void getMyProfile_profileNotFound() {
        when(userService.getCurrentUser()).thenReturn(mockUser);
        when(repo.findByUser(mockUser)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(
                RuntimeException.class,
                () -> service.getMyProfile()
        );

        assertEquals("Profile not found", ex.getMessage());
    }

    @Test
    void updateMyProfile_success() {
        when(userService.getCurrentUser()).thenReturn(mockUser);
        when(repo.findByUser(mockUser)).thenReturn(Optional.of(mockProfile));
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0)); // return saved object

        HealthProfileUpdateRequest req = new HealthProfileUpdateRequest();
        req.setAge(30);
        req.setHeight(175.0);
        req.setWeight(65.0);
        req.setGender("Female");
        req.setAllergies(List.of("Peanuts"));
        req.setDietaryPreference("Vegan");

        HealthProfile result = service.updateMyProfile(req);

        assertEquals(30, result.getAge());
        assertEquals(175.0, result.getHeight());
        assertEquals(65.0, result.getWeight());
        assertEquals("Female", result.getGender());
        assertEquals(List.of("Peanuts"), result.getAllergies());
        assertEquals("Vegan", result.getDietaryPreference());

        verify(repo, times(1)).save(result);
    }
}
