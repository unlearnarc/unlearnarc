import { useQueries, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { courseAPI, domainAPI, enrollmentAPI, mappingAPI, skillAPI, topicAPI } from '../../api/endpoints';
import { CourseCard } from '../ui';
import type { Course, Domain, DomainSkillMapping, ImprovementReport, Skill, SkillCourseMapping, Topic } from '../../types';
import { recommendCourses } from './recommendations';

export function CourseRecommendations({ report }: { report: ImprovementReport }) {
  const courses = useQuery({ queryKey: ['courses'], queryFn: courseAPI.getAll });
  const enrollments = useQuery({ queryKey: ['my-learnings'], queryFn: enrollmentAPI.getMine });
  const skills = useQuery({ queryKey: ['skills'], queryFn: skillAPI.getAll });
  const domains = useQuery({ queryKey: ['domains'], queryFn: domainAPI.getAll });
  const ds = useQuery({ queryKey: ['domain-skill-mappings'], queryFn: mappingAPI.domainSkill });
  const sc = useQuery({ queryKey: ['skill-course-mappings'], queryFn: mappingAPI.skillCourse });
  const topics = useQueries({ queries: report.weakAreas.filter(w => w.entityType === 'TOPIC').map(w => ({
    queryKey: ['topic', w.entityId], queryFn: () => topicAPI.getById(w.entityId),
  })) });
  const queries = [courses, enrollments, skills, domains, ds, sc, ...topics];
  const loading = queries.some(q => q.isLoading);
  const failed = queries.some(q => q.isError);
  const recommendations = loading || failed ? [] : recommendCourses({
    courses: (courses.data?.data?.data ?? []) as Course[],
    enrolledIds: ((enrollments.data?.data?.data ?? []) as { courseId: string }[]).map(e => e.courseId),
    sourceCourseIds: [...report.weakAreas.filter(w => w.entityType === 'COURSE').map(w => w.entityId),
      ...topics.map(q => (q.data?.data?.data as Topic | undefined)?.courseId).filter((id): id is string => !!id)],
    domainIds: report.weakAreas.filter(w => w.entityType === 'DOMAIN').map(w => w.entityId),
    skills: (skills.data?.data?.data ?? []) as Skill[], domains: (domains.data?.data?.data ?? []) as Domain[],
    domainSkill: (ds.data?.data?.data ?? []) as DomainSkillMapping[], skillCourse: (sc.data?.data?.data ?? []) as SkillCourseMapping[],
  });
  return <section className="insight-panel insight-recommendations" aria-labelledby="recommended-courses-title" aria-busy={loading}>
    <header><div className="flex items-center gap-2"><BookOpen size={17} aria-hidden="true" className="text-primary-500" /><h2 id="recommended-courses-title">Your next learning step</h2></div></header>
    <p className="text-sm text-text-secondary mb-4">Few areas need improvement. Try something new connected to your courses, skills, or domains.</p>
    {loading ? <p role="status" className="text-sm text-text-secondary">Finding related courses…</p>
      : failed ? <div className="space-y-3"><p className="text-sm text-text-secondary">We couldn’t load course suggestions.</p><button className="practice-button" onClick={() => { queries.filter(q => q.isError).forEach(q => { void q.refetch(); }); }}>Retry suggestions</button></div>
      : recommendations.length ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{recommendations.map(({ course, reason }) => <CourseCard key={course.id} course={course} variant="list" status={reason} />)}</div>
      : <p className="text-sm text-text-secondary">No new related courses yet. Start a course to help us find your next step.</p>}
    <Link to="/explore" className="inline-flex mt-4 text-sm font-semibold text-primary-500">Explore all courses →</Link>
  </section>;
}
