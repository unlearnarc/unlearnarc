/**
 * TopologyCanvas — n8n-style interactive graph editor.
 *
 * Drag model (definitive, no SVG coord bugs):
 * ────────────────────────────────────────────
 * All pointer events are on the outer <div>.
 * World coords = (clientX - divRect.left - pan.x) / zoom
 * Node hit-testing is pure bounding-box in world space.
 * setPointerCapture keeps all events on the div during drag.
 *
 * Connect (n8n style):
 * ────────────────────
 * Hover a node → small port circles appear on left/right edges.
 * Drag from a port → bezier wire follows cursor.
 * Release on another node → edge created.
 * Esc → cancel.
 *
 * Zoom:
 * ─────
 * Wheel zooms centred exactly on cursor.
 * Both zoom and pan updated atomically inside one setState callback.
 */

import React, {
  useRef, useState, useCallback, useMemo, memo, useEffect,
} from 'react';
import {
  ZoomIn, ZoomOut, Maximize2, RotateCcw,
  Trash2, Copy, Zap, RefreshCw, Pencil, Check, X,
} from 'lucide-react';
import type {
  Topology, TopologyNode, TopologyEdge,
  ComponentMetrics, ComponentKind,
} from '../engine/types';
import { KIND_ICONS } from './nodeIcons';
import { KIND_META } from './iconMap';

// ─── Card geometry ────────────────────────────────────────────────────────────
const NW   = 188;
const NH   = 88;
const NR   = 14;
const GRID = 28;
const PORT_R = 8;

// ─── Colour helpers ───────────────────────────────────────────────────────────
function satColor(s: number) {
  if (s >= 1.0) return '#EF4444';
  if (s > 0.80) return '#F97316';
  if (s > 0.60) return '#EAB308';
  return '#22C55E';
}

// ─── Bezier helpers ───────────────────────────────────────────────────────────
function bezierD(x1: number, y1: number, x2: number, y2: number) {
  const cp = Math.max(Math.abs(x2 - x1) * 0.5, 60);
  return `M${x1},${y1} C${x1 + cp},${y1} ${x2 - cp},${y2} ${x2},${y2}`;
}
function bezierPoint(x1: number, y1: number, x2: number, y2: number, t: number) {
  const cp = Math.max(Math.abs(x2 - x1) * 0.5, 60);
  const cx1 = x1 + cp; const cx2 = x2 - cp;
  const mt = 1 - t;
  return {
    x: mt ** 3 * x1 + 3 * mt ** 2 * t * cx1 + 3 * mt * t ** 2 * cx2 + t ** 3 * x2,
    y: mt ** 3 * y1 + 3 * mt ** 2 * t * y1   + 3 * mt * t ** 2 * y2  + t ** 3 * y2,
  };
}

// ─── Drag state ───────────────────────────────────────────────────────────────
type DragState =
  | { kind: 'none' }
  | { kind: 'node'; nodeId: string; startCx: number; startCy: number; startNx: number; startNy: number }
  | { kind: 'pan';  startCx: number; startCy: number; startPx: number; startPy: number }
  | { kind: 'wire'; fromId: string; ax: number; ay: number; cx: number; cy: number };

// ─── Arrow markers ────────────────────────────────────────────────────────────
const ARROWS = [
  { id: 'a-def',   color: '#94A3B8' },
  { id: 'a-hi',    color: '#60A5FA' },
  { id: 'a-sel',   color: '#6366F1' },
  { id: 'a-hover', color: '#F87171' },
  { id: 'a-wire',  color: '#8B5CF6' },
];

