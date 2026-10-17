package com.unlearnarc.security;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.unlearnarc.security.interceptor.RequestLoggingInterceptor;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.servlet.HandlerMapping;
import static org.assertj.core.api.Assertions.assertThat;

class RequestLoggingTest {
    @Test void logsRoutePatternWithoutPersonalDataOrInjectedLines() {
        Logger logger = (Logger) LoggerFactory.getLogger(RequestLoggingInterceptor.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            var request = new MockHttpServletRequest("GET", "/users/private@example.com");
            request.setQueryString("token=private-token");
            request.addHeader("X-Forwarded-For", "secret-ip\r\nforged");
            request.setAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE, "/users/{id}\r\nforged");
            var response = new MockHttpServletResponse();
            var interceptor = new RequestLoggingInterceptor();
            interceptor.preHandle(request, response, this);
            interceptor.afterCompletion(request, response, this, new RuntimeException("private-token"));
            assertThat(appender.list).hasSize(1);
            assertThat(appender.list.getFirst().getFormattedMessage())
                    .contains("route=/users/{id}__forged", "status=200", "outcome=failed")
                    .doesNotContain("private@example.com", "private-token", "secret-ip", "\r", "\n");
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }
    }
}
