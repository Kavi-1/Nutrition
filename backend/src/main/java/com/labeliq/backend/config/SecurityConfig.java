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

                // make login/register public, require auth for everything else
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**").permitAll()
                        .anyRequest().authenticated());

        http.addFilterBefore(jwtAuthenticationFilter,
                org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class);

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
        config.setAllowedOrigins(List.of("*"));     // allow ALL ORIGINS
        config.setAllowedMethods(List.of("*"));     // allow ALL METHODS
        config.setAllowedHeaders(List.of("*"));     // allow ALL HEADERS
        config.setAllowCredentials(false);          // must be false when using "*"

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
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}