import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Clock, Layers } from 'lucide-react';
import type { AnimationTrace } from '../../types/animation';
import { CanvasAnimator } from './CanvasAnimator';
import { AnimationNotesPanel } from './AnimationNotesPanel';
import { categoryFor, type SceneSummary } from './catalog';
import type { PlaybackHandle } from './usePlaybackController';
import './animation-detail.css';

type WorkspaceTab = 'visualizer' | 'code' | 'explanation';
const tabs: { id: WorkspaceTab; title: string }[] = [
  { id: 'visualizer', title: 'Visualizer' },
  { id: 'code', title: 'Code Example' },
  { id: 'explanation', title: 'Explanation' },
];

export interface AnimationDetailRecord extends SceneSummary {
  trace: AnimationTrace;
}

/** Presentation around the existing player; no parallel playback state. */
export function AnimationDetail({ scene, catalogHref }: { scene: AnimationDetailRecord; catalogHref: string }) {
  const trace = scene.trace;
  const domain = categoryFor({ ...scene, category: scene.category ?? trace.category });
  const title = scene.title ?? trace.title;
  const description = scene.description ?? trace.description;
  const [tab, setTab] = useState<WorkspaceTab>('visualizer');
  const playback = useRef<PlaybackHandle | null>(null);
  const takeaway = trace.notes?.keyPoints?.[0] ?? trace.notes?.summary ?? description;
  const notes = { ...trace.notes, summary: trace.notes?.summary ?? description };
  const selectTab = (id: WorkspaceTab) => {
    // Keep the same mounted player/playhead, but don't play a hidden lesson.
    if (id !== 'visualizer') playback.current?.controls.pause();
    setTab(id);
  };
  const metadata = <>
    <span className="animation-detail-badge"><domain.icon size={14} aria-hidden="true" />{domain.title}</span>
    {Number.isFinite(trace.duration) && trace.duration > 0 && <span><Clock size={14} aria-hidden="true" />{Number((trace.duration / 1000).toFixed(2))}s</span>}
    {!!trace.keyframes?.length && <span><Layers size={14} aria-hidden="true" />{trace.keyframes.length} frames</span>}
  </>;

  return <article className="animation-detail">
    <nav className="animation-detail-breadcrumb" aria-label="Breadcrumb">
      <Link to="/animations">Animations</Link><ChevronRight size={13} aria-hidden="true" />
      <Link to={`/animations?category=${domain.id}`}>{domain.title}</Link><ChevronRight size={13} aria-hidden="true" />
      <span aria-current="page">{title}</span>
    </nav>
    <header className="animation-detail-header">
      <div className="animation-detail-heading"><domain.icon size={26} aria-hidden="true" /><div><h1>{title}</h1>{description && <p>{description}</p>}
        <Link to={catalogHref} className="animation-detail-back"><ArrowLeft size={15} aria-hidden="true" />Back to animations</Link>
      </div></div>
      <aside className="animation-detail-metadata" aria-label="Animation metadata">{metadata}</aside>
    </header>
    <div role="tablist" aria-label="Animation workspace" className="animation-detail-tabs">
      {tabs.map((item, index) => <button key={item.id} id={`animation-tab-${item.id}`} role="tab" aria-selected={tab === item.id}
        aria-controls="animation-workspace-panel" tabIndex={tab === item.id ? 0 : -1}
        onClick={() => selectTab(item.id)} onKeyDown={event => {
          const key = event.key;
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) return;
          event.preventDefault();
          const next = key === 'Home' ? 0 : key === 'End' ? tabs.length - 1 : (index + (key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
          selectTab(tabs[next].id);
          document.getElementById(`animation-tab-${tabs[next].id}`)?.focus();
        }}>{item.title}</button>)}
    </div>
    {/* The player stays mounted across tabs, preserving time, speed and answered checkpoints. */}
    <section id="animation-workspace-panel" role="tabpanel" aria-labelledby={`animation-tab-${tab}`} tabIndex={0}>
      <div hidden={tab === 'explanation'}>
        <CanvasAnimator traceData={trace} autoPlay={false} initialSpeed={1} showGrid showCaption showInstructions
          showNotes={false} showCode enableCheckpoints workspaceTab={tab} takeaway={takeaway}
          onReady={handle => { playback.current = handle; }} />
      </div>
      {tab === 'explanation' && <AnimationNotesPanel notes={notes} />}
    </section>
    {tab !== 'explanation' && <AnimationNotesPanel notes={notes} className="animation-detail-about" />}
  </article>;
}
