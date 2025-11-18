package com.labeliq.backend.repository;

import com.labeliq.backend.model.HealthProfile;
import com.labeliq.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface HealthProfileRepository extends JpaRepository<HealthProfile, Long> {
    Optional<HealthProfile> findByUser(User user);
}
