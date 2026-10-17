import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './question-modal.css';

/** Native modal: isolates background controls, traps focus and restores it on close. */
export function QuestionModal({ children, label }: { children: ReactNode; label: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    // Focus the dialog before opening to avoid scrolling the underlying page.
    dialog.showModal();
    dialog.focus({ preventScroll: true });
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      previous?.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(
    <>
      {/* Keep the native backdrop effect intact through CSS prefix/minify passes. */}
      <style>{'.ua-question-modal::backdrop { backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }'}</style>
      <dialog ref={ref} tabIndex={-1} className="ua-question-modal" aria-label={label}
        onCancel={event => event.preventDefault()}
        onKeyDown={event => {
          if (event.key !== 'Tab') return;
          const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
          ));
          const first = items[0];
          const last = items[items.length - 1];
          if (!first) { event.preventDefault(); return; }
          if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
            event.preventDefault(); last.focus({ preventScroll: true });
          } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) {
            event.preventDefault(); first.focus({ preventScroll: true });
          }
        }}>
        {children}
      </dialog>
    </>,
    document.body,
  );
}
