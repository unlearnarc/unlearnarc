import type { ElementType, ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
// import { AriaMascot } from '../mascot/AriaMascot'; // Mascot UI temporarily paused.
import '../../styles/practice.css';

/** Shared visual language for the learner's practice, journal and insights pages. */
export function PracticeHero({ eyebrow, title, description, actions, children }: {
  eyebrow: string; title: string; description: string; actions?: ReactNode; children?: ReactNode;
}) {
  return (
    <header className="practice-hero">
      <div className="practice-hero-copy">
        <span className="practice-eyebrow"><Sparkles size={15} aria-hidden="true" />{eyebrow}</span>
        <h1>{title}</h1><p>{description}</p>
        {actions && <div className="practice-actions">{actions}</div>}
        {children}
      </div>
      {/* Mascot UI temporarily paused.
      <div className="practice-buddy" aria-hidden="true"><AriaMascot currentState="greeting" /><span><Sparkles size={18} /></span></div>
      */}
    </header>
  );
}

export function PracticeStat({ icon: Icon, value, label, tone = 'blue' }: {
  icon: ElementType; value: ReactNode; label: string; tone?: 'blue' | 'mint' | 'gold' | 'warm';
}) {
  return <div className={`practice-stat practice-tone-${tone}`}><span className="practice-icon"><Icon size={23} aria-hidden="true" /></span><div><strong>{value}</strong><span>{label}</span></div></div>;
}
