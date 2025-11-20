package com.labeliq.backend.config;

import com.labeliq.backend.security.CustomUserDetailsService;
import com.labeliq.backend.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    /**
     * Custom JWT authentication filter that validates tokens
     * before requests reach controller layer.
     */
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    /**
     * Loads user details from database for authentication.
     */
    private final CustomUserDetailsService userDetailsService;

    /**
     * Main Spring Security filter chain.
     *
     * - Disables CSRF (common for stateless APIs)
     * - Enables global CORS configuration
     * - Currently allows ALL requests (development mode)
     *
     * In production, .anyRequest().authenticated() can be restored
     * and JWT filter should be enabled.
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // Disable CSRF for stateless REST APIs
                .csrf(AbstractHttpConfigurer::disable)

                // Enable Cross-Origin Resource Sharing (required for frontend → backend calls)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // Development mode: allow all requests without authentication
                .authorizeHttpRequests(auth -> auth
                        .anyRequest().permitAll()
                );

        // Note: JWT filter intentionally NOT added during development debugging.
        // In production, use:
        // .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)

        return http.build();
    }

    /**
     * Global CORS configuration.
     *
     * Allows local development frontends (Expo Web / React Native)
     * to call the backend without being blocked by browser CORS policies.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // Allow local frontend origins
        config.setAllowedOrigins(List.of(
                "http://localhost:8081",  // Expo Web dev server
                "http://localhost:8082",  // Alternative Expo port
                "http://localhost:19006"  // Expo Go / Metro bundler
        ));

        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        // Apply CORS config to all backend routes
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);

        return source;
    }

    /**
     * Password hashing strategy.
     * BCrypt is industry standard for secure password storage.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Exposes AuthenticationManager so controllers/services
     * can perform username + password authentication.
     */
    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config
    ) throws Exception {
        return config.getAuthenticationManager();
    }
}