package com.labeliq.backend.dto;

import com.labeliq.backend.model.Role;
import lombok.Data;

@Data
public class RegisterRequest {
    private String username;
    private String password;
    private String firstName;
    private String lastName;
    private Role role;
}