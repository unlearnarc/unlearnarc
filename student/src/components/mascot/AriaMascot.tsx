import { forwardRef, memo, useEffect, useId, useImperativeHandle, useRef } from 'react';
import { mascotStates, mascotTuning, type MascotState } from './ariaData';
import { bezierEase, formatPath, interpolate, numbers, rigidFrame } from './ariaMotion';

export interface AriaMascotHandle { transitionTo: (state: MascotState) => void }
export interface AriaMascotProps {
  currentState?: MascotState;
  idle?: boolean;
  durationMs?: number;
  easing?: readonly [number, number, number, number];
  anchor?: readonly [number, number];
  className?: string;
  label?: string;
}
const initial = mascotStates.happy.paths;
export const AriaMascot = forwardRef<AriaMascotHandle, AriaMascotProps>(function AriaMascot({ currentState = 'happy', idle = true, durationMs = mascotTuning.transition.durationMs, easing = [0.455, 0.03, 0.515, 0.955], anchor = mascotTuning.anchors.body, className, label = 'Aria, your coding companion' }, ref) {
  const svg = useRef<SVGSVGElement>(null), upper = useRef<SVGGElement>(null);
  const titleId = useId();
  const controls = useRef({ idle, durationMs, easing, anchor });
  useEffect(() => { controls.current = { idle, durationMs, easing, anchor }; }, [idle, durationMs, easing, anchor]);
  const request = useRef<(s: MascotState) => void>(() => {});
  const latest = useRef(currentState);
  useImperativeHandle(ref, () => ({ transitionTo: state => request.current(state) }), []);
  useEffect(() => {
    const root = svg.current!, body = upper.current!;
    const elements = Object.fromEntries(Array.from(root.querySelectorAll<SVGPathElement>('[data-part]')).map(el => [el.dataset.part!, el]));
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = media.matches, raf = 0, alive = true;
    let target: MascotState = 'happy', start = performance.now(), end = start;
    let from = Object.fromEntries(Object.entries(initial).map(([id,p]) => [id, numbers(p.d)]));
    let destination = from;
    let frames: Record<string, ReturnType<typeof rigidFrame>> = {};
    let nextBlink = start + mascotTuning.blink.interval*1000, blinkStart = -Infinity;
    let amplitude = 1, previous = start;
    const renderTarget = () => {
      for (const [id, el] of Object.entries(elements)) el.setAttribute('d', mascotStates[target].paths[id].d);
    };
    const retarget = (state: MascotState) => {
      if (!mascotStates[state]) return;
      target = state;
      root.dataset.state = state;
      from = Object.fromEntries(Object.entries(elements).map(([id, el]) => [id, numbers(el.getAttribute('d')!)]));
      destination = Object.fromEntries(Object.entries(mascotStates[state].paths).map(([id,p]) => [id, numbers(p.d)]));
      frames = {};
      for (const group of ['head', 'body', 'leftArm', 'rightArm', 'feet']) {
        const ids = Object.keys(initial).filter(id => initial[id]._group === group);
        frames[group] = rigidFrame(ids.flatMap(id => from[id]), ids.flatMap(id => destination[id]));
      }
      start = performance.now(); end = start + Math.max(0, controls.current.durationMs);
      if (reduced || end === start) { end = start; renderTarget(); }
    };
    request.current = retarget;
    const changed = () => { reduced = media.matches; if (reduced) { end = performance.now(); renderTarget(); } };
    media.addEventListener('change', changed);
    retarget(latest.current);
    const tick = (now: number) => {
      if (!alive) return;
      const dt = Math.min(50, now-previous); previous = now;
      const transitioning = now < end;
      const elapsed = Math.max(0, now-start), duration = Math.max(1, end-start);
      const t = Math.min(1, elapsed/duration), eased = bezierEase(t, controls.current.easing);
      if (transitioning && !reduced) {
        for (const [id, el] of Object.entries(elements)) {
          el.setAttribute('d', formatPath(initial[id].d, interpolate(from[id], destination[id], eased, frames[initial[id]._group])));
        }
      } else renderTarget();
      // One persistent clock: smoothly damp idle during a morph, recover after it.
      const wanted = controls.current.idle && !reduced ? (transitioning ? 0.1 : 1) : 0;
      amplitude += (wanted-amplitude)*(1-Math.exp(-dt/(Math.max(80, duration*.4)/3)));
      if (reduced) amplitude = 0;
      const seconds = now/1000;
      const actionTime = elapsed/1000;
      const stride = Math.sin(actionTime*Math.PI*2/1.05)*amplitude;
      const breath = Math.sin(seconds*Math.PI*2/mascotTuning.breathing.duration)*mascotTuning.breathing.amplitude*amplitude;
      const bounce = !reduced && controls.current.idle && elapsed < duration ? -mascotTuning.poses[target].bounce*Math.sin(Math.PI*t)*Math.sin(Math.PI*t) : 0;
      const [ax, ay] = controls.current.anchor;
      const actionBob = target === 'walking' ? -1.8*Math.abs(stride) : target === 'excited' ? -2*Math.abs(Math.sin(actionTime*7))*amplitude : 0;
      body.setAttribute('transform', `translate(0 ${bounce+actionBob}) translate(${ax} ${ay}) scale(1 ${1+breath}) translate(${-ax} ${-ay})`);
      if (now >= nextBlink && controls.current.idle && !reduced) {
        blinkStart = now;
        nextBlink = now + (mascotTuning.blink.interval+(Math.random()*2-1)*mascotTuning.blink.variation)*1000;
      }
      const blinkT = (now-blinkStart)/(mascotTuning.blink.duration*1000);
      const sy = target !== 'sleeping' && !reduced && controls.current.idle && blinkT >= 0 && blinkT < 1 ? 1-.96*Math.sin(Math.PI*blinkT) : 1;
      for (const side of ['left', 'right']) {
        const white = elements[`eye-${side}-white`];
        const pts = numbers(white.getAttribute('d')!);
        // Same pivot for white, iris, pupil, highlight AND lid: no escaping pupils.
        const xs = pts.filter((_,i) => i%2===0), ys = pts.filter((_,i) => i%2===1);
        const cx = (Math.min(...xs)+Math.max(...xs))/2, cy = (Math.min(...ys)+Math.max(...ys))/2;
        for (const [id,el] of Object.entries(elements)) if (id.startsWith(`eye-${side}-`) || id === `eyelid-${side}`) {
          el.setAttribute('transform', `translate(${cx} ${cy}) scale(1 ${sy}) translate(${-cx} ${-cy})`);
        }
      }
      for (const [id,el] of Object.entries(elements)) {
        const group = initial[id]._group;
        let transform = '';
        if (group === 'head') {
          const angle = Math.sin(seconds*(target === 'sleeping' ? .7 : 1.3))*(target === 'thinking' ? 1.6 : .45)*amplitude;
          transform = `rotate(${angle} 180 185)`;
        } else if (group === 'leftArm' || group === 'rightArm') {
          const left = group === 'leftArm', [x,y] = mascotTuning.anchors[group];
          const angle = target === 'walking' ? stride*(left ? -8 : 8)
            : target === 'greeting' && !left ? Math.sin(actionTime*Math.PI*2/.65)*13*amplitude
            : target === 'excited' ? Math.sin(actionTime*Math.PI*2/.8)*(left ? 5 : -5)*amplitude : 0;
          transform = `rotate(${angle} ${x} ${y+mascotTuning.poses[target].bodyY})`;
        } else if (group === 'feet') {
          const left = id.endsWith('-left'), phase = stride*(left ? 1 : -1);
          transform = target === 'walking' ? `translate(${phase*5} ${-Math.max(0,phase)*6}) rotate(${phase*8} ${left ? 155 : 205} 313)` : '';
        }
        if (group !== 'body') el.parentElement!.setAttribute('transform', transform);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf); media.removeEventListener('change', changed); request.current = () => {}; };
  }, []);
  useEffect(() => { request.current(currentState); }, [currentState]);
  return <svg ref={svg} className={className} viewBox="0 0 360 450" role="img" aria-labelledby={titleId} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
    <title id={titleId}>{label}</title>
    {/* Each leg has its own motion wrapper; standing poses remain grounded. */}
    <g data-fixed-feet>{Object.entries(initial).filter(([,p]) => p._group === 'feet').map(([id,p]) => <g key={id} data-motion-part={id.endsWith('-left') ? 'leftLeg' : 'rightLeg'}><path data-part={id} {...{ d: p.d, fill: p.fill, stroke: p.stroke, strokeWidth: p.strokeWidth }} strokeLinejoin="round" /></g>)}</g>
    <g ref={upper} data-upper-body><UpperArtwork /></g>
  </svg>;
});
// Filtered at module initialization rather than re-rendering any live paths.
const UpperArtwork = memo(function UpperArtwork() {
  return <>{Object.entries(initial).filter(([,p]) => p._group !== 'feet').map(([id,p]) => <g key={id} data-motion-part={p._group}><path data-part={id} d={p.d} fill={p.fill} stroke={p.stroke} strokeWidth={p.strokeWidth} strokeLinecap="round" strokeLinejoin="round" /></g>)}</>;
});
