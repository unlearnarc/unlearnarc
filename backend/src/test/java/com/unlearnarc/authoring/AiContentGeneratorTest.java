package com.unlearnarc.authoring;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class AiContentGeneratorTest {
    @Test void missingKeyDisablesGenerationWithoutCallingProvider() {
        var generator = new AiContentGenerator(new ObjectMapper(), "", "gpt-4o-mini");
        assertFalse(generator.configured());
        var error = assertThrows(IllegalStateException.class, () -> generator.generate("contract", Map.of(), "hello"));
        assertTrue(error.getMessage().contains("AI_API_KEY"));
    }
}
