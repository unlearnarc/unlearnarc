package com.unlearnarc.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;

import com.fasterxml.jackson.databind.JsonNode;

import static org.assertj.core.api.Assertions.assertThat;

/** Checks the public Render health endpoint over a real HTTP connection. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class StartupHealthIT {

    @Autowired
    private TestRestTemplate rest;

    @Autowired
    private Environment environment;

    @Test
    void startsOnAnExternallyBindableAddressAndServesHealthWithoutAuthentication() {
        assertThat(environment.getProperty("server.address")).isEqualTo("0.0.0.0");

        var response = rest.getForEntity("/api/v1/auth/health", JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().path("success").asBoolean()).isTrue();
    }
}
