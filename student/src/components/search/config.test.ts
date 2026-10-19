import { describe, expect, it } from 'vitest';
import { SEARCH_TYPES, SEARCH_TYPE_ORDER } from './config';

describe('search destinations', () => {
  it('supports backend SKILL results instead of crashing the result renderer', () => {
    expect(SEARCH_TYPE_ORDER).toContain('SKILL');
    expect(SEARCH_TYPES.SKILL.icon).toBeDefined();
    expect(SEARCH_TYPES.SKILL.to({ id: 'skill 1', type: 'SKILL', title: 'Java', score: 1 })).toBe('/explore?skill=skill%201');
  });
  it('deep links to the selected interview rather than silently dropping its id', () => {
    expect(SEARCH_TYPES.INTERVIEW_EXPERIENCE.to({ id: 'story 1', type: 'INTERVIEW_EXPERIENCE', title: 'Story', score: 1 })).toBe('/interview-experiences?experience=story%201');
  });
});
