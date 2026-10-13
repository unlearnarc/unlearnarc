package com.unlearnarc.common.openapi;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * Central OpenAPI (OAS 3.1) definition for the UnlearnArc backend.
 *
 * - Swagger UI:  http://localhost:8085/swagger-ui.html
 * - JSON spec:   http://localhost:8085/v3/api-docs
 * - YAML spec:   http://localhost:8085/v3/api-docs.yaml
 *
 * A "bearerAuth" security scheme is registered so the "Authorize" button in
 * Swagger UI lets you paste a JWT (obtained from POST /api/v1/auth/login).
 */
@Configuration
public class OpenApiConfig {

    private static final String BEARER_SCHEME = "bearerAuth";

    @Bean
    public OpenAPI unlearnArcOpenAPI(@Value("${server.port:8085}") int port) {
        return new OpenAPI()
                .info(new Info()
                        .title("UnlearnArc Backend API")
                        .description("REST API for the UnlearnArc learning platform "
                                + "(courses, contests, algo-viz, animations, etc.).")
                        .version("v1")
                        .contact(new Contact().name("UnlearnArc").email("unlearnarc@gmail.com"))
                        .license(new License().name("Proprietary")))
                .servers(List.of(
                        new Server().url("http://localhost:" + port).description("Local dev")))
                // Apply JWT bearer auth globally; public endpoints simply ignore it.
                .addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME))
                .components(new Components().addSecuritySchemes(BEARER_SCHEME,
                        new SecurityScheme()
                                .name(BEARER_SCHEME)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Paste the JWT from POST /api/v1/auth/login")));
    }
}
