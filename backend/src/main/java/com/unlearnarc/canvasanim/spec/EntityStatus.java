package com.unlearnarc.canvasanim.spec;

/**
 * Semantic lifecycle status of an animated entity at a keyframe.
 *
 * EXTENSIBILITY: add a new status here (e.g. {@code STALE}, {@code BLOCKED}) and
 * map it to a colour in the frontend {@code canvasDraw.resolveTheme}. No DB
 * migration is needed because keyframes are stored as JSON text.
 */
public enum EntityStatus {
    IDLE, ACTIVE, LOCKED, WAITING, SUCCESS, FAILED, RETRY, DONE
}