// ══════════════════════════════════════════════════════════════════════════════
// WIRE
// ══════════════════════════════════════════════════════════════════════════════
interface WireProps {
  edge: TopologyEdge;
  from: TopologyNode | undefined;
  to:   TopologyNode | undefined;
  selected: boolean;
  highlighted: boolean;
  hovered: boolean;
  simTime: number;
  isRunning: boolean;
  onSelect: (id: string) => void;
  onHover:  (id: string | null) => void;
  onDelete: (id: string) => void;
  liveDrag: { nodeId: string; x: number; y: number } | null;
}
const Wire = memo(({
  edge, from, to, selected, highlighted, hovered,
  simTime, isRunning, onSelect, onHover, onDelete, liveDrag,
}: WireProps) => {
  if (!from || !to) return null;
  const fx = (liveDrag?.nodeId === from.id ? liveDrag.x : from.position.x) + NW;
  const fy = (liveDrag?.nodeId === from.id ? liveDrag.y : from.position.y) + NH / 2;
  const tx = (liveDrag?.nodeId === to.id   ? liveDrag.x : to.position.x);
  const ty = (liveDrag?.nodeId === to.id   ? liveDrag.y : to.position.y) + NH / 2;

  const d   = bezierD(fx, fy, tx, ty);
  const t   = ((simTime * 0.0008) % 1 + 1) % 1;
  const dot = isRunning ? bezierPoint(fx, fy, tx, ty, t) : null;
  const mid = bezierPoint(fx, fy, tx, ty, 0.5);

  // Show delete button when selected OR when hovered
  const showDelete = selected || hovered;

  const stroke = selected    ? '#6366F1'
    : hovered    ? '#F87171'
    : highlighted ? '#60A5FA'
    : '#CBD5E1';

  const markId = selected    ? 'a-sel'
    : hovered    ? 'a-hover'
    : highlighted ? 'a-hi'
    : 'a-def';

  const strokeWidth = selected ? 2.5 : hovered ? 2.5 : highlighted ? 2 : 1.5;

  return (
    <g>
      {/* Wide invisible hit area.
          onPointerDown stops propagation so the canvas div never receives it
          (which would start a pan-drag and suppress the click).
          onClick fires the selection on mouse-up over the same element. */}
      <path
        d={d}
        stroke="transparent"
        strokeWidth={36}
        fill="none"
        style={{ cursor: 'pointer' }}
        onPointerDown={e => { e.stopPropagation(); }}
        onClick={e => { e.stopPropagation(); onSelect(edge.id); }}
        onMouseEnter={e => { e.stopPropagation(); onHover(edge.id); }}
        onMouseLeave={e => { e.stopPropagation(); onHover(null); }}
      />

      {/* Visible wire */}
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={selected ? '7 4' : undefined}
        markerEnd={`url(#${markId})`}
        style={{ pointerEvents: 'none', transition: 'stroke 0.12s, stroke-width 0.12s' }}
      />

      {/* Animated data-flow dot */}
      {dot && (
        <circle
          cx={dot.x} cy={dot.y} r={5}
          fill={highlighted ? '#60A5FA' : hovered ? '#F87171' : '#94A3B8'}
          opacity={0.9}
          style={{
            pointerEvents: 'none',
            filter: `drop-shadow(0 0 4px ${highlighted ? '#60A5FA' : '#94A3B8'})`,
          }}
        />
      )}

      {/* Edge label */}
      {edge.label && !showDelete && (
        <text
          x={mid.x} y={mid.y - 10}
          textAnchor="middle" fontSize={8.5} fill="#94A3B8"
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          {edge.label}
        </text>
      )}

      {/* Delete button — visible on hover OR select.
          MUST use onPointerDown + stopPropagation so the outer div's
          setPointerCapture never gets the event and steals the click. */}
      {showDelete && (
        <g
          transform={`translate(${mid.x - 26},${mid.y - 14})`}
          style={{ cursor: 'pointer' }}
          onPointerDown={e => {
            e.stopPropagation();   // prevents canvas pan-drag from starting
            e.preventDefault();
            onDelete(edge.id);
          }}
          onMouseEnter={e => { e.stopPropagation(); onHover(edge.id); }}
          onMouseLeave={e => { e.stopPropagation(); onHover(null); }}
        >
          {/* Larger invisible hit area so the pill is easy to click */}
          <rect x={-8} y={-8} width={84} height={44} rx={14} fill="transparent" />
          {/* pill background */}
          <rect
            x={0} y={0} width={68} height={28} rx={14}
            fill={selected ? '#EF4444' : '#0F172A'}
            stroke={selected ? '#FCA5A5' : '#F87171'}
            strokeWidth={1.5}
            opacity={0.95}
          />
          {/* ✕ symbol */}
          <text
            x={16} y={14}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={13} fill="#fff" fontWeight="bold"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >✕</text>
          {/* "Remove" label */}
          <text
            x={42} y={14}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={10} fill="#fff" fontWeight={700}
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >Remove</text>
        </g>
      )}
    </g>
  );
});
Wire.displayName = 'Wire';

