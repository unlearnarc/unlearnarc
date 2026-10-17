package com.unlearnarc.search.core;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.ResourceLock;

import java.util.Locale;

import static org.assertj.core.api.Assertions.assertThat;

class SearchScoringTest {
    @Test
    @ResourceLock("default-locale")
    void caseInsensitiveMatchingDoesNotDependOnDefaultLocale() {
        Locale original = Locale.getDefault();
        try {
            Locale.setDefault(Locale.forLanguageTag("tr-TR"));
            assertThat(SearchScoring.scoreField("INSERT", "insert")).isEqualTo(100d);
            assertThat(SearchScoring.scoreField("Introduction to Java", "INTRO")).isEqualTo(80d);
        } finally {
            Locale.setDefault(original);
        }
    }

    @Test
    void preservesBrowseAndWeightedRanking() {
        assertThat(SearchScoring.scoreField(null, "java")).isZero();
        assertThat(SearchScoring.scoreField("Java", " ")).isEqualTo(SearchScoring.BROWSE_BASELINE);
        assertThat(SearchScoring.scoreField("Java", "python")).isZero();
        assertThat(SearchScoring.scoreBest("java", "Java", 2, "Java course", 1)).isEqualTo(200d);
    }
}
