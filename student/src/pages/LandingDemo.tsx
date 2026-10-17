import { useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCcw, Search } from 'lucide-react';

const VALUES = [2, 5, 8, 13, 21, 34, 55];

function searchSteps(target: number) {
  const steps: { low: number; high: number; mid: number; found: boolean; message: string }[] = [];
  let low = 0;
  let high = VALUES.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const value = VALUES[mid];
    const found = value === target;
    steps.push({ low, high, mid, found, message: found ? `Found ${target}! The middle value matches our target.` : `${value} is ${value < target ? 'smaller' : 'larger'} than ${target}. Keep the ${value < target ? 'right' : 'left'} half and search again.` });
    if (found) break;
    if (value < target) low = mid + 1;
    else high = mid - 1;
  }
  return steps;
}

/** A deliberately small, local demo: no API calls or sign-in required. */
export function LandingDemo() {
  const [target, setTarget] = useState(21);
  const [step, setStep] = useState(0);
  const steps = searchSteps(target);
  const current = steps[step];

  return <div className="landing-demo">
    <div className="landing-demo-toolbar"><span className="landing-demo-dots" aria-hidden="true"><i /><i /><i /></span><span>concept-lab / binary-search</span><span className="landing-demo-badge">Interactive demo</span></div>
    <div className="landing-demo-body">
      <div className="landing-demo-title"><span className="landing-feature-icon"><Search size={22} aria-hidden="true" /></span><div><h3>Find it. One half at a time.</h3><p>Binary search · sorted array</p></div></div>
      <div className="landing-demo-target"><label htmlFor="landing-search-target">Number to find</label><select id="landing-search-target" value={target} onChange={event => { setTarget(Number(event.target.value)); setStep(0); }}>{VALUES.map(value => <option key={value} value={value}>{value}</option>)}</select><span>Try a different target ↗</span></div>
      <ol className="landing-demo-array" aria-label="Sorted numbers and their search states">{VALUES.map((value, index) => {
        const state = index === current.mid ? (current.found ? 'found' : 'checking') : index < current.low || index > current.high ? 'excluded' : 'active';
        return <li key={value} className={`is-${state}`} aria-label={`${value}: ${state}`}><span>{value}</span><small>{index === current.mid ? (current.found ? 'found' : 'mid') : index < current.low || index > current.high ? 'out' : 'search'}</small></li>;
      })}</ol>
      <div className="landing-demo-legend"><span><i className="checking" /> Checking</span><span><i className="active" /> Search space</span><span><i className="found" /> Found</span></div>
      <div className="landing-demo-explanation" role="status" aria-live="polite" aria-atomic="true"><span>STEP {step + 1} OF {steps.length}</span><p>{current.message}</p></div>
      <div className="landing-demo-controls"><button className="landing-icon-button" aria-label="Reset demo" onClick={() => setStep(0)} disabled={step === 0}><RotateCcw size={17} /></button><div><button className="landing-button secondary small" onClick={() => setStep(value => value - 1)} disabled={step === 0}><ArrowLeft size={15} aria-hidden="true" /> Back</button><button className="landing-button small" onClick={() => setStep(value => value + 1)} disabled={step === steps.length - 1}>Next step <ArrowRight size={15} aria-hidden="true" /></button></div></div>
      <p className="landing-demo-footnote">A small preview of learning by exploring. You’re in control.</p>
    </div>
  </div>;
}
