package com.labeliq.backend.service;

import com.labeliq.backend.dto.HealthProfileUpdateRequest;
import com.labeliq.backend.model.HealthProfile;
import com.labeliq.backend.model.User;
import com.labeliq.backend.repository.HealthProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class HealthProfileService {

    private final HealthProfileRepository healthProfileRepository;
    private final UserService userService;

    public HealthProfile getMyProfile() {
        User currentUser = userService.getCurrentUser();
        return healthProfileRepository.findByUser(currentUser)
                .orElseThrow(() -> new RuntimeException("Profile not found"));
    }

    public HealthProfile updateMyProfile(HealthProfileUpdateRequest updated) {
        HealthProfile profile = getMyProfile();
        profile.setAge(updated.getAge());
        profile.setHeight(updated.getHeight());
        profile.setWeight(updated.getWeight());
        profile.setGender(updated.getGender());
        profile.setAllergies(updated.getAllergies());
        profile.setDietaryPreference(updated.getDietaryPreference());
        return healthProfileRepository.save(profile);
    }
}
