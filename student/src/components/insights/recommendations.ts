import type { Course, Domain, DomainSkillMapping, Skill, SkillCourseMapping } from '../../types';

/** Recommend only genuinely related, not-yet-enrolled courses; never invent affinity. */
export function recommendCourses({ courses, enrolledIds, sourceCourseIds, domainIds, skills, domains, domainSkill, skillCourse }: {
  courses: Course[]; enrolledIds: string[]; sourceCourseIds: string[]; domainIds: string[];
  skills: Skill[]; domains: Domain[]; domainSkill: DomainSkillMapping[]; skillCourse: SkillCourseMapping[];
}) {
  const owned = new Set(enrolledIds);
  const sources = new Set([...sourceCourseIds, ...enrolledIds]);
  const relatedSkills = new Set(skillCourse.filter(m => sources.has(m.courseId)).map(m => m.skillId));
  const relatedDomains = new Set([...domainIds, ...domainSkill.filter(m => relatedSkills.has(m.skillId)).map(m => m.domainId)]);
  const domainSkills = new Set(domainSkill.filter(m => relatedDomains.has(m.domainId)).map(m => m.skillId));
  return courses.filter(c => !owned.has(c.id) && !sources.has(c.id)).map(course => {
    const links = skillCourse.filter(m => m.courseId === course.id);
    const sharedSkill = links.find(m => relatedSkills.has(m.skillId));
    const sharedDomainSkill = links.find(m => domainSkills.has(m.skillId));
    const skill = skills.find(s => s.id === sharedSkill?.skillId);
    const domain = domains.find(d => domainSkill.some(m => m.domainId === d.id && m.skillId === sharedDomainSkill?.skillId && relatedDomains.has(d.id)));
    return { course, score: sharedSkill ? 2 : sharedDomainSkill ? 1 : 0,
      reason: sharedSkill ? `Build on ${skill?.name ?? 'a skill from your current courses'}.`
        : `Explore more in ${domain?.name ?? 'a related learning domain'}.` };
  }).filter(r => r.score > 0).sort((a, b) => b.score - a.score || a.course.name.localeCompare(b.course.name)).slice(0, 3);
}
