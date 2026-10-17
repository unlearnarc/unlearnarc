import './mascot.states.js';

export type MascotState = 'happy' | 'sleepy' | 'excited' | 'sad' | 'walking' | 'sleeping' | 'greeting' | 'thinking' | 'surprised';
export interface MascotPath { tag: 'path'; d: string; fill: string; stroke: string; strokeWidth: number; strokeLinecap: 'round'; strokeLinejoin: 'round'; _group: string }
export interface MascotTuning {
  ground: number;
  anchors: Record<'feet' | 'body' | 'head' | 'leftArm' | 'rightArm', [number, number]>;
  transition: { durationMs: number; easing: string };
  breathing: { amplitude: number; duration: number };
  blink: { interval: number; variation: number; duration: number };
  poses: Record<MascotState, { headRotation: number; leftArm: number; rightArm: number; bodyY: number; bounce: number }>;
  assets: Record<MascotState, string>;
}
declare global {
  interface Window {
    STATES_DATA: Record<MascotState, { paths: Record<string, MascotPath> }>;
    MASCOT_TUNING: MascotTuning;
  }
}
export const mascotStates = window.STATES_DATA;
export const mascotTuning = window.MASCOT_TUNING;
export const stateNames = Object.keys(mascotStates) as MascotState[];
