import { useEffect, useMemo, useRef, useState } from "react";
import { VisualizationEngine, type EngineState } from "./core/engine";
import type { VisualizationSpec } from "./core/types";

/**
 * React binding over the framework-agnostic VisualizationEngine.
 * Returns the live engine state plus stable control callbacks.
 */
export function useVisualization(spec: VisualizationSpec) {
  const engine = useMemo(() => new VisualizationEngine(spec), [spec]);
  const [state, setState] = useState<EngineState>(() => engine.snapshot());
  const engineRef = useRef(engine);
  engineRef.current = engine;

  useEffect(() => {
    const unsub = engine.subscribe(setState);
    return () => {
      unsub();
      engine.dispose();
    };
  }, [engine]);

  const controls = useMemo(
    () => ({
      next: () => engineRef.current.next(),
      prev: () => engineRef.current.prev(),
      play: () => engineRef.current.play(),
      pause: () => engineRef.current.pause(),
      reset: () => engineRef.current.reset(),
      seek: (i: number) => engineRef.current.seek(i),
      setSpeed: (ms: number) => engineRef.current.setSpeed(ms),
      submitInput: (v: unknown) => engineRef.current.submitInput(v),
    }),
    []
  );

  return { state, controls };
}
