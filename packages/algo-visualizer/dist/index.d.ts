import * as react from 'react';

/**
 * TypeScript mirror of the backend com.unlearnarc.algoviz.spec.* contract.
 * Keep this in sync with VisualizationSpec.java / Step.java / Highlight.java.
 */
type VisualizerType = "ARRAY" | "GRAPH" | "TREE" | "STACK" | "QUEUE" | "LINKED_LIST" | "MATRIX" | "CUSTOM";
type Difficulty = "EASY" | "MEDIUM" | "HARD";
type HighlightStyle = "COMPARE" | "SWAP" | "VISIT" | "ACTIVE" | "DONE" | "PATH" | "ERROR" | "INSERT" | "DELETE" | "PIVOT";
interface Highlight {
    target: string;
    indices?: Array<number | string>;
    style: HighlightStyle;
}
type InputType = "NUMBER" | "TEXT" | "CHOICE" | "BOOLEAN";
interface InputOption {
    label: string;
    value: unknown;
    nextStepId?: string;
}
interface UserInputRequest {
    key: string;
    prompt: string;
    type: InputType;
    options?: InputOption[];
    expected?: unknown;
    placeholder?: string;
}
interface Variable {
    name: string;
    label?: string;
    color?: string;
}
interface Step {
    id?: string;
    title?: string;
    explanation?: string;
    state: Record<string, unknown>;
    variables?: Record<string, unknown>;
    highlights?: Highlight[];
    line?: number;
    lang?: "java" | "python";
    input?: UserInputRequest;
    pointers?: Record<string, unknown>;
}
interface VisualizationSpec {
    visualizer: VisualizerType;
    initialState?: Record<string, unknown>;
    variables?: Variable[];
    steps: Step[];
}
/** Matches the backend AlgorithmResponse DTO. */
interface Algorithm {
    id: string;
    slug: string;
    title: string;
    summary?: string;
    thumbnailUrl?: string | null;
    usage?: string;
    category?: string;
    difficulty?: Difficulty;
    complexity?: Record<string, unknown>;
    visualizer: VisualizerType;
    javaSource?: string;
    pythonSource?: string;
    spec: VisualizationSpec;
    isPublished?: boolean;
    version?: number;
    createdAt?: string;
    updatedAt?: string;
}
/** Semantic style -> canvas colour. Overridable via PlayerTheme. */
declare const DEFAULT_STYLE_COLORS: Record<HighlightStyle, string>;
interface PlayerTheme {
    background?: string;
    elementFill?: string;
    elementStroke?: string;
    textColor?: string;
    font?: string;
    styleColors?: Partial<Record<HighlightStyle, string>>;
}

interface AlgorithmVisualizerProps {
    algorithm: Algorithm;
    theme?: PlayerTheme;
    width?: number;
    height?: number;
    /** Autostart playback on mount. */
    autoPlay?: boolean;
    /** ms per step for auto play. */
    speedMs?: number;
    /** Called every time the learner submits a step input. */
    onInput?: (key: string, value: unknown, correct: boolean | null) => void;
    /** Hide the built-in code panel if the host renders its own. */
    showCode?: boolean;
    className?: string;
}
/**
 * Self-contained canvas player for a meta-driven algorithm spec.
 *
 * Layout: [ canvas | narration+variables ] over [ transport controls ]
 *         with an optional code panel (Java/Python tabs) and inline input prompts.
 */
declare function AlgorithmVisualizer({ algorithm, theme, width, height, autoPlay, speedMs, onInput, showCode, className, }: AlgorithmVisualizerProps): react.JSX.Element;

interface EngineState {
    index: number;
    total: number;
    step: Step | undefined;
    isPlaying: boolean;
    isFinished: boolean;
    /** Set when the current step requires input that has not been answered. */
    pendingInput: UserInputRequest | undefined;
    /** Collected answers keyed by input.key. */
    inputs: Record<string, unknown>;
}
type EngineListener = (state: EngineState) => void;
/**
 * Framework-agnostic playback state machine.
 *
 * Responsibilities:
 *  - forward / backward / seek / reset step control
 *  - auto-play with a configurable speed (ms per step)
 *  - pause automatically when a step declares `input`
 *  - branch to another step id when a CHOICE option carries `nextStepId`
 *
 * It holds NO rendering logic — the React layer and canvas renderers subscribe
 * to state changes. This keeps the engine unit-testable and reusable (e.g.
 * headless snapshot testing of a spec).
 */
declare class VisualizationEngine {
    private readonly spec;
    private readonly idToIndex;
    private listeners;
    private index;
    private playing;
    private inputs;
    private timer;
    private speedMs;
    constructor(spec: VisualizationSpec);
    subscribe(listener: EngineListener): () => void;
    private emit;
    snapshot(): EngineState;
    next(): void;
    prev(): void;
    seek(index: number): void;
    seekToStepId(id: string): void;
    reset(): void;
    play(): void;
    pause(): void;
    setSpeed(ms: number): void;
    private scheduleNext;
    /**
     * Submit an answer for the current step's input request.
     * Returns true if the (optional) expected answer matched.
     * Handles CHOICE branching via option.nextStepId.
     */
    submitInput(value: unknown): {
        correct: boolean | null;
    };
    private evaluate;
    dispose(): void;
}

/**
 * React binding over the framework-agnostic VisualizationEngine.
 * Returns the live engine state plus stable control callbacks.
 */
declare function useVisualization(spec: VisualizationSpec): {
    state: EngineState;
    controls: {
        next: () => void;
        prev: () => void;
        play: () => void;
        pause: () => void;
        reset: () => void;
        seek: (i: number) => void;
        setSpeed: (ms: number) => void;
        submitInput: (v: unknown) => {
            correct: boolean | null;
        };
    };
};

interface RenderContext {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    theme: Required<Pick<PlayerTheme, 'background' | 'elementFill' | 'elementStroke' | 'textColor' | 'font'>> & {
        styleColors: Record<string, string>;
    };
}
type Renderer = (rc: RenderContext, step: Step, spec: VisualizationSpec) => void;
declare function resolveTheme(theme?: PlayerTheme): RenderContext['theme'];
/** Collect index -> colour from the step's highlights for a given target. */
declare function highlightMap(step: Step, target: string, styleColors: Record<string, string>): Map<string, string>;

declare const RENDERERS: Partial<Record<VisualizerType, Renderer>>;
declare function getRenderer(type: VisualizerType): Renderer;

export { AlgorithmVisualizer, DEFAULT_STYLE_COLORS, RENDERERS, VisualizationEngine, getRenderer, highlightMap, resolveTheme, useVisualization };
export type { Algorithm, AlgorithmVisualizerProps, Difficulty, EngineListener, EngineState, Highlight, HighlightStyle, InputOption, InputType, PlayerTheme, RenderContext, Renderer, Step, UserInputRequest, Variable, VisualizationSpec, VisualizerType };
