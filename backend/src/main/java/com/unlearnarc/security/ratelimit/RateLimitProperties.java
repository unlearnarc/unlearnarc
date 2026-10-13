package com.unlearnarc.security.ratelimit;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.rate-limit")
@Getter
@Setter
public class RateLimitProperties {

    private Bucket login = new Bucket();
    private Bucket api   = new Bucket();

    @Getter
    @Setter
    public static class Bucket {
        private int capacity      = 10;
        private int refillTokens  = 10;
        private int refillSeconds = 60;
    }
}
