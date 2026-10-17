package com.unlearnarc.security.admin;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Single-admin UserDetailsService.
 *
 * The password is BCrypt-encoded ONCE at startup (@PostConstruct) and cached.
 * Encoding on every loadUserByUsername() call is wasteful and causes subtle
 * issues with DaoAuthenticationProvider comparing the stored vs provided hash.
 */
@Slf4j
@Service
public class AdminUserDetailsService implements UserDetailsService {

    private final AdminProperties adminProperties;
    private final PasswordEncoder passwordEncoder;

    /** BCrypt hash of the configured password, computed once at startup. */
    private String hashedPassword;

    public AdminUserDetailsService(AdminProperties adminProperties, PasswordEncoder passwordEncoder) {
        this.adminProperties = adminProperties;
        this.passwordEncoder = passwordEncoder;
    }

    @PostConstruct
    void init() {
        hashedPassword = passwordEncoder.encode(adminProperties.getPassword());
        log.info("[ADMIN] Admin account initialised");
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        if (!adminProperties.getEmail().equalsIgnoreCase(email)) {
            throw new UsernameNotFoundException("No admin account for: " + email);
        }
        return new User(
                adminProperties.getEmail(),
                hashedPassword,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
        );
    }
}
