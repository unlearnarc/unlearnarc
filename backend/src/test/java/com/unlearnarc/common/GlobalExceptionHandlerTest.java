package com.unlearnarc.common;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

import static org.junit.jupiter.api.Assertions.*;

class GlobalExceptionHandlerTest {
    @Test
    void logsNestedLinkageFailureWithoutLeakingExceptionMessages() {
        Logger logger = (Logger) LoggerFactory.getLogger(GlobalExceptionHandler.class);
        var events = new ListAppender<ILoggingEvent>();
        events.start();
        logger.addAppender(events);
        try {
            var failure = new ServletException("private request data",
                    new NoSuchMethodError("private implementation details"));
            var response = new GlobalExceptionHandler().handleGeneric(failure);
            assertEquals(500, response.getStatusCode().value());
            assertEquals(1, events.list.size());
            var event = events.list.getFirst();
            assertTrue(event.getFormattedMessage().contains("type=ServletException"));
            assertTrue(event.getFormattedMessage().contains("causeType=NoSuchMethodError"));
            assertFalse(event.getFormattedMessage().contains("private"));
            assertNull(event.getThrowableProxy());
        } finally {
            logger.detachAppender(events);
            events.stop();
        }
    }
}
