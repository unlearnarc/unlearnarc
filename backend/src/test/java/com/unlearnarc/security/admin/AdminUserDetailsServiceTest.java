package com.unlearnarc.security.admin;

import org.junit.jupiter.api.Test;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AdminUserDetailsServiceTest {

    @Test
    void constructsAndEncodesConfiguredPasswordOnlyOnce() {
        AdminProperties properties = new AdminProperties();
        properties.setEmail("admin@example.test");
        properties.setPassword("test-password");
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        when(encoder.encode("test-password")).thenReturn("encoded-password");

        AdminUserDetailsService service = new AdminUserDetailsService(properties, encoder);
        service.init();
        var user = service.loadUserByUsername("ADMIN@example.test");
        service.loadUserByUsername("admin@example.test");

        assertEquals("admin@example.test", user.getUsername());
        assertEquals("encoded-password", user.getPassword());
        assertTrue(user.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN")));
        verify(encoder, times(1)).encode("test-password");
    }

    @Test
    void rejectsUnknownAdmin() {
        AdminProperties properties = new AdminProperties();
        properties.setEmail("admin@example.test");
        AdminUserDetailsService service = new AdminUserDetailsService(
                properties, mock(PasswordEncoder.class));

        assertThrows(UsernameNotFoundException.class,
                () -> service.loadUserByUsername("unknown@example.test"));
    }
}
