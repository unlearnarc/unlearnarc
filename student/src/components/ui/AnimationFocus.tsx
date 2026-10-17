import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import './animation-focus.css';

/** Viewport-sized focus mode also works on phones without the Fullscreen API. */
export function AnimationFocus({ children, title }: { children: ReactNode; title: string }) {
  const [expanded, setExpanded] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current!;
    if (!expanded) {
      // Setting open avoids the autofocus steps of show(), preserving the
      // learner's current control when returning from a modal.
      dialog.open = true;
      return;
    }
    const y = window.scrollY;
    const overflow = document.body.style.overflow;
    dialog.close();
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      buttonRef.current?.focus({ preventScroll: true });
      window.scrollTo(0, y);
    };
  }, [expanded]);

  return (
    <div className="ua-animation-focus">
      <button ref={buttonRef} type="button" className="ua-focus-launch" onClick={() => setExpanded(true)}>
        <Maximize2 size={18} aria-hidden /> Full screen
        <span>Focus on the animation</span>
      </button>
      <dialog ref={dialogRef} className={`ua-focus-stage ${expanded ? 'is-expanded' : ''}`}
        role={expanded ? 'dialog' : 'group'} aria-label={`${title} animation`} aria-modal={expanded || undefined}
        onCancel={event => { event.preventDefault(); setExpanded(false); }}>
        {expanded && <header className="ua-focus-header">
          <strong>{title}</strong>
          <button type="button" onClick={() => setExpanded(false)} autoFocus>
            <Minimize2 size={18} aria-hidden /> Exit full screen
          </button>
        </header>}
        <div className="ua-focus-content">{children}</div>
      </dialog>
    </div>
  );
}
