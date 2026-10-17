package com.unlearnarc.common;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class SafeLogTest {
    @Test void removesControlAndUnicodeLineCharacters() {
        assertThat(SafeLog.field("abc\r\n\t\u001b\u2028\u2029\u202eend")).isEqualTo("abc_______end");
    }
    @Test void boundsFieldsAndHandlesNull() {
        assertThat(SafeLog.field("a".repeat(1000))).hasSize(128);
        assertThat(SafeLog.field(null)).isEqualTo("unknown");
        assertThat(SafeLog.field("contest-123")).isEqualTo("contest-123");
    }
}
