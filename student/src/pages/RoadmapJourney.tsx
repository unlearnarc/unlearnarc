import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Route, ChevronRight, ArrowLeft, Check, BookOpen, Layers, Briefcase, Code2 } from 'lucide-react';
import { ProgressBar } from '../components/ui/ProgressBar';
import { EmptyState } from '../components/ui/EmptyState';
import { buildRoadmapJourney, coursePercent, hasCourseActivity } from './roadmapModel';
import type { Roadmap, RoadmapCourse, JourneyStage } from './roadmapModel';

function Progress({ value, label, complete = false }: { value: number; label: string; complete?: boolean }) {
  return <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
    <ProgressBar value={value} color={complete ? 'bg-success' : undefined} />
  </div>;
}

const courseAction = (course: RoadmapCourse) => course.completed ? 'Review' : hasCourseActivity(course) ? 'Continue' : 'Start';
const courseStatus = (course: RoadmapCourse) => course.completed ? 'Completed' : hasCourseActivity(course) ? 'In Progress' : 'Not Started';
const coursePath = (course: RoadmapCourse) => `/courses/${encodeURIComponent(course.courseId)}`;
const courseDescription = (course: RoadmapCourse, stage: JourneyStage) => course.description
  || stage.skills.filter(skill => skill.courses.some(item => item.courseId === course.courseId)).map(skill => skill.skillName).join(' · ');

function CourseStatus({ course }: { course: RoadmapCourse }) {
  return <span className={`journey-status ${course.completed ? 'is-complete' : hasCourseActivity(course) ? 'is-active' : ''}`}>
    {course.completed && <Check size={12} aria-hidden="true" />}{courseStatus(course)}
  </span>;
}

function StageCourseRow({ course, stage, selected, onSelect, pickAction }: {
  course: RoadmapCourse; stage: JourneyStage; selected: boolean; onSelect: () => void;
  pickAction: (course: RoadmapCourse) => React.ReactNode;
}) {
  const percent = coursePercent(course);
  const Icon = [BookOpen, Code2, Layers, Briefcase][stage.index];
  return <li className={`journey-course-row ${selected ? 'is-selected' : ''}`}>
    <div className="journey-course-icon" aria-hidden="true"><Icon size={21} /></div>
    <div className="journey-course-body">
      <h3><button className="journey-desktop-course" onClick={onSelect} aria-pressed={selected} aria-controls="journey-course-detail">{course.courseName}</button>
        <Link className="journey-mobile-course" to={coursePath(course)}>{course.courseName}</Link></h3>
      <p>{courseDescription(course, stage)}</p>
      <div className="journey-course-progress"><Progress value={percent} label={`${course.courseName} progress`} complete={course.completed} /><span>{percent}%</span></div>
      <small>{course.completedTopics} / {course.topicsCount} topic quizzes completed</small>
    </div>
    <div className="journey-course-actions">
      <CourseStatus course={course} />
      <Link className={course.completed ? 'btn-secondary' : 'btn-primary'} to={coursePath(course)} aria-label={`${courseAction(course)}: ${course.courseName}`}>
        {courseAction(course)}<ChevronRight size={14} className="ua-flip-rtl" aria-hidden="true" />
      </Link>
      {pickAction(course)}
    </div>
  </li>;
}

