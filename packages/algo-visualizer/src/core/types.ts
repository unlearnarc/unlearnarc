/**
 * TypeScript mirror of the backend com.unlearnarc.algoviz.spec.* contract.
 * Keep this in sync with VisualizationSpec.java / Step.java / Highlight.java.
 */

export type VisualizerType =
  | "ARRAY" | "GRAPH" | "TREE" | "STACK"
  | "QUEUE" | "LINKED_LIST" | "MATRIX" | "CUSTOM";

export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export type HighlightStyle =
  | "COMPARE" | "SWAP" | "VISIT" | "ACTIVE" | "DONE"
  | "PATH" | "ERROR" | "INSERT" | "DELETE" | "PIVOT";

export interface Highlight {
  target: string;            // "array" | "nodes" | "edges" ...
  indices?: Array<number | string>;
  style: HighlightStyle;
}

export type InputType = "NUMBER" | "TEXT" | "CHOICE" | "BOOLEAN";

export interface InputOption {
  label: string;
  value: unknown;
  nextStepId?: string;       // branch target
}

export interface UserInputRequest {
  key: string;
  prompt: string;
  type: InputType;
  options?: InputOption[];
  expected?: unknown;
  placeholder?: string;
}

export interface Variable {
  name: string;
  label?: string;
  color?: string;
}

export interface Step {
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

export interface VisualizationSpec {
  visualizer: VisualizerType;
  initialState?: Record<string, unknown>;
  variables?: Variable[];
  steps: Step[];
}

/** Matches the backend AlgorithmResponse DTO. */
export interface Algorithm {
  id: string;
  slug: string;
  title: string;
  summary?: string;
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
export const DEFAULT_STYLE_COLORS: Record<HighlightStyle, string> = {
  COMPARE: "#f59e0b",
  SWAP:    "#ef4444",
  VISIT:   "#3b82f6",
  ACTIVE:  "#22c55e",
  DONE:    "#64748b",
  PATH:    "#8b5cf6",
  ERROR:   "#dc2626",
  INSERT:  "#10b981",
  DELETE:  "#f43f5e",
  PIVOT:   "#eab308",
};

export interface PlayerTheme {
  background?: string;
  elementFill?: string;
  elementStroke?: string;
  textColor?: string;
  font?: string;
  styleColors?: Partial<Record<HighlightStyle, string>>;
}
