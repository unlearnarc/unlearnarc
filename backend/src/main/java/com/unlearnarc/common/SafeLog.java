package com.unlearnarc.common;

/** Bounded, single-line fields for structured logs. Never pass secrets to this helper. */
public final class SafeLog {
    private SafeLog() {}

    public static String field(Object value) {
        if (value == null) return "unknown";
        String text = value.toString();
        StringBuilder safe = new StringBuilder(Math.min(text.length(), 128));
        text.codePoints().limit(128).forEach(cp -> {
            int type = Character.getType(cp);
            if (Character.isISOControl(cp) || type == Character.FORMAT
                    || type == Character.LINE_SEPARATOR || type == Character.PARAGRAPH_SEPARATOR) {
                safe.append('_');
            } else {
                safe.appendCodePoint(cp);
            }
        });
        return safe.toString();
    }
}
