package com.unlearnarc.algoviz.spec;

/** Thrown when an admin-supplied frame spec is structurally invalid. */
public class SpecValidationException extends RuntimeException {
    public SpecValidationException(String message) {
        super(message);
    }
}
