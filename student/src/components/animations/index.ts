/* =============================================================================
   Canvas Animation Engine — public barrel.
   Import everything from one path:
     import { CanvasAnimator, AtomicOperationsScene } from '../components/animations';
   ============================================================================= */

export { CanvasAnimator } from './CanvasAnimator';
export type { CanvasAnimatorProps } from './CanvasAnimator';

export { AnimationToolbar } from './AnimationToolbar';
export type { AnimationToolbarProps } from './AnimationToolbar';

export { usePlaybackController } from './usePlaybackController';
export type {
  PlaybackHandle,
  PlaybackState,
  PlaybackControls,
} from './usePlaybackController';

export {
  renderFrame,
  resolveTheme,
  drawEntity,
  drawConnection,
  paintBackground,
  drawCaption,
} from './canvasDraw';
export type { ResolvedTheme } from './canvasDraw';

export { TraceBuilder } from './simulator/traceBuilder';

export { CheckpointPrompt } from './CheckpointPrompt';
export type { CheckpointPromptProps } from './CheckpointPrompt';
export { InstructionRail } from './InstructionRail';
export type { InstructionRailProps } from './InstructionRail';
export { AnimationNotesPanel } from './AnimationNotesPanel';
export type { AnimationNotesPanelProps } from './AnimationNotesPanel';
export { CodeProgramPanel } from './CodeProgramPanel';
export type { CodeProgramPanelProps } from './CodeProgramPanel';

export { AtomicOperationsScene, AtomicOperationsSceneWithHud } from './examples/AtomicOperationsScene';
export { buildAtomicOperationsTrace } from './examples/atomicOperationsTrace';
export {
  buildSystemDesignTrace,
  buildGraphBfsTrace,
  buildSqlJoinTrace,
  buildMatrixMultiplyTrace,
} from './examples/domainScenes';
export { buildTwoSumTrace, buildSqlQueryTrace } from './examples/programScenes';

export type {
  AnimationTrace,
  Keyframe,
  EntityState,
  ConnectionState,
  AnimationTheme,
  EntityStatus,
  EntityShape,
  ResolvedFrame,
  InstructionStep,
  Checkpoint,
  QuestionKind,
  QuestionOption,
  AnimationNotes,
  CodeProgram,
  CodeHighlight,
  CodeLanguage,
} from '../../types/animation';
export {
  lerp,
  clamp,
  easeInOut,
  resolveFrameAtTime,
  activeInstructionIndex,
  pendingCheckpoint,
  isCheckpointAnswerCorrect,
  activeCodeLines,
  activeCodeNote,
} from '../../types/animation';
