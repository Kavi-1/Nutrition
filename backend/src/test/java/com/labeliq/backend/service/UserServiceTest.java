package com.labeliq.backend.service;

import com.labeliq.backend.model.User;
import com.labeliq.backend.repository.UserRepository;
import org.junit.jupiter.api.*;
import org.mockito.*;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class UserServiceTest {

    @Mock
    private UserRepository userRepo;

    @InjectMocks
    private UserService userService;

    @Mock
    Authentication authentication;

    @Mock
    SecurityContext securityContext;

    @BeforeEach
    void setup() {
        MockitoAnnotations.openMocks(this);

        SecurityContextHolder.setContext(securityContext);
    }

    @Test
    void getCurrentUser_success() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getName()).thenReturn("john");

        User user = new User();
        user.setUsername("john");

        when(userRepo.findByUsername("john")).thenReturn(Optional.of(user));

        User result = userService.getCurrentUser();

        assertEquals("john", result.getUsername());
        verify(userRepo, times(1)).findByUsername("john");
    }

    @Test
    void getCurrentUser_notFound_throwsException() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getName()).thenReturn("unknown");

        when(userRepo.findByUsername("unknown")).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> userService.getCurrentUser());

        assertEquals("User not found", ex.getMessage());
    }

    @Test
    void getCurrentUser_nullAuth_throwsNullPointer() {
        when(securityContext.getAuthentication()).thenReturn(null);

        assertThrows(NullPointerException.class,
                () -> userService.getCurrentUser());
    }
}
