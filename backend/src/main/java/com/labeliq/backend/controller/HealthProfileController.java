package com.labeliq.backend.controller;

import com.labeliq.backend.dto.HealthProfileUpdateRequest;
import com.labeliq.backend.model.HealthProfile;
import com.labeliq.backend.service.HealthProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class HealthProfileController {

    private final HealthProfileService healthProfileService;

    @GetMapping("/me")
    public ResponseEntity<HealthProfile> getMyProfile() {
        return ResponseEntity.ok(healthProfileService.getMyProfile());
    }

    @PutMapping("/me")
    public ResponseEntity<HealthProfile> updateMyProfile(
            @RequestBody HealthProfileUpdateRequest profile
    ) {
        return ResponseEntity.ok(healthProfileService.updateMyProfile(profile));
    }
}
