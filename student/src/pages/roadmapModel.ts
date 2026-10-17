export interface RoadmapCourse {
  courseId: string; courseName: string; level: string; imgUrl?: string; description?: string;
  topicsCount: number; totalTime: string | null; completed: boolean;
  enrolled: boolean; progressPercent: number; completedTopics: number; bestCourseScore: number | null;
}
export interface RoadmapSkill { skillId: string; skillName: string; level: string; courses: RoadmapCourse[]; }
export interface RoadmapStage { level: string; order: number; skills: RoadmapSkill[]; }
export interface Roadmap {
  roleId: string; roleName: string; roleDescription?: string;
  totalSkills: number; totalCourses: number; completedCourses: number; progressPercent: number;
  stages: RoadmapStage[]; domains: { id: string; name: string }[];
}

export const STAGE_DEFINITIONS = [
  { level: 'BEGINNER', title: 'Foundations', subtitle: 'Build the basics.', description: 'Build a strong foundation with the essential concepts and skills for your learning path.' },
  { level: 'INTERMEDIATE', title: 'Core DSA', subtitle: 'Master the fundamentals.', description: 'Strengthen your problem-solving skills and master the core concepts in your curriculum.' },
  { level: 'ADVANCED', title: 'Advanced Topics', subtitle: 'Tackle complex problems.', description: 'Go deeper into advanced concepts and techniques to solve tougher problems.' },
  { level: 'EXPERT', title: 'Interview Ready', subtitle: 'Prepare for interviews.', description: 'Bring your skills together and build confidence for challenging interviews.' },
] as const;

export const hasCourseActivity = (course: RoadmapCourse) =>
  course.enrolled || course.completed || course.completedTopics > 0
  || course.progressPercent > 0 || course.bestCourseScore != null;
export const completionPercent = (completed: number, total: number) => total > 0 ? Math.round(completed / total * 100) : 0;
export const coursePercent = (course: RoadmapCourse) => course.completed ? 100
  : Number.isFinite(course.progressPercent) ? Math.min(100, Math.max(0, course.progressPercent)) : 0;
const uniqueCourses = (courses: RoadmapCourse[]) => [...new Map(courses.map(course => [course.courseId, course])).values()];

/** Presentation only: persisted quiz mastery remains the sole completion source.
 * All levels are open; missing levels are unconfigured, never fabricated as complete.
 */
export function buildRoadmapJourney(roadmap: Roadmap) {
  const stages = STAGE_DEFINITIONS.map((definition, index) => {
    const skills = roadmap.stages.filter(stage => stage.level === definition.level).flatMap(stage => stage.skills);
    const courses = uniqueCourses(skills.flatMap(skill => skill.courses));
    const completed = courses.filter(course => course.completed).length;
    return { ...definition, index, skills, courses, completed, percent: completionPercent(completed, courses.length),
      complete: courses.length > 0 && completed === courses.length };
  });
  const currentIndex = stages.findIndex(stage => stage.courses.length > 0 && !stage.complete);
  const current = currentIndex < 0 ? stages.reduce((last, stage, index) => stage.courses.length > 0 ? index : last, -1) : currentIndex;
  const journey = stages.map(stage => {
    const state = stage.complete ? 'completed' : stage.courses.length === 0 ? 'unconfigured'
      : stage.index === current ? 'current' : 'available';
    return { ...stage, state };
  });
  const courses = uniqueCourses(stages.flatMap(stage => stage.courses));
  const completed = courses.filter(course => course.completed).length;
  return { stages: journey, current: Math.max(0, current), total: courses.length, completed, percent: completionPercent(completed, courses.length) };
}
export type JourneyStage = ReturnType<typeof buildRoadmapJourney>['stages'][number];
