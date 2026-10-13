import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/ui/Logo';
import {
  BookOpen, Zap, Target, Trophy, ArrowRight, CheckCircle, Star,
  Users, Globe, Code2, Brain, Rocket, Map, BarChart3, PlayCircle,
  Terminal, Award, Sparkles, ShieldCheck, Clock, type LucideIcon,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────────────────
   Content model — editing copy here keeps the JSX below clean.
   ──────────────────────────────────────────────────────────────────────── */

interface Feature {
  icon: LucideIcon;
  title: string;
  desc: string;
  color: string;
}

/** Key platform features shown in the main grid. */
const FEATURES: Feature[] = [
  {
    icon: Target,
    title: 'Domain-based Learning Paths',
    desc: 'Progress through structured domains and skills with curated courses, expert-written topics, and a clear roadmap from beginner to job-ready.',
    color: 'bg-primary-50 text-primary-500',
  },
  {
    icon: Brain,
    title: 'Adaptive Assessments',
    desc: 'Smart tests blend easy, medium, and hard questions to meet you at your level and keep you in the productive challenge zone.',
    color: 'bg-success-soft text-success',
  },
  {
    icon: BarChart3,
    title: 'Real Progress Tracking',
    desc: 'Earn points, maintain streaks, and watch detailed insights reveal exactly where you are strong and where to focus next.',
    color: 'bg-achievement-soft text-achievement',
  },
  {
    icon: Map,
    title: 'Guided Roadmaps',
    desc: 'Follow opinionated, step-by-step roadmaps that remove the guesswork and tell you precisely what to learn and in what order.',
    color: 'bg-primary-50 text-primary-500',
  },
  {
    icon: Trophy,
    title: 'Contests & Leaderboards',
    desc: 'Put your skills to the test in timed coding contests, climb the global leaderboard, and benchmark yourself against peers.',
    color: 'bg-achievement-soft text-achievement',
  },
  {
    icon: Globe,
    title: 'Multilingual & Accessible',
    desc: 'Learn in your preferred language with full localisation, text-to-speech support, and an accessibility-first interface.',
    color: 'bg-success-soft text-success',
  },
];

/** Hands-on / practical learning blocks. */
const PRACTICE: Feature[] = [
  {
    icon: Terminal,
    title: 'In-browser Code Editor',
    desc: 'Write, run, and test real code directly in the browser — no setup, no installs. Your sandbox runs instantly.',
    color: 'bg-primary-50 text-primary-500',
  },
  {
    icon: PlayCircle,
    title: 'Algorithm Visualisations',
    desc: 'Watch sorting, searching, and graph algorithms animate step-by-step so abstract concepts finally click.',
    color: 'bg-success-soft text-success',
  },
  {
    icon: Code2,
    title: 'Live Coding Contests',
    desc: 'Solve graded problems against hidden test cases with real-time feedback, just like a real technical assessment.',
    color: 'bg-achievement-soft text-achievement',
  },
  {
    icon: Award,
    title: 'Interview Experiences',
    desc: 'Read real, structured interview experiences and prepare with the questions candidates were actually asked.',
    color: 'bg-primary-50 text-primary-500',
  },
];

const STATS = [
  { icon: Globe,    value: '20+',  label: 'Learning Domains' },
  { icon: BookOpen, value: '100+', label: 'Curated Courses'  },
  { icon: Users,    value: '5K+',  label: 'Active Learners'  },
  { icon: Star,     value: '4.9',  label: 'Average Rating'   },
];

const STEPS = [
  { num: '01', title: 'Sign in with Google', desc: 'One click to get started — no forms, no passwords.' },
  { num: '02', title: 'Pick your domain',    desc: 'Choose a curated learning domain and a guided roadmap.' },
  { num: '03', title: 'Learn by doing',      desc: 'Study topics, run real code, and prove your skills with tests.' },
];

const BENEFITS = [
  'Free to get started — no credit card required',
  'Learn at your own pace, on any device',
  'Hands-on practice from day one',
  'Track measurable progress over time',
];

const FAQS = [
  {
    q: 'Is UnlearnArc free to use?',
    a: 'Yes. You can sign in and start learning across multiple domains for free. Advanced courses and contests are available as you progress.',
  },
  {
    q: 'Do I need to install anything?',
    a: 'No. Everything — the code editor, sandboxes, and visualisations — runs directly in your browser with zero setup.',
  },
  {
    q: 'Who is UnlearnArc for?',
    a: 'Students, self-taught developers, and professionals who want structured, hands-on learning with real progress tracking.',
  },
  {
    q: 'Can I learn in my own language?',
    a: 'Yes. The platform is fully localised into multiple languages and includes text-to-speech and accessibility support.',
  },
];

/* ────────────────────────────────────────────────────────────────────────
   Small presentational helpers
   ──────────────────────────────────────────────────────────────────────── */

const SectionHeading: React.FC<{
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: string;
}> = ({ eyebrow, title, subtitle }) => (
  <div className="text-center max-w-2xl mx-auto mb-12">
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary-500 mb-3">
      <Sparkles size={13} />
      {eyebrow}
    </span>
    <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3 leading-tight">
      {title}
    </h2>
    {subtitle && <p className="text-text-secondary text-base leading-relaxed">{subtitle}</p>}
  </div>
);

const FeatureCard: React.FC<Feature> = ({ icon: Icon, title, desc, color }) => (
  <div className="card p-6 group hover:-translate-y-1 hover:shadow-hover transition-all duration-200">
    <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center mb-4`}>
      <Icon size={22} />
    </div>
    <h3 className="text-base font-semibold text-text-primary mb-2">{title}</h3>
    <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
  </div>
);

const GoogleIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

/* ────────────────────────────────────────────────────────────────────────
   Page
   ──────────────────────────────────────────────────────────────────────── */

export const LandingPage: React.FC = () => {
  const { loginWithGoogle } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* ── Navbar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo to="/" />
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-text-secondary">
            <a href="#features" className="hover:text-text-primary transition-colors">Features</a>
            <a href="#practice" className="hover:text-text-primary transition-colors">Practice</a>
            <a href="#how" className="hover:text-text-primary transition-colors">How it works</a>
            <a href="#faq" className="hover:text-text-primary transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/explore" className="hidden sm:inline-flex text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
              Browse
            </Link>
            <button onClick={loginWithGoogle} className="btn-primary text-sm py-2 px-4">
              Get Started <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-70" />
        <div className="relative max-w-7xl mx-auto px-6 py-24 sm:py-32 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 border border-primary-200 text-primary-500 text-xs font-semibold mb-8 animate-fade-in">
            <Zap size={12} />
            Adaptive, hands-on learning platform
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary leading-tight mb-6 animate-slide-up">
            Master new skills by<br />
            <span className="text-gradient-primary">actually building them.</span>
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up">
            UnlearnArc blends structured courses, adaptive tests, and real hands-on practice —
            code editors, algorithm visualisations, and live contests — so you learn by doing,
            not just reading.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-slide-up">
            <button onClick={loginWithGoogle} className="btn-primary px-8 py-3 text-base w-full sm:w-auto">
              <GoogleIcon />
              Continue with Google
            </button>
            <Link to="/explore" className="btn-secondary px-8 py-3 text-base w-full sm:w-auto">
              <BookOpen size={18} />
              Browse Courses
            </Link>
          </div>

          {/* trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-10 text-xs text-text-muted animate-fade-in">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-success" /> Secure Google sign-in</span>
            <span className="inline-flex items-center gap-1.5"><Clock size={14} className="text-primary-500" /> Learn at your own pace</span>
            <span className="inline-flex items-center gap-1.5"><Rocket size={14} className="text-achievement" /> Free to get started</span>
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 -mt-6 mb-20">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STATS.map(({ icon: Icon, value, label }) => (
            <div key={label} className="card p-5 text-center animate-scale-in">
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center mx-auto mb-3">
                <Icon size={20} className="text-primary-500" />
              </div>
              <p className="text-2xl font-bold text-text-primary">{value}</p>
              <p className="text-xs text-text-muted mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Key Features ──────────────────────────────────────── */}
      <section id="features" className="max-w-7xl mx-auto px-6 mb-24 scroll-mt-20">
        <SectionHeading
          eyebrow="Key Features"
          title={<>Everything you need to <span className="text-gradient-primary">grow</span></>}
          subtitle="A complete learning environment — structured paths, adaptive assessments, and real-time insights, all in one place."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      {/* ── Practical / Hands-on Learning ─────────────────────── */}
      <section id="practice" className="bg-surface border-y border-border mb-24 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            {/* Left: copy + checklist */}
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary-500 mb-3">
                <Code2 size={13} />
                Practical Learning
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
                Learn by doing — not just watching
              </h2>
              <p className="text-text-secondary text-base leading-relaxed mb-8">
                Theory fades fast. UnlearnArc puts practice at the centre with real tools you use
                while you learn: run code in the browser, visualise algorithms, and compete in live
                contests that mirror real technical assessments.
              </p>
              <ul className="space-y-3 mb-8">
                {BENEFITS.map((b) => (
                  <li key={b} className="flex items-start gap-3">
                    <CheckCircle size={20} className="text-success shrink-0 mt-0.5" />
                    <span className="text-sm text-text-primary">{b}</span>
                  </li>
                ))}
              </ul>
              <button onClick={loginWithGoogle} className="btn-primary px-6 py-3 text-base">
                Start practising <ArrowRight size={16} />
              </button>
            </div>

            {/* Right: practice cards */}
            <div className="grid sm:grid-cols-2 gap-5">
              {PRACTICE.map((p) => (
                <FeatureCard key={p.title} {...p} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────── */}
      <section id="how" className="max-w-7xl mx-auto px-6 mb-24 scroll-mt-20">
        <SectionHeading
          eyebrow="How it works"
          title="Up and running in three steps"
          subtitle="No lengthy onboarding. Sign in and start learning in under a minute."
        />
        <div className="relative grid sm:grid-cols-3 gap-8">
          {STEPS.map(({ num, title, desc }) => (
            <div key={num} className="card p-7 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center text-white text-xl font-bold mb-4 shadow-hover">
                {num}
              </div>
              <h3 className="text-base font-semibold text-text-primary mb-2">{title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────── */}
      <section id="faq" className="max-w-3xl mx-auto px-6 mb-24 scroll-mt-20">
        <SectionHeading
          eyebrow="FAQ"
          title="Frequently asked questions"
        />
        <div className="space-y-3">
          {FAQS.map(({ q, a }) => (
            <details key={q} className="card p-5 group">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <span className="text-sm font-semibold text-text-primary pr-4">{q}</span>
                <ArrowRight
                  size={16}
                  className="text-text-muted shrink-0 transition-transform duration-200 group-open:rotate-90"
                />
              </summary>
              <p className="text-sm text-text-secondary leading-relaxed mt-3">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 mb-24">
        <div className="relative overflow-hidden rounded-[20px] bg-gradient-primary p-10 sm:p-16 text-center text-white">
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to start learning?</h2>
            <p className="text-white/80 text-base mb-8 max-w-lg mx-auto">
              Join thousands of learners building real, job-ready skills with UnlearnArc — free to start.
            </p>
            <button
              onClick={loginWithGoogle}
              className="inline-flex items-center gap-2.5 bg-surface text-primary-500 px-8 py-3 rounded-[10px] font-semibold text-base hover:bg-surface-soft transition"
            >
              <CheckCircle size={18} />
              Get started free
            </button>
          </div>
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/10" />
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-surface">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <nav className="flex items-center gap-6 text-xs text-text-muted">
            <a href="#features" className="hover:text-text-primary transition-colors">Features</a>
            <a href="#practice" className="hover:text-text-primary transition-colors">Practice</a>
            <a href="#faq" className="hover:text-text-primary transition-colors">FAQ</a>
          </nav>
          <p className="text-xs text-text-muted">© 2025 UnlearnArc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};
