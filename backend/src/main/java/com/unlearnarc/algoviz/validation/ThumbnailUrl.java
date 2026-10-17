package com.unlearnarc.algoviz.validation;

import java.net.URI;

/** Public image references only; never fetches URLs or accepts embedded image data. */
public final class ThumbnailUrl {
    private ThumbnailUrl() {}

    public static void validate(String value) {
        if (value == null || value.isEmpty()) return;
        try {
            if (value.length() > 1024 || value.indexOf('\\') >= 0 || value.chars().anyMatch(Character::isISOControl)) {
                throw new IllegalArgumentException();
            }
            URI uri = new URI(value);
            // Only the public, locally hosted preview namespace is allowed as a relative reference.
            if (value.matches("/images/algorithms/[a-z0-9-]+\\.svg")) return;
            if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null
                    || uri.getUserInfo() != null || uri.getFragment() != null) {
                throw new IllegalArgumentException();
            }
        } catch (Exception ex) {
            throw new IllegalArgumentException("thumbnailUrl must be an HTTPS URL without credentials or a public /images/algorithms/<slug>.svg path");
        }
    }
}
