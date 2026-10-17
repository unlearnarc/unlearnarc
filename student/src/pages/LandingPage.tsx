import { useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  ArrowDown, ArrowRight, BookOpen, Check, ChevronDown, Code2, Compass,
  Globe2, Layers3, ListChecks, Map, Pause, Play, Sparkles, Target, Terminal,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/ui/Logo';
import { LandingDemo } from './LandingDemo';
import './landing-page.css';

const FEATURES = [
  { icon: Play, tag: 'SEE IT CLICK', title: 'Concepts that move. Understanding that stays.', text: 'Explore interactive animations and step-by-step algorithm visualisations. Pause, replay, and follow what happens behind the code.', className: 'visual', to: '/animations', link: 'Explore animations' },
  { icon: Layers3, tag: 'BUILD YOUR FOUNDATION', title: 'A little structure. A lot of clarity.', text: 'Follow courses organised into skills and topics. Start with the fundamentals and build toward more complex ideas, one lesson at a time.', className: 'courses', to: '/explore', link: 'Browse courses' },
  { icon: Target, tag: 'PUT IT INTO PRACTICE', title: 'Find your level. Then go further.', text: 'Practise with easy, medium, and hard questions. Test your understanding, review your results, and see what needs another look.', className: 'tests', to: '/login', link: 'Sign in to take a test' },
];
const EXTRAS = [
  { icon: Map, title: 'A direction, not a detour', text: 'Domain-based roadmaps help you decide what to learn next.' },
  { icon: Terminal, title: 'Less setup. More doing.', text: 'Write and run code in the browser, then practise with coding challenges.' },
  { icon: ListChecks, title: 'Make progress visible', text: 'Keep track of your courses, test results, and learning streaks.' },
  { icon: Globe2, title: 'Learn your way', text: 'Choose your interface language and use focus tools to make space for learning.' },
];
const FAQS = [
  { q: 'What is UnlearnArc?', a: 'UnlearnArc is a newly launching learning platform that brings structured courses, interactive concept animations, algorithm visualisations, and level-based tests together in one place.' },
  { q: 'Where should I start?', a: 'Browse the course catalogue, choose a domain that interests you, and start with the fundamentals. Guided roadmaps help you follow a clear learning sequence.' },
  { q: 'How do level-based tests work?', a: 'Tests use easy, medium, and hard questions to help you practise at different difficulty levels. Review your results to decide what to study next.' },
  { q: 'Do I need to install anything?', a: 'No extra software is needed for the learning tools. Courses, animations, algorithm visualisations, and the code editor are available in your browser.' },
];

export function LandingPage() {
  const { loginWithGoogle, isAuthenticated } = useAuth();
  const root = useRef<HTMLDivElement>(null);
  const [motionEnabled, setMotionEnabled] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setMotionEnabled(!preference.matches);
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  // Progressive enhancement: content remains visible if observers are unavailable.
  useEffect(() => {
    const page = root.current;
    if (!page || !motionEnabled || isAuthenticated) return;
    const elements = page.querySelectorAll<HTMLElement>('[data-reveal]');
    let observer: IntersectionObserver | undefined;
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer?.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 });
      elements.forEach(element => {
        element.classList.add('will-reveal');
        observer?.observe(element);
      });
    }
    // Animate decorative layers only; no scroll-driven React renders or layout reads.
    let frame = 0;
    const paint = () => {
      page.style.setProperty('--landing-scroll', `${Math.min(window.scrollY, 1000)}px`);
      frame = 0;
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(paint); };
    paint();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      observer?.disconnect();
      elements.forEach(element => element.classList.remove('will-reveal'));
      window.removeEventListener('scroll', onScroll);
      window.cancelAnimationFrame(frame);
      page.style.setProperty('--landing-scroll', '0px');
    };
  }, [motionEnabled, isAuthenticated]);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div ref={root} data-theme="light" className={`landing-page${motionEnabled ? '' : ' motion-paused'}`}>
      <a className="landing-skip" href="#main-content">Skip to content</a>
      <header className="landing-header">
        <div className="landing-container landing-nav">
          <Logo to="/" />
          <nav aria-label="Main navigation" className="landing-nav-links">
            <a href="#features">Why UnlearnArc</a>
            <a href="#playground">Try it out</a>
            <a href="#how">Your learning path</a>
          </nav>
          <button onClick={loginWithGoogle} className="landing-button small">Get started <ArrowRight size={16} aria-hidden="true" /></button>
        </div>
      </header>

      <main id="main-content">
        <section className="landing-hero" aria-labelledby="hero-title">
          <div className="landing-orb orb-one" aria-hidden="true" />
          <div className="landing-orb orb-two" aria-hidden="true" />
          <div className="landing-container landing-hero-grid">
            <div className="landing-hero-copy">
              <span className="landing-eyebrow launch-label"><span /> A new way to connect the dots</span>
              <h1 id="hero-title">A clearer way to learn.<br /><span>See it. Try it.<br />Make it yours.</span></h1>
              <p>One calm workspace for your next big idea. Follow a learning path, explore concepts in motion, and practise until it clicks.</p>
              <div className="landing-actions">
                <button onClick={loginWithGoogle} className="landing-button">Start your learning arc <ArrowRight size={18} aria-hidden="true" /></button>
                <a href="#playground" className="landing-button secondary"><Play size={16} aria-hidden="true" /> Try the interactive demo</a>
              </div>
              <div className="landing-hero-notes"><span><Check size={15} aria-hidden="true" /> Learn at your pace</span><span><Check size={15} aria-hidden="true" /> Right in your browser</span></div>
            </div>
            <div className="landing-hero-art" aria-label="Learning journey: visualise a concept, follow a course, and test your understanding" role="img">
              <div className="landing-orbit orbit-outer" /><div className="landing-orbit orbit-inner" />
              <div className="landing-art-core"><Sparkles size={32} /><span>Your next<br /><strong>aha! moment.</strong></span><div className="landing-core-dots"><i /><i /><i /></div></div>
              <div className="landing-float float-visual"><span className="landing-mini-icon"><Play size={18} /></span><div><small>MAKE IT MAKE SENSE</small><strong>Watch ideas come alive</strong></div><div className="landing-mini-bars">{[32, 54, 24, 70, 44].map((height, i) => <i key={i} style={{ height, animationDelay: `${i * .2}s` }} />)}</div></div>
              <div className="landing-float float-course"><BookOpen size={22} /><div><small>ONE STEP AT A TIME</small><strong>A path with purpose</strong><span className="landing-mini-path"><i /><b /><i /><b /><i /></span></div></div>
              <div className="landing-float float-level"><Target size={22} /><div><small>GROW AT YOUR LEVEL</small><strong>Learn. Test. Level up.</strong><span className="landing-level-chips"><i>Easy</i><i>Medium</i><i>Hard</i></span></div></div>
              <span className="landing-art-spark spark-one">+</span><span className="landing-art-spark spark-two">✳</span>
            </div>
          </div>
          <div className="landing-container landing-hero-bottom"><a href="#features"><ArrowDown size={15} aria-hidden="true" /> A closer look at learning, reimagined</a><button className="landing-motion-toggle" onClick={() => setMotionEnabled(value => !value)} aria-pressed={!motionEnabled}>{motionEnabled ? <Pause size={13} /> : <Play size={13} />}{motionEnabled ? 'Pause animations' : 'Enable animations'}</button></div>
        </section>

        <section id="features" className="landing-section landing-container" aria-labelledby="features-title">
          <div className="landing-section-heading" data-reveal><span className="landing-eyebrow">LESS PASSIVE SCROLLING. MORE ACTIVE LEARNING.</span><h2 id="features-title">Built for the way<br /><span>understanding actually happens.</span></h2><p>See the concept. Build the foundation. Put it to the test.</p></div>
          <div className="landing-feature-grid">
            {FEATURES.map(({ icon: Icon, tag, title, text, className, to, link }, index) => <article key={tag} className={`landing-feature ${className}`} data-reveal>
              <div className="landing-feature-top"><span className="landing-feature-icon"><Icon size={25} aria-hidden="true" /></span><span className="landing-feature-number">0{index + 1}</span></div>
              <span className="landing-eyebrow">{tag}</span><h3>{title}</h3><p>{text}</p>
              {className === 'visual' && <div className="landing-feature-visual" aria-hidden="true"><span>&lt;/&gt;</span><i /><span className="landing-node">A</span><i /><span className="landing-node">B</span></div>}
              {className === 'courses' && <div className="landing-course-list" aria-hidden="true"><span><Check size={14} /> Foundations</span><span><BookOpen size={14} /> Core concepts</span><span><Code2 size={14} /> Put it into practice</span></div>}
              {className === 'tests' && <div className="landing-test-levels" aria-label="Easy, medium, and hard difficulty"><span>Easy<i /></span><span>Medium<i /></span><span>Hard<i /></span></div>}
              <Link to={to} className="landing-text-link">{link}<ArrowRight size={16} aria-hidden="true" /></Link>
            </article>)}
          </div>
        </section>

        <section id="playground" className="landing-playground" aria-labelledby="playground-title">
          <div className="landing-container landing-playground-grid">
            <div data-reveal><span className="landing-eyebrow"><Sparkles size={14} aria-hidden="true" /> NOT JUST A PRETTY ANIMATION</span><h2 id="playground-title">Less abstract.<br /><span>More “oh, I get it.”</span></h2><p>What if you could see an algorithm think? Try this small binary search demo. Pick a number, move through each step, and watch the search space shrink.</p><ul className="landing-checklist"><li><Check size={18} /> Break complex ideas into clear steps</li><li><Check size={18} /> Take control of the pace</li><li><Check size={18} /> Connect the explanation to the action</li></ul><Link to="/algorithms" className="landing-text-link">Explore algorithm visualisations <ArrowRight size={17} aria-hidden="true" /></Link></div>
            <div data-reveal><LandingDemo /></div>
          </div>
        </section>

        <section id="how" className="landing-section landing-container" aria-labelledby="how-title">
          <div className="landing-section-heading" data-reveal><span className="landing-eyebrow">YOUR CURIOSITY. A CLEAR DIRECTION.</span><h2 id="how-title">From your first question<br /><span>to your next breakthrough.</span></h2><p>No need to figure out everything at once. Just take the next step.</p></div>
          <div className="landing-steps">
            {[{ icon: Compass, title: 'Find your starting point', text: 'Choose a domain or course that matches what you want to understand.' }, { icon: Play, title: 'Make the idea click', text: 'Work through topics and explore animations that show the how and why.' }, { icon: Target, title: 'Put your learning to work', text: 'Practise, take a level-based test, and use your results to guide your next step.' }].map(({ icon: Icon, title, text }, index) => <article key={title} data-reveal><span className="landing-step-index">0{index + 1}<Icon size={20} aria-hidden="true" /></span><h3>{title}</h3><p>{text}</p></article>)}
          </div>
          <div className="landing-extras" data-reveal>{EXTRAS.map(({ icon: Icon, title, text }) => <article key={title}><Icon size={23} aria-hidden="true" /><h3>{title}</h3><p>{text}</p></article>)}</div>
        </section>

        <section id="faq" className="landing-faq landing-container" aria-labelledby="faq-title">
          <div data-reveal><span className="landing-eyebrow">GOOD QUESTIONS</span><h2 id="faq-title">A few things<br /><span>you might be wondering.</span></h2><p>New here? So are we. Here’s what to expect as you begin.</p></div>
          <div data-reveal>{FAQS.map(({ q, a }) => <details key={q}><summary>{q}<ChevronDown size={18} aria-hidden="true" /></summary><p>{a}</p></details>)}</div>
        </section>

        <section className="landing-container landing-cta-wrap" aria-labelledby="cta-title" data-reveal><div className="landing-cta"><span className="landing-eyebrow"><Sparkles size={15} aria-hidden="true" /> CURIOSITY LOOKS GOOD ON YOU</span><h2 id="cta-title">Your next chapter<br />starts with an “aha.”</h2><p>We’re just getting started. Come explore a more hands-on way to learn.</p><div className="landing-actions"><button onClick={loginWithGoogle} className="landing-button">Let’s get learning <ArrowRight size={18} aria-hidden="true" /></button><Link to="/explore" className="landing-button secondary">Browse courses <BookOpen size={17} aria-hidden="true" /></Link></div></div></section>
      </main>
      <footer className="landing-footer landing-container"><Logo size="sm" /><p>A little curiosity. A new learning arc.</p><nav aria-label="Footer navigation"><a href="#features">Features</a><a href="#faq">FAQ</a><Link to="/explore">Courses</Link></nav><small>© {new Date().getFullYear()} UnlearnArc</small></footer>
    </div>
  );
}
