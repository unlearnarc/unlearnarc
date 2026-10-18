/**
 * ResizablePanel — drag-to-resize panel with collapse button.
 * Works for left, right, and bottom panels.
 */
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';

// ── VERTICAL (left / right sidebar) ─────────────────────────────────────────
interface VerticalPanelProps {
  side: 'left' | 'right';
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  collapsedWidth?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const ResizableVerticalPanel: React.FC<VerticalPanelProps> = ({
  side, defaultWidth, minWidth, maxWidth, collapsedWidth = 0,
  children, style,
}) => {
  const [width, setWidth]         = useState(defaultWidth);
  const [collapsed, setCollapsed] = useState(false);
  const dragging = useRef(false);
  const startX   = useRef(0);
  const startW   = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startX.current   = e.clientX;
    startW.current   = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = side === 'left'
        ? e.clientX - startX.current
        : startX.current - e.clientX;
      const newW = Math.max(minWidth, Math.min(maxWidth, startW.current + delta));
      setWidth(newW);
      if (newW > minWidth + 20) setCollapsed(false);
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [side, minWidth, maxWidth]);

  const displayWidth = collapsed ? collapsedWidth : width;
  const CollapseIcon = side === 'left'
    ? (collapsed ? ChevronRight : ChevronLeft)
    : (collapsed ? ChevronLeft  : ChevronRight);

  return (
    <div style={{
      display: 'flex',
      flexDirection: side === 'left' ? 'row' : 'row-reverse',
      height: '100%',
      position: 'relative',
      flexShrink: 0,
      ...style,
    }}>
      {/* Panel content */}
      <div style={{
        width: displayWidth,
        minWidth: displayWidth,
        overflow: 'hidden',
        transition: collapsed ? 'width 0.2s ease' : undefined,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}>
        {!collapsed && children}
      </div>

      {/* Drag handle + collapse button */}
      <div
        style={{
          width: 6,
          position: 'relative',
          background: 'var(--ua-border)',
          cursor: 'col-resize',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          transition: 'background 0.15s',
        }}
        onMouseDown={onMouseDown}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--ua-primary-400)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'var(--ua-border)')}
      >
        {/* Drag grip dots */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 3, pointerEvents: 'none',
        }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: 3, height: 3, borderRadius: '50%',
              background: 'var(--ua-text-muted)', opacity: 0.5,
            }} />
          ))}
        </div>

        {/* Collapse button — floats on top of the handle */}
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand panel' : 'Collapse panel'}
          style={{
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            [side === 'left' ? 'right' : 'left']: -14,
            width: 20,
            height: 36,
            borderRadius: side === 'left' ? '0 6px 6px 0' : '6px 0 0 6px',
            border: '1px solid var(--ua-border)',
            background: 'var(--ua-surface)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20,
            boxShadow: '0 1px 4px rgba(0,0,0,.12)',
            padding: 0,
          }}
        >
          <CollapseIcon size={11} color="var(--ua-text-muted)" />
        </button>
      </div>
    </div>
  );
};

// ── HORIZONTAL (bottom panel) ────────────────────────────────────────────────
interface HorizontalPanelProps {
  defaultHeight: number;
  minHeight: number;
  maxHeight: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const ResizableBottomPanel: React.FC<HorizontalPanelProps> = ({
  defaultHeight, minHeight, maxHeight, children, style,
}) => {
  const [height, setHeight]       = useState(defaultHeight);
  const [collapsed, setCollapsed] = useState(false);
  const dragging = useRef(false);
  const startY   = useRef(0);
  const startH   = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startY.current   = e.clientY;
    startH.current   = height;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }, [height]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = startY.current - e.clientY;
      const newH  = Math.max(minHeight, Math.min(maxHeight, startH.current + delta));
      setHeight(newH);
      if (newH > minHeight + 20) setCollapsed(false);
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [minHeight, maxHeight]);

  const displayHeight = collapsed ? 38 : height; // 38 = tab bar height only

  return (
    <div style={{
      flexShrink: 0,
      height: displayHeight,
      display: 'flex',
      flexDirection: 'column',
      borderTop: '1px solid var(--ua-border)',
      background: 'var(--ua-surface)',
      position: 'relative',
      transition: collapsed ? 'height 0.2s ease' : undefined,
      ...style,
    }}>
      {/* Drag handle */}
      <div
        style={{
          height: 6,
          background: 'var(--ua-border)',
          cursor: 'row-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'background 0.15s',
          position: 'relative',
        }}
        onMouseDown={onMouseDown}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--ua-primary-400)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'var(--ua-border)')}
      >
        {/* Horizontal grip dots */}
        <div style={{ display: 'flex', gap: 3, pointerEvents: 'none' }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: 3, height: 3, borderRadius: '50%',
              background: 'var(--ua-text-muted)', opacity: 0.5,
            }} />
          ))}
        </div>

        {/* Collapse / expand button */}
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand panel' : 'Collapse panel'}
          style={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 48,
            height: 18,
            borderRadius: '4px 4px 0 0',
            border: '1px solid var(--ua-border)',
            borderBottom: 'none',
            background: 'var(--ua-surface)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            gap: 3,
            padding: 0,
          }}
        >
          {collapsed
            ? <ChevronUp   size={10} color="var(--ua-text-muted)" />
            : <ChevronDown size={10} color="var(--ua-text-muted)" />
          }
        </button>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflow: 'hidden',
        display: collapsed ? 'none' : 'flex',
        flexDirection: 'column',
      }}>
        {children}
      </div>
    </div>
  );
};
