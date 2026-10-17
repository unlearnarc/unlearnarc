import { useState } from 'react';
import { AriaMascot } from '../components/mascot/AriaMascot';
import { mascotStates, mascotTuning, stateNames, type MascotState } from '../components/mascot/ariaData';
import './mascot-preview.css';

const curves = {
  'ease-in-out': [0.455, 0.03, 0.515, 0.955],
  snappy: [0.215, 0.61, 0.355, 1],
  dreamy: [0.445, 0.05, 0.55, 0.95],
  linear: [0, 0, 1, 1],
} as const;
const descriptions: Record<MascotState, string> = {
  happy: 'Hi, I’m Aria. What shall we build today?',
  sleepy: 'Even curious minds need a little recharge.',
  excited: 'You figured it out! That’s worth celebrating.',
  sad: 'Not quite yet. Let’s try another approach together.',
  walking: 'One step at a time. Let’s keep moving forward.',
  sleeping: 'Recharging for the next learning adventure.',
  greeting: 'Hello there! Ready to learn something new?',
  thinking: 'Let me think… there’s another way to solve this.',
  surprised: 'Oh! That’s an interesting discovery.',
};
export function MascotPreviewPage() {
  const [state, setState] = useState<MascotState>('happy');
  const [idle, setIdle] = useState(true), [duration, setDuration] = useState(mascotTuning.transition.durationMs);
  const [background, setBackground] = useState('#F8FAFC');
  const [curve, setCurve] = useState<[number, number, number, number]>([...curves['ease-in-out']]);
  const [anchor, setAnchor] = useState<[number, number]>([...mascotTuning.anchors.body]);
  const [preset, setPreset] = useState('ease-in-out');
  return <main className="aria-preview">
    <header className="aria-header"><a href="/" aria-label="UnlearnArc home"><span className="aria-mark">∩</span> UnlearnArc</a><span>MASCOT LAB / 01</span></header>
    <section className="aria-intro"><p className="aria-eyebrow">A LITTLE CURIOSITY GOES A LONG WAY</p><h1>Meet your coding companion.</h1><p>One curious mind. Nine expressive moods and actions. Always on your side.</p></section>
    <div className="aria-workspace">
      <section className="aria-stage-panel" aria-label="Mascot preview">
        <div className="aria-stage-meta"><span><i /> ORIGINAL CHARACTER · ARIA</span><span>SVG / LIVE</span></div>
        <div className="aria-stage" style={{ background }}>
          <div className="aria-character"><AriaMascot currentState={state} idle={idle} durationMs={duration} easing={curve} anchor={anchor} /></div>
        </div>
        <div className="aria-caption" aria-live="polite"><span>{state === 'sad' ? 'Encouraging' : state}</span><p>{descriptions[state]}</p></div>
        <div className="aria-state-buttons" role="group" aria-label="Character state">{stateNames.map((name, i) => <button key={name} aria-pressed={state === name} onClick={() => setState(name)}><small>0{i+1}</small>{name[0].toUpperCase()+name.slice(1)}</button>)}</div>
      </section>
      <aside className="aria-settings" aria-label="Animation settings">
        <h2>Make her feel alive <span>✦</span></h2><p>Small movements, a little personality.</p>
        <label className="aria-toggle"><span>Idle animation<small>Breathing, blinking, walking & expressive gestures</small></span><input type="checkbox" checked={idle} onChange={e => setIdle(e.target.checked)} /></label>
        <label className="aria-field">Transition <output>{duration} ms</output><input aria-label="Transition duration" type="range" min="150" max="1800" step="10" value={duration} onChange={e => setDuration(+e.target.value)} /></label>
        <label className="aria-field">Easing<select value={preset} onChange={e => { const key = e.target.value as keyof typeof curves; setPreset(key); setCurve([...curves[key]]); }}>{preset === 'custom' && <option value="custom">Custom curve</option>}{Object.keys(curves).map(k => <option key={k}>{k}</option>)}</select></label>
        <div className="aria-curve" aria-label="Cubic bezier editor"><svg viewBox="0 0 120 80" aria-hidden="true"><path d={`M 10 70 C ${10+curve[0]*100} ${70-curve[1]*60} ${10+curve[2]*100} ${70-curve[3]*60} 110 10`} fill="none" stroke="#0F766E" strokeWidth="2" /></svg><div>{curve.map((value,i) => <label key={i}>{['x1','y1','x2','y2'][i]}<input aria-label={`Bezier ${['x1','y1','x2','y2'][i]}`} type="number" min={i%2 ? -1 : 0} max={i%2 ? 2 : 1} step="0.05" value={value} onChange={e => { const next = [...curve] as typeof curve; next[i] = Math.max(i%2 ? -1 : 0, Math.min(i%2 ? 2 : 1, Number(e.target.value))); setCurve(next); setPreset('custom'); }} /></label>)}</div></div>
        <fieldset className="aria-anchor"><legend>Upper-body breathing anchor</legend>{anchor.map((value,i) => <label key={i}>{i ? 'Y' : 'X'}<input aria-label={`Anchor ${i ? 'Y' : 'X'}`} type="number" min="0" max={i ? 450 : 360} value={value} onChange={e => { const next = [...anchor] as typeof anchor; next[i] = Math.max(0, Math.min(i ? 450 : 360, Number(e.target.value))); setAnchor(next); }} /></label>)}<small>Standing baseline y = {mascotTuning.ground}; walking articulates both legs.</small></fieldset>
        <div className="aria-field">Preview surface<div className="aria-swatches">{['#F8FAFC','#FFFFFF','#111827','#FFF7ED','#CCFBF1','#EDE9FE','#FFE4E6','#030712'].map(color => <button key={color} style={{ background: color }} aria-label={`Surface ${color}`} aria-pressed={background === color} onClick={() => setBackground(color)} />)}<input aria-label="Custom surface color" type="color" value={background} onChange={e => setBackground(e.target.value)} /></div></div>
        <details className="aria-strategies"><summary>Path strategies · {Object.keys(mascotStates.happy.paths).length} shared parts</summary><p>All paths share normalized topology. Grouped control-point interpolation; no polygon sampling or raster assets.</p><ul>{Object.entries(mascotStates.happy.paths).map(([id,p]) => <li key={id}><code>{id}</code><span>{p._group === 'feet' ? 'WALK / FIXED' : 'TRANSFORM'}</span></li>)}</ul></details>
        <a className="aria-download" href="/mascot/unlearnarc/mascot.states.js" download>Download Animator Studio states ↗</a>
      </aside>
    </div>
    <footer className="aria-footer">BUILT TO LEARN WITH YOU <span>Transparent vectors · Articulated motion · Reduced-motion aware</span></footer>
  </main>;
}
