package com.unlearnarc.canvasanim.spec;

/** Thrown when an animation trace is structurally invalid. */
public class TraceValidationException extends RuntimeException {
    public TraceValidationException(String message) {
        super(message);
    }
}
