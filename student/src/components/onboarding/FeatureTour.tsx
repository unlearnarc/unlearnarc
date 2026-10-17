import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Check, Clapperboard, Compass, GraduationCap, Map, Search, Workflow, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { finishTour, hasPendingTour, requestRegistrationTour } from './tourStorage';
import './feature-tour.css';

const STEPS = [
  {
    title: 'Your learning journey starts here', icon: Compass, label: 'Welcome',
    description: 'A quick look around UnlearnArc. Learn a concept, see it in action, then test what you understand.',
    instructions: ['Explore a course that matches your interests.', 'Use animations and visualisers to make concepts click.', 'Check your understanding with level-based tests.'],
    destination: '/dashboard', action: 'Go to dashboard',
  },
  {
    title: 'Learn with a clear structure', icon: BookOpen, label: 'Courses',
    description: 'Explore brings courses together by domain, so you can find a starting point without guessing what to study next.',
    instructions: ['Open Explore and choose a domain or course.', 'Open a course to see its topics and enrol when you are ready.', 'Return to My Courses to continue your enrolled courses.'],
    destination: '/explore', action: 'Explore courses',
  },
  {
    title: 'Turn concepts into moving stories', icon: Clapperboard, label: 'Animations',
    description: 'Interactive animations break concepts into smaller moments you can watch at your own pace.',
    instructions: ['Open Animations and choose an available scene.', 'Play or pause the scene to follow each change.', 'Use the playback controls and notes to revisit anything unclear.'],
    destination: '/animations', action: 'Open animations',
  },
  {
    title: 'See how algorithms work', icon: Workflow, label: 'Visualisers',
    description: 'Follow the state of an algorithm as it runs instead of only reading the final answer.',
    instructions: ['Open Algorithms and select an algorithm.', 'Use its visualisation controls to follow the execution.', 'Pause and compare the changing data before continuing.'],
    destination: '/algorithms', action: 'Explore algorithms',
  },
  {
    title: 'Find your level, then build on it', icon: GraduationCap, label: 'Tests',
    description: 'Practise at a suitable difficulty and use the result to decide what to revisit.',
    instructions: ['Open Tests and select the domain, course, or topic you want to practise.', 'Choose an available level: easy, medium, or hard.', 'Submit your answers, review the result, and revisit weak areas.'],
    destination: '/tests', action: 'Open tests',
  },
  {
    title: 'Give your learning a direction', icon: Map, label: 'Roadmaps',
    description: 'Use a roadmap to connect individual skills to a bigger learning goal.',
    instructions: ['Open Roadmap and select a role that interests you.', 'Review the skills and courses in that path.', 'Work through the path alongside your enrolled courses.'],
    destination: '/roadmap', action: 'Explore roadmaps',
  },
  {
    title: 'Find things fast. Make space to focus.', icon: Search, label: 'Your workspace',
    description: 'Search and study tools are close at hand whenever you need them.',
    instructions: ['Use the search button at the top to find learning content.', 'Open the study tools at the bottom for notes, tasks, reminders, and focus sessions.', 'Switch between light and dark mode from the sidebar to suit your study session.'],
    destination: '/explore', action: 'Start exploring',
  },
];

export function FeatureTour() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [open, setOpen] = useState(() => !!user?.id && isAuthenticated && hasPendingTour(user.id));
  const [step, setStep] = useState(0);
  const userId = user?.id;

  // Consume the replay flag so reloads do not reopen a dismissed tour.
  useEffect(() => {
    if (!userId || !isAuthenticated || searchParams.get('tour') !== '1') return;
    // Profile refresh can remount the protected layout; preserve this request.
    requestRegistrationTour(userId, true);
    setStep(0);
    setOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('tour');
    setSearchParams(next, { replace: true });
  }, [userId, isAuthenticated, searchParams, setSearchParams]);

  useEffect(() => {
    const syncPending = () => {
      if (userId && isAuthenticated && hasPendingTour(userId)) {
        setStep(0);
        setOpen(true);
      }
    };
    window.addEventListener('storage', syncPending);
    window.addEventListener('focus', syncPending);
    return () => {
      window.removeEventListener('storage', syncPending);
      window.removeEventListener('focus', syncPending);
    };
  }, [userId, isAuthenticated]);

  useEffect(() => {
    const replay = () => {
      if (!userId || !isAuthenticated) return;
      setStep(0);
      setOpen(true);
    };
    window.addEventListener('ua:replay-feature-tour', replay);
    return () => window.removeEventListener('ua:replay-feature-tour', replay);
  }, [userId, isAuthenticated]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (open) headingRef.current?.focus();
  }, [step, open]);

  const close = () => {
    if (userId) finishTour(userId);
    setOpen(false);
  };
  const visit = () => {
    close();
    navigate(STEPS[step].destination);
  };
  const current = STEPS[step];
  const Icon = current.icon;
  const last = step === STEPS.length - 1;

  return (
    <dialog ref={dialogRef} className="feature-tour" aria-labelledby="feature-tour-title" aria-describedby="feature-tour-description" onCancel={(event) => { event.preventDefault(); close(); }}>
      <div className="feature-tour__header">
        <span>GET TO KNOW UNLEARNARC</span>
        <button type="button" onClick={close} aria-label="Close feature tour"><X size={20} /></button>
      </div>
      <div className="feature-tour__progress" role="progressbar" aria-label="Tour progress" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1}>
        {STEPS.map((item, index) => <span key={item.label} data-active={index <= step} />)}
      </div>
      <div className="feature-tour__body">
        <div className="feature-tour__icon" aria-hidden="true"><Icon size={32} /></div>
        <p className="feature-tour__eyebrow">{current.label} · {step + 1} / {STEPS.length}</p>
        <h2 id="feature-tour-title" tabIndex={-1} ref={headingRef}>{current.title}</h2>
        <p id="feature-tour-description">{current.description}</p>
        <ol>
          {current.instructions.map((instruction, index) => <li key={instruction}><span aria-hidden="true">{index + 1}</span>{instruction}</li>)}
        </ol>
        <button type="button" className="feature-tour__visit" onClick={visit}>{current.action}<ArrowRight size={16} /></button>
        <p className="feature-tour__hint">Opening a feature ends the tour. Your workspace is ready whenever you are.</p>
      </div>
      <div className="feature-tour__footer">
        <button type="button" className="feature-tour__secondary" onClick={close}>Skip tour</button>
        <div>
          <button type="button" className="feature-tour__secondary" onClick={() => setStep(s => s - 1)} disabled={step === 0}><ArrowLeft size={16} />Back</button>
          <button type="button" className="feature-tour__next" onClick={last ? close : () => setStep(s => s + 1)}>{last ? 'Finish tour' : 'Next'}{last ? <Check size={16} /> : <ArrowRight size={16} />}</button>
        </div>
      </div>
    </dialog>
  );
}