// ══════════════════════════════════════════════════════════════════════════════
// NODE CARD  (pure SVG — no foreignObject for interaction-critical elements)
// ══════════════════════════════════════════════════════════════════════════════
interface NodeCardProps {
  node:      TopologyNode;
  metrics?:  ComponentMetrics;
  selected:  boolean;
  hovered:   boolean;
  dragging:  boolean;
  wireSrc:   boolean;
  showPorts: boolean;
  x: number;
  y: number;
  onPortDown: (nodeId: string, ax: number, ay: number, e: React.PointerEvent) => void;
}
const NodeCard = memo(({ node, metrics, selected, hovered, dragging, wireSrc, showPorts, x, y, onPortDown }: NodeCardProps) => {
  const meta   = KIND_META[node.kind as ComponentKind] ?? KIND_META['service'];
  const Icon   = KIND_ICONS[node.kind as ComponentKind] ?? KIND_ICONS['service'];
  const sat    = metrics?.saturation ?? 0;
  const failed = metrics ? (metrics.errorRate > 0.9 || sat >= 1) : false;
  const hColor = satColor(sat);

  const borderColor = selected ? '#6366F1'
    : failed         ? '#EF4444'
    : wireSrc        ? '#A78BFA'
    : hovered        ? '#818CF8'
    : 'var(--ua-border,#E2E8F0)';
  const borderWidth = selected || failed ? 2.5 : hovered ? 2 : 1;

  const lax = x,       lay = y + NH / 2;   // left port anchor (world)
  const rax = x + NW,  ray = y + NH / 2;   // right port anchor (world)

  return (
    <g transform={`translate(${x},${y})`}
      style={{ filter: dragging ? 'drop-shadow(0 12px 32px rgba(0,0,0,.30))' : undefined }}>

      {/* Glow */}
      {(selected || failed || wireSrc) && (
        <rect x={-6} y={-6} width={NW + 12} height={NH + 12} rx={NR + 6}
          fill="none"
          stroke={selected ? '#6366F1' : failed ? '#EF4444' : '#A78BFA'}
          strokeWidth={10} opacity={0.12}
          style={{ filter: 'blur(7px)', pointerEvents: 'none' }} />
      )}

      {/* Shadow */}
      <rect x={2} y={5} width={NW} height={NH} rx={NR}
        fill="rgba(0,0,0,0.10)"
        style={{ filter: 'blur(8px)', pointerEvents: 'none' }} />

      {/* Card body — the primary pointer-event target; carries data-node-id */}
      <rect x={0} y={0} width={NW} height={NH} rx={NR}
        fill="var(--ua-surface,#fff)"
        stroke={borderColor} strokeWidth={borderWidth}
        data-node-id={node.id}
        style={{ transition: 'stroke 0.12s', cursor: dragging ? 'grabbing' : 'grab' }} />

      {/* Top accent strip */}
      <path d={`M${NR},0 L${NW - NR},0 Q${NW},0 ${NW},${NR} L${NW},5 L0,5 L0,${NR} Q0,0 ${NR},0 Z`}
        fill={meta.color} style={{ pointerEvents: 'none' }} />

      {/* Icon badge via foreignObject — pointerEvents:none so it never intercepts */}
      <foreignObject x={9} y={12} width={44} height={44}
        style={{ overflow: 'visible', pointerEvents: 'none' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: meta.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <Icon size={26} color={meta.color} />
        </div>
      </foreignObject>

      {/* Status dot */}
      <circle cx={NW - 13} cy={13} r={5}
        fill={failed ? '#EF4444' : hColor}
        stroke="var(--ua-surface,#fff)" strokeWidth={1.5}
        style={{ pointerEvents: 'none' }} />

      {/* Label */}
      <text x={61} y={27} fontSize={12} fontWeight={700}
        fill="var(--ua-text-primary,#0F172A)" dominantBaseline="middle"
        style={{ userSelect: 'none', pointerEvents: 'none' }}>
        {node.label.length > 12 ? node.label.slice(0, 12) + '…' : node.label}
      </text>
      <text x={61} y={42} fontSize={9}
        fill="var(--ua-text-muted,#94A3B8)" dominantBaseline="middle"
        style={{ userSelect: 'none', pointerEvents: 'none' }}>
        {node.kind.replace(/_/g, ' ')}
      </text>

      {/* Saturation bar + metrics */}
      {metrics ? (
        <>
          <rect x={10} y={60} width={NW - 20} height={5} rx={2.5}
            fill="var(--ua-border,#E2E8F0)" style={{ pointerEvents: 'none' }} />
          <rect x={10} y={60}
            width={Math.max(0, Math.round((NW - 20) * Math.min(sat, 1)))}
            height={5} rx={2.5} fill={hColor}
            style={{ transition: 'width 0.3s', pointerEvents: 'none' }} />
          <text x={10} y={74} fontSize={8.5} dominantBaseline="middle"
            fill="var(--ua-text-muted,#94A3B8)"
            style={{ userSelect: 'none', pointerEvents: 'none' }}>
            {Math.round(sat * 100)}% · {Math.round(metrics.avgLatencyMs)}ms
          </text>
          <text x={NW - 10} y={74} fontSize={8.5} textAnchor="end" dominantBaseline="middle"
            fill="var(--ua-text-muted,#94A3B8)"
            style={{ userSelect: 'none', pointerEvents: 'none' }}>
            {Math.round(metrics.requestsOut)}/s
          </text>
        </>
      ) : (
        <text x={NW / 2} y={72} fontSize={9} textAnchor="middle" dominantBaseline="middle"
          fill="var(--ua-text-muted,#94A3B8)"
          style={{ userSelect: 'none', pointerEvents: 'none' }}>
          hover port to connect
        </text>
      )}

      {/* Ports — rendered last (topmost Z), use stopPropagation */}
      {showPorts && (
        <>
          {/* Left port */}
          <circle cx={0} cy={NH / 2} r={PORT_R + 6} fill="transparent"
            style={{ cursor: 'crosshair' }}
            onPointerDown={e => { e.stopPropagation(); onPortDown(node.id, lax, lay, e); }} />
          <circle cx={0} cy={NH / 2} r={PORT_R}
            fill="var(--ua-surface,#fff)" stroke="#6366F1" strokeWidth={2}
            style={{ pointerEvents: 'none', filter: 'drop-shadow(0 0 4px #6366F188)' }} />
          <text x={0} y={NH / 2} textAnchor="middle" dominantBaseline="middle"
            fontSize={10} fontWeight="bold" fill="#6366F1"
            style={{ userSelect: 'none', pointerEvents: 'none' }}>+</text>

          {/* Right port */}
          <circle cx={NW} cy={NH / 2} r={PORT_R + 6} fill="transparent"
            style={{ cursor: 'crosshair' }}
            onPointerDown={e => { e.stopPropagation(); onPortDown(node.id, rax, ray, e); }} />
          <circle cx={NW} cy={NH / 2} r={PORT_R}
            fill={wireSrc ? '#6366F1' : 'var(--ua-surface,#fff)'}
            stroke="#6366F1" strokeWidth={2}
            style={{ pointerEvents: 'none', filter: 'drop-shadow(0 0 4px #6366F188)' }} />
          <text x={NW} y={NH / 2} textAnchor="middle" dominantBaseline="middle"
            fontSize={10} fontWeight="bold" fill={wireSrc ? '#fff' : '#6366F1'}
            style={{ userSelect: 'none', pointerEvents: 'none' }}>+</text>
        </>
      )}
    </g>
  );
});
NodeCard.displayName = 'NodeCard';

// ══════════════════════════════════════════════════════════════════════════════
// CONTEXT MENU
// ══════════════════════════════════════════════════════════════════════════════
interface CtxMenu { nodeId: string; sx: number; sy: number }
const NodeCtxMenu: React.FC<{
  menu: CtxMenu; onClose: () => void;
  onDelete: (id: string) => void;
  onDupe:   (id: string) => void;
  onRename: (id: string) => void;
  onFail:   (id: string) => void;
  onRevive: (id: string) => void;
}> = ({ menu, onClose, onDelete, onDupe, onRename, onFail, onRevive }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) onClose(); };
    window.addEventListener('mousedown', h);
    return () => window.removeEventListener('mousedown', h);
  }, [onClose]);

  const rows: ({ label: string; icon: React.ReactNode; fn: () => void; danger?: boolean } | null)[] = [
    { label: 'Rename',           icon: <Pencil size={12} />,   fn: () => onRename(menu.nodeId) },
    { label: 'Duplicate',        icon: <Copy size={12} />,      fn: () => onDupe(menu.nodeId) },
    null,
    { label: 'Trigger Failure',  icon: <Zap size={12} />,      fn: () => onFail(menu.nodeId),   danger: true },
    { label: 'Trigger Recovery', icon: <RefreshCw size={12} />, fn: () => onRevive(menu.nodeId) },
    null,
    { label: 'Delete',           icon: <Trash2 size={12} />,    fn: () => { onDelete(menu.nodeId); }, danger: true },
  ];

  return (
    <div ref={ref} style={{
      position: 'fixed', left: menu.sx + 4, top: menu.sy + 4, zIndex: 500,
      background: 'var(--ua-surface)', border: '1px solid var(--ua-border)',
      borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,.2)',
      minWidth: 185, padding: '4px 0',
    }}>
      {rows.map((row, i) => row === null
        ? <div key={i} style={{ height: 1, background: 'var(--ua-border)', margin: '3px 0' }} />
        : (
          <button key={i} onClick={() => { row.fn(); onClose(); }} style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            padding: '7px 14px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 500, color: row.danger ? '#EF4444' : 'var(--ua-text-primary)',
            textAlign: 'left', borderRadius: 6,
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--ua-surface-soft)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
            {row.icon}{row.label}
          </button>
        )
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// ZOOM CONTROLS
// ══════════════════════════════════════════════════════════════════════════════
const ZoomControls: React.FC<{ zoom: number; onIn: () => void; onOut: () => void; onFit: () => void; onReset: () => void }> =
  ({ zoom, onIn, onOut, onFit, onReset }) => (
    <div style={{
      position: 'absolute', bottom: 14, right: 14,
      display: 'flex', flexDirection: 'column', gap: 4, zIndex: 20,
    }}>
      {[
        { icon: <ZoomIn size={14} />,    fn: onIn,    title: 'Zoom in' },
        { icon: <ZoomOut size={14} />,   fn: onOut,   title: 'Zoom out' },
        { icon: <Maximize2 size={14} />, fn: onFit,   title: 'Fit view' },
        { icon: <RotateCcw size={14} />, fn: onReset, title: 'Reset view' },
      ].map(({ icon, fn, title }) => (
        <button key={title} onClick={fn} title={title} style={{
          width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 8, border: '1px solid var(--ua-border)',
          background: 'var(--ua-surface)', color: 'var(--ua-text-secondary)',
          cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.07)',
        }}>{icon}</button>
      ))}
      <div style={{ textAlign: 'center', fontSize: 9, color: 'var(--ua-text-muted)', marginTop: 2 }}>
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );

