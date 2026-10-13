package com.unlearnarc.common;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

/**
 * Exposes a system-default {@link Clock} bean so time-dependent services
 * (e.g. the daily streak engine) can inject it and be tested deterministically
 * by swapping in {@code Clock.fixed(...)}.
 */
@Configuration
public class ClockConfig {

    @Bean
    public Clock clock() {
        return Clock.systemDefaultZone();
    }
}