export function RoadmapJourney({ roadmap, onBack, pickAction }: {
  roadmap: Roadmap; onBack: () => void; pickAction: (course: RoadmapCourse) => React.ReactNode;
}) {
  const journey = buildRoadmapJourney(roadmap);
  const [params, setParams] = useSearchParams();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const trackerRef = useRef<HTMLElement>(null);
  const returnLevelRef = useRef<string | null>(null);
  const stageParam = params.get('stage');
  const requested = journey.stages.find(item => item.level === stageParam);
  const stage = requested ?? journey.stages[journey.current];

  // Reset the selected course whenever the active stage changes so the right-panel
  // never shows a course that belongs to a different stage.
  const prevStageLevel = useRef<string | null>(null);
  useEffect(() => {
    if (prevStageLevel.current !== stage.level) {
      prevStageLevel.current = stage.level;
      setSelectedCourseId(null);
    }
  }, [stage.level]);

  useEffect(() => {
    if (!window.matchMedia('(max-width: 767px)').matches) return;
    if (stageParam) headingRef.current?.focus();
    else if (returnLevelRef.current) {
      trackerRef.current?.querySelector<HTMLButtonElement>(`button[data-level="${returnLevelRef.current}"]`)?.focus();
      returnLevelRef.current = null;
    }
  }, [stageParam]);

  // The API has no completion timestamp: use the last completed course in curriculum order.
  const course = stage.courses.find(item => item.courseId === selectedCourseId)
    ?? [...stage.courses].reverse().find(item => item.completed) ?? stage.courses[0];
  const selectStage = (level: string) => {
    setSelectedCourseId(null);
    setParams(previous => { const next = new URLSearchParams(previous); next.set('stage', level); return next; });
  };
  const showStages = () => {
    returnLevelRef.current = stage.level;
    setParams(previous => { const next = new URLSearchParams(previous); next.delete('stage'); return next; });
  };
  return <div className={`roadmap-detail roadmap-journey animate-fade-in ${requested ? 'is-course-view' : 'is-stage-view'}`}>
    <nav className="journey-breadcrumb" aria-label="Breadcrumb"><Link to="/dashboard">Home</Link><ChevronRight size={13} aria-hidden="true" /><button onClick={onBack}>Roadmap</button><ChevronRight size={13} aria-hidden="true" /><span aria-current="page">{roadmap.roleName}</span></nav>
    <header className="journey-header">
      <div><div className="journey-title"><Route size={25} aria-hidden="true" /><h1>Your Learning Roadmap</h1></div>
        <p>Follow a structured journey to become interview ready. Explore any stage and track your progress at your own pace.</p>
        <div className="journey-role"><strong>{roadmap.roleName}</strong><button onClick={onBack}>Change roadmap</button></div>
      </div>
      <section className="journey-overall card" aria-label="Overall Progress">
        <div className="journey-ring"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="27" /><circle className="journey-ring-fill" cx="32" cy="32" r="27" pathLength="100" strokeDasharray={`${journey.percent} 100`} /></svg><strong>{journey.percent}%</strong></div>
        <div><h2>Overall Progress</h2><p>{journey.completed} / {journey.total} courses completed</p><Progress value={journey.percent} label="Overall course completion" /></div>
      </section>
    </header>
    <nav ref={trackerRef} aria-label="Roadmap stages" className="journey-tracker"><ol>
      {journey.stages.map(item => <li key={item.level} className={`journey-stop is-${item.state} ${item.level === stage.level ? 'is-selected' : ''}`}>
        <button type="button" data-level={item.level} aria-current={item.level === stage.level ? 'step' : undefined}
          aria-describedby={`journey-state-${item.level}`} onClick={() => selectStage(item.level)}>
          <span className="journey-stop-number" aria-hidden="true">{item.complete ? <Check size={19} /> : item.index + 1}</span>
          <span><strong>{item.title}</strong><small>{item.subtitle}</small><span className="journey-stop-state" id={`journey-state-${item.level}`}>
            {item.state === 'unconfigured' ? 'No courses yet' : item.state === 'current' ? 'Current stage' : item.state === 'completed' ? 'Completed' : 'Available'}
          </span></span><ChevronRight className="journey-stage-chevron ua-flip-rtl" size={18} aria-hidden="true" />
        </button>
      </li>)}
    </ol></nav>
    <div className="journey-workspace">
      <section className="journey-courses card" aria-labelledby="journey-courses-heading">
        <header><button className="journey-back" onClick={showStages}><ArrowLeft size={16} className="ua-flip-rtl" aria-hidden="true" />All stages</button>
          <div className="journey-courses-heading"><h2 ref={headingRef} tabIndex={-1} id="journey-courses-heading"><span className="journey-desktop-course">Courses in This Stage</span><span className="journey-mobile-course">{stage.title}</span></h2><strong>{stage.percent}%</strong></div>
          <p>{stage.completed} / {stage.courses.length} courses completed · {stage.title}</p><Progress value={stage.percent} label="Selected stage completion" /></header>
        {stage.courses.length ? <ul>{stage.courses.map(item => <StageCourseRow key={item.courseId} course={item} stage={stage} selected={item.courseId === course?.courseId} onSelect={() => setSelectedCourseId(item.courseId)} pickAction={pickAction} />)}</ul>
          : <EmptyState icon={BookOpen} title="Courses coming soon" description="This stage does not have any assigned courses yet. Explore another stage to keep learning." />}
      </section>
      {course && <aside id="journey-course-detail" className="journey-course-detail card" aria-label="Selected course details">
        <span className="journey-detail-label">Selected course</span><h2>{course.courseName}</h2><CourseStatus course={course} />
        <p>{courseDescription(course, stage)}</p>
        <div className="journey-course-progress"><Progress value={coursePercent(course)} label="Selected course progress" complete={course.completed} /><span>{coursePercent(course)}%</span></div>
        <dl><div><dt>Topic quizzes</dt><dd>{course.completedTopics} / {course.topicsCount}</dd></div>{course.totalTime && <div><dt>Duration</dt><dd>{course.totalTime}</dd></div>}</dl>
        <Link className="btn-primary" to={coursePath(course)}>{courseAction(course)} course<ChevronRight size={14} aria-hidden="true" /></Link>
      </aside>}
    </div>
  </div>;
}
