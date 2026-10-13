package com.unlearnarc;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class UnlearnArcApplication {
    public static void main(String[] args) {
        SpringApplication.run(UnlearnArcApplication.class, args);
    }
}