// ══════════════════════════════════════════════════════════════════════════════
// CANVAS PROPS
// ══════════════════════════════════════════════════════════════════════════════
export interface TopologyCanvasProps {
  topology:          Topology;
  metrics:           Record<string, ComponentMetrics>;
  selectedNodeId:    string | null;
  simTime?:          number;
  isRunning?:        boolean;
  onSelectNode:      (id: string | null) => void;
  onNodeMove:        (id: string, x: number, y: number) => void;
  onAddEdge:         (fromId: string, toId: string) => void;
  onDeleteNode:      (id: string) => void;
  onDeleteEdge:      (id: string) => void;
  onDuplicateNode:   (id: string) => void;
  onRenameNode:      (id: string, label: string) => void;
  onTriggerFailure:  (id: string) => void;
  onTriggerRecovery: (id: string) => void;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN CANVAS
// ══════════════════════════════════════════════════════════════════════════════
export const TopologyCanvas: React.FC<TopologyCanvasProps> = ({
  topology, metrics, selectedNodeId,
  simTime = 0, isRunning = false,
  onSelectNode, onNodeMove, onAddEdge,
  onDeleteNode, onDeleteEdge, onDuplicateNode, onRenameNode,
  onTriggerFailure, onTriggerRecovery,
}) => {
  // ── Refs ──────────────────────────────────────────────────────────────────
  const wrapRef = useRef<HTMLDivElement>(null);

  // ── Viewport state ────────────────────────────────────────────────────────
  const [pan,  setPan]  = useState({ x: 60, y: 40 });
  const [zoom, setZoom] = useState(0.88);

  // Always-fresh refs for use inside event handlers
  const panRef  = useRef(pan);  panRef.current  = pan;
  const zoomRef = useRef(zoom); zoomRef.current = zoom;
  const topoRef = useRef(topology); topoRef.current = topology;

  // ── Drag state ref (no re-renders during drag) ────────────────────────────
  const dragRef  = useRef<DragState>({ kind: 'none' });

  // ── Lightweight visual states (minimal re-renders) ────────────────────────
  const [liveDrag,     setLiveDrag]     = useState<{ nodeId: string; x: number; y: number } | null>(null);
  const [liveWire,     setLiveWire]     = useState<DragState & { kind: 'wire' } | null>(null);
  const [hoverId,      setHoverId]      = useState<string | null>(null);
  const [selEdgeId,    setSelEdgeId]    = useState<string | null>(null);
  const [hoveredEdgeId,setHoveredEdgeId]= useState<string | null>(null);
  const [ctxMenu,      setCtxMenu]      = useState<CtxMenu | null>(null);
  const [renaming,     setRenaming]     = useState<{ id: string; val: string } | null>(null);

  // ── Node map for fast lookup ───────────────────────────────────────────────
  const nodeMap = useMemo(() => new Map(topology.nodes.map(n => [n.id, n])), [topology.nodes]);

  // ── World coord helpers ───────────────────────────────────────────────────
  const toWorld = useCallback((cx: number, cy: number) => {
    const r = wrapRef.current!.getBoundingClientRect();
    return {
      x: (cx - r.left - panRef.current.x) / zoomRef.current,
      y: (cy - r.top  - panRef.current.y) / zoomRef.current,
    };
  }, []);

  // ── Hit test (world space bounding box) ────────────────────────────────────
  const hitNode = useCallback((wx: number, wy: number): string | null => {
    const nodes = topoRef.current.nodes;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const nx = liveDrag?.nodeId === n.id ? liveDrag.x : n.position.x;
      const ny = liveDrag?.nodeId === n.id ? liveDrag.y : n.position.y;
      if (wx >= nx && wx <= nx + NW && wy >= ny && wy <= ny + NH) return n.id;
    }
    return null;
  }, [liveDrag]);

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName ?? '';
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      if (e.key === 'Escape') {
        dragRef.current = { kind: 'none' };
        setLiveWire(null); setLiveDrag(null); setCtxMenu(null);
        setSelEdgeId(null); setHoveredEdgeId(null);
      }
      if (e.key === '=' || e.key === '+') setZoom(z => Math.min(2.5, +(z + 0.1).toFixed(2)));
      if (e.key === '-')                   setZoom(z => Math.max(0.15, +(z - 0.1).toFixed(2)));
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId) { onDeleteNode(selectedNodeId); onSelectNode(null); }
        else if (selEdgeId) { onDeleteEdge(selEdgeId); setSelEdgeId(null); setHoveredEdgeId(null); }
        else if (hoveredEdgeId) { onDeleteEdge(hoveredEdgeId); setHoveredEdgeId(null); }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [selectedNodeId, selEdgeId, onDeleteNode, onDeleteEdge, onSelectNode]);

  // ── Cursor-centred wheel zoom ──────────────────────────────────────────────
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.9;
    const r  = wrapRef.current!.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;

    // Update both atomically to avoid pan-zoom race
    setZoom(prevZ => {
      const newZ = Math.max(0.15, Math.min(2.5, prevZ * factor));
      setPan(prevP => ({
        x: mx - (mx - prevP.x) * (newZ / prevZ),
        y: my - (my - prevP.y) * (newZ / prevZ),
      }));
      return newZ;
    });
  }, []);

  // ── Fit / Reset ────────────────────────────────────────────────────────────
  const fitView = useCallback(() => {
    const nodes = topoRef.current.nodes;
    if (!nodes.length || !wrapRef.current) return;
    const xs = nodes.map(n => n.position.x), ys = nodes.map(n => n.position.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs) + NW;
    const minY = Math.min(...ys), maxY = Math.max(...ys) + NH;
    const r = wrapRef.current.getBoundingClientRect();
    const pad = 64;
    const nz = Math.min(
      (r.width  - pad * 2) / Math.max(maxX - minX, 1),
      (r.height - pad * 2) / Math.max(maxY - minY, 1),
      1.4,
    );
    setZoom(nz);
    setPan({
      x: (r.width  - (maxX - minX) * nz) / 2 - minX * nz,
      y: (r.height - (maxY - minY) * nz) / 2 - minY * nz,
    });
  }, []);

  const resetView = useCallback(() => {
    setPan({ x: 60, y: 40 }); setZoom(0.88);
  }, []);

  // ── Port pointer down → start wire drag ───────────────────────────────────
  const handlePortDown = useCallback((
    fromId: string, ax: number, ay: number, e: React.PointerEvent,
  ) => {
    e.stopPropagation();
    wrapRef.current?.setPointerCapture(e.pointerId);
    const ds: DragState = { kind: 'wire', fromId, ax, ay, cx: ax, cy: ay };
    dragRef.current = ds;
    setLiveWire(ds as DragState & { kind: 'wire' });
  }, []);

  // ── Pointer down ──────────────────────────────────────────────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if (dragRef.current.kind === 'wire') return; // port drag already started

    // If the event was already stopped by a wire hit-path or delete pill,
    // it will NOT reach this handler — stopPropagation on SVG children prevents bubbling.
    // But React's synthetic event system bubbles through the SVG into the div anyway.
    // Guard: if the native target is a <path> or inside a wire <g>, skip drag start.
    const nativeTarget = e.nativeEvent.target as Element;
    const isWireHit =
      nativeTarget.tagName === 'path' &&
      nativeTarget.getAttribute('stroke') === 'transparent';
    if (isWireHit) return;

    const wrap = wrapRef.current!;
    wrap.setPointerCapture(e.pointerId);

    const w = toWorld(e.clientX, e.clientY);
    const nid = hitNode(w.x, w.y);

    if (nid) {
      const node = topoRef.current.nodes.find(n => n.id === nid)!;
      dragRef.current = {
        kind: 'node', nodeId: nid,
        startCx: e.clientX, startCy: e.clientY,
        startNx: node.position.x, startNy: node.position.y,
      };
      // clear edge hover so the delete pill doesn't stay open during drag
      setHoveredEdgeId(null);
    } else {
      dragRef.current = {
        kind: 'pan',
        startCx: e.clientX, startCy: e.clientY,
        startPx: panRef.current.x, startPy: panRef.current.y,
      };
      // clicking empty space deselects the edge
      setSelEdgeId(null);
      setHoveredEdgeId(null);
    }
  }, [toWorld, hitNode]);

  // ── Pointer move ──────────────────────────────────────────────────────────
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag.kind === 'none') return;

    if (drag.kind === 'node') {
      const dx = (e.clientX - drag.startCx) / zoomRef.current;
      const dy = (e.clientY - drag.startCy) / zoomRef.current;
      setLiveDrag({ nodeId: drag.nodeId, x: drag.startNx + dx, y: drag.startNy + dy });
    }

    if (drag.kind === 'pan') {
      setPan({
        x: drag.startPx + (e.clientX - drag.startCx),
        y: drag.startPy + (e.clientY - drag.startCy),
      });
    }

    if (drag.kind === 'wire') {
      const w = toWorld(e.clientX, e.clientY);
      const updated = { ...drag, cx: w.x, cy: w.y };
      dragRef.current = updated;
      setLiveWire(updated as DragState & { kind: 'wire' });
    }

    // Hover while not dragging a node
    if (drag.kind === 'pan' || drag.kind === 'wire') {
      const w = toWorld(e.clientX, e.clientY);
      setHoverId(hitNode(w.x, w.y));
    }
  }, [toWorld, hitNode]);

  // ── Pointer up ────────────────────────────────────────────────────────────
  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    dragRef.current = { kind: 'none' };

    if (drag.kind === 'node') {
      const dxPx = e.clientX - drag.startCx;
      const dyPx = e.clientY - drag.startCy;
      if (Math.hypot(dxPx, dyPx) > 4) {
        // Commit final position
        const dx = dxPx / zoomRef.current;
        const dy = dyPx / zoomRef.current;
        onNodeMove(drag.nodeId, drag.startNx + dx, drag.startNy + dy);
      } else {
        onSelectNode(drag.nodeId);
        setSelEdgeId(null);
        setCtxMenu(null);
      }
      setLiveDrag(null);
    }

    if (drag.kind === 'wire') {
      const w = toWorld(e.clientX, e.clientY);
      const tid = hitNode(w.x, w.y);
      if (tid && tid !== drag.fromId) onAddEdge(drag.fromId, tid);
      setLiveWire(null);
    }

    if (drag.kind === 'pan') {
      const dxPx = e.clientX - drag.startCx;
      const dyPx = e.clientY - drag.startCy;
      if (Math.hypot(dxPx, dyPx) < 4) {
        onSelectNode(null);
        setSelEdgeId(null);
        setCtxMenu(null);
      }
    }
  }, [toWorld, hitNode, onNodeMove, onSelectNode, onAddEdge]);

  const handlePointerCancel = useCallback(() => {
    dragRef.current = { kind: 'none' };
    setLiveWire(null); setLiveDrag(null);
  }, []);

  // ── Hover (mouse only — no pointer capture) ───────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (dragRef.current.kind !== 'none') return;
    const w = toWorld(e.clientX, e.clientY);
    setHoverId(hitNode(w.x, w.y));
  }, [toWorld, hitNode]);

  // ── Context menu ──────────────────────────────────────────────────────────
  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const w = toWorld(e.clientX, e.clientY);
    const nid = hitNode(w.x, w.y);
    if (nid) {
      setCtxMenu({ nodeId: nid, sx: e.clientX, sy: e.clientY });
      onSelectNode(nid);
    }
  }, [toWorld, hitNode, onSelectNode]);

  // ── Double-click: fit (if on canvas) ─────────────────────────────────────
  const handleDblClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const w = toWorld(e.clientX, e.clientY);
    if (!hitNode(w.x, w.y)) fitView();
  }, [toWorld, hitNode, fitView]);

  // ── Drag-from-palette (HTML5) ──────────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.dataTransfer.dropEffect = 'copy';
  }, []);
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const kind = e.dataTransfer.getData('application/x-lab-kind') as ComponentKind;
    if (!kind || !wrapRef.current) return;
    const w = toWorld(e.clientX, e.clientY);
    (wrapRef.current as HTMLDivElement & { _dropCallback?: (k: ComponentKind, x: number, y: number) => void })
      ._dropCallback?.(kind, w.x - NW / 2, w.y - NH / 2);
  }, [toWorld]);

  // ── Cursor ────────────────────────────────────────────────────────────────
  const cursor = dragRef.current.kind === 'wire' ? 'crosshair'
    : dragRef.current.kind === 'node' ? 'grabbing'
    : dragRef.current.kind === 'pan'  ? 'grabbing'
    : hoverId ? 'grab' : 'default';

  // ── Dot grid pattern — scrolls with pan ───────────────────────────────────
  const dotPatternX = ((pan.x % (GRID * zoom)) + GRID * zoom) % (GRID * zoom);
  const dotPatternY = ((pan.y % (GRID * zoom)) + GRID * zoom) % (GRID * zoom);

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div
      ref={wrapRef}
      style={{
        position: 'relative', width: '100%', height: '100%',
        overflow: 'hidden', cursor, userSelect: 'none', touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverId(null)}
      onWheel={handleWheel}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDblClick}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <svg style={{ width: '100%', height: '100%', display: 'block',
        background: 'var(--ua-background,#F8FAFC)' }}>
        <defs>
          {ARROWS.map(m => (
            <marker key={m.id} id={m.id}
              markerWidth={9} markerHeight={7} refX={8} refY={3.5}
              orient="auto" markerUnits="strokeWidth">
              <polygon points="0 0,9 3.5,0 7" fill={m.color} />
            </marker>
          ))}
          <pattern id="grid-dots" width={GRID * zoom} height={GRID * zoom}
            patternUnits="userSpaceOnUse"
            x={dotPatternX} y={dotPatternY}>
            <circle cx={GRID * zoom / 2} cy={GRID * zoom / 2} r={1.2}
              fill="var(--ua-border,#CBD5E1)" opacity={0.45} />
          </pattern>
        </defs>

        {/* Background dot grid */}
        <rect width="100%" height="100%" fill="url(#grid-dots)"
          style={{ pointerEvents: 'none' }} />

        {/* Empty state */}
        {topology.nodes.length === 0 && (
          <foreignObject x="50%" y="50%" width={360} height={160}
            style={{ transform: 'translate(-180px,-80px)', overflow: 'visible', pointerEvents: 'none' }}>
            <div style={{
              width: 360, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 10, padding: 28,
              background: 'var(--ua-surface)',
              border: '1.5px dashed var(--ua-border)', borderRadius: 16, textAlign: 'center',
            }}>
              <span style={{ fontSize: 32 }}>🗺️</span>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ua-text-secondary)', margin: 0 }}>
                Drag components from the left panel
              </p>
              <p style={{ fontSize: 11, color: 'var(--ua-text-muted)', margin: 0, lineHeight: 1.7 }}>
                Hover a node → drag its <strong style={{ color: '#6366F1' }}>+ port</strong> to another node to connect.
                Right-click any node to rename, duplicate, or kill it.
              </p>
            </div>
          </foreignObject>
        )}

        {/* World group */}
        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>

          {/* Edges */}
          {topology.edges.map(edge => (
            <Wire key={edge.id}
              edge={edge}
              from={nodeMap.get(edge.fromId)}
              to={nodeMap.get(edge.toId)}
              selected={edge.id === selEdgeId}
              highlighted={edge.fromId === selectedNodeId || edge.toId === selectedNodeId}
              hovered={edge.id === hoveredEdgeId}
              simTime={simTime} isRunning={isRunning}
              onSelect={id => { setSelEdgeId(id); onSelectNode(null); }}
              onHover={id => setHoveredEdgeId(id)}
              onDelete={id => { onDeleteEdge(id); setSelEdgeId(null); setHoveredEdgeId(null); }}
              liveDrag={liveDrag}
            />
          ))}

          {/* Live wire during connect-drag */}
          {liveWire && (() => {
            const d = bezierD(liveWire.ax, liveWire.ay, liveWire.cx, liveWire.cy);
            return (
              <g style={{ pointerEvents: 'none' }}>
                <path d={d} stroke="#8B5CF6" strokeWidth={2.5}
                  strokeDasharray="8 4" fill="none" markerEnd="url(#a-wire)" />
                <circle cx={liveWire.cx} cy={liveWire.cy} r={12}
                  fill="#8B5CF6" opacity={0.08} />
                <circle cx={liveWire.cx} cy={liveWire.cy} r={5}
                  fill="#8B5CF6" opacity={0.95} />
              </g>
            );
          })()}

          {/* Nodes */}
          {topology.nodes.map(node => {
            const isDragging = liveDrag?.nodeId === node.id;
            const rx = isDragging ? liveDrag!.x : node.position.x;
            const ry = isDragging ? liveDrag!.y : node.position.y;
            return (
              <NodeCard key={node.id}
                node={node}
                metrics={metrics[node.id]}
                selected={node.id === selectedNodeId}
                hovered={hoverId === node.id && !isDragging}
                dragging={isDragging}
                wireSrc={!!(liveWire && liveWire.fromId === node.id)}
                showPorts={hoverId === node.id || node.id === selectedNodeId}
                x={rx} y={ry}
                onPortDown={handlePortDown}
              />
            );
          })}
        </g>

        {/* Hint */}
        <text x={10} y={18} fontSize={9} fill="var(--ua-text-muted,#94A3B8)"
          style={{ pointerEvents: 'none' }}>
          scroll=zoom · drag node=move · drag canvas=pan · hover port(+)→drag=connect · hover wire→click ✕ Remove · Del=delete
        </text>
      </svg>

      {/* Zoom controls */}
      <ZoomControls zoom={zoom}
        onIn={() => setZoom(z => Math.min(2.5, +(z + 0.12).toFixed(2)))}
        onOut={() => setZoom(z => Math.max(0.15, +(z - 0.12).toFixed(2)))}
        onFit={fitView} onReset={resetView} />

      {/* Wire drag banner */}
      <div style={{
        position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
        background: '#7C3AED', color: '#fff',
        fontSize: 12, fontWeight: 600, borderRadius: 20, padding: '6px 22px',
        boxShadow: '0 4px 18px rgba(124,58,237,.4)',
        whiteSpace: 'nowrap', zIndex: 30, pointerEvents: 'none',
        opacity: liveWire ? 1 : 0, transition: 'opacity 0.15s',
      }}>
        🔌 Release on another node to connect — Esc to cancel
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <NodeCtxMenu menu={ctxMenu}
          onClose={() => setCtxMenu(null)}
          onDelete={id => { onDeleteNode(id); onSelectNode(null); setCtxMenu(null); }}
          onDupe={onDuplicateNode}
          onRename={id => {
            const node = topology.nodes.find(n => n.id === id);
            if (node) setRenaming({ id, val: node.label });
            setCtxMenu(null);
          }}
          onFail={id => { onTriggerFailure(id); setCtxMenu(null); }}
          onRevive={id => { onTriggerRecovery(id); setCtxMenu(null); }}
        />
      )}

      {/* Rename overlay */}
      {renaming && (() => {
        const node = topology.nodes.find(n => n.id === renaming.id);
        if (!node) return null;
        const sx = node.position.x * zoom + pan.x + (NW / 2) * zoom - 115;
        const sy = node.position.y * zoom + pan.y - 50;
        return (
          <div style={{
            position: 'absolute', left: sx, top: sy, zIndex: 500,
            background: 'var(--ua-surface)', border: '2px solid #6366F1',
            borderRadius: 10, boxShadow: '0 8px 28px rgba(0,0,0,.2)',
            padding: '8px 10px', display: 'flex', gap: 6, alignItems: 'center', minWidth: 230,
          }}>
            <input autoFocus value={renaming.val}
              onChange={e => setRenaming({ ...renaming, val: e.target.value })}
              onKeyDown={e => {
                if (e.key === 'Enter') { if (renaming.val.trim()) onRenameNode(renaming.id, renaming.val.trim()); setRenaming(null); }
                if (e.key === 'Escape') setRenaming(null);
              }}
              style={{
                flex: 1, border: '1px solid var(--ua-border)', borderRadius: 6,
                padding: '4px 8px', fontSize: 12, outline: 'none',
                background: 'var(--ua-background)', color: 'var(--ua-text-primary)',
              }}
              placeholder="Component name…"
            />
            <button onClick={() => { if (renaming.val.trim()) onRenameNode(renaming.id, renaming.val.trim()); setRenaming(null); }}
              style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: '#6366F1',
                color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={13} />
            </button>
            <button onClick={() => setRenaming(null)}
              style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--ua-border)',
                background: 'transparent', color: 'var(--ua-text-muted)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={13} />
            </button>
          </div>
        );
      })()}
    </div>
  );
};
