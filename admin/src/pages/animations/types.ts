import type { AnimationCategory, SceneSource } from '../../types/animation';

export const CATEGORIES: AnimationCategory[] = [
  'CONCURRENCY',
  'SYSTEM_DESIGN',
  'DSA',
  'AI_ML',
  'NETWORKING',
  'DATABASE',
  'OTHER',
];

export const CATEGORY_LABEL: Record<AnimationCategory, string> = {
  CONCURRENCY: 'Concurrency',
  SYSTEM_DESIGN: 'System Design',
  DSA: 'DSA',
  AI_ML: 'AI / ML',
  NETWORKING: 'Networking',
  DATABASE: 'Database / SQL',
  OTHER: 'Other',
};

export const SOURCES: SceneSource[] = ['GENERATED', 'AUTHORED'];

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Starter authored trace shown when a user picks the AUTHORED source. */
export const STARTER_TRACE = `{
  "id": "my-scene",
  "title": "My Scene",
  "duration": 3000,
  "viewport": { "width": 640, "height": 360 },
  "category": "OTHER",
  "keyframes": [
    {
      "time": 0,
      "caption": "Start",
      "entities": {
        "a": { "id": "a", "x": 160, "y": 180, "shape": "circle", "radius": 26, "label": "A", "status": "IDLE" }
      }
    },
    {
      "time": 1500,
      "caption": "A moves right and activates",
      "entities": {
        "a": { "id": "a", "x": 480, "y": 180, "shape": "circle", "radius": 26, "label": "A", "status": "ACTIVE" }
      }
    },
    {
      "time": 3000,
      "caption": "Done",
      "entities": {
        "a": { "id": "a", "x": 480, "y": 180, "shape": "circle", "radius": 30, "label": "A", "status": "SUCCESS" }
      }
    }
  ],
  "instructions": [
    { "id": "s1", "time": 0, "title": "Initial state", "detail": "Entity A starts idle on the left." },
    { "id": "s2", "time": 1500, "title": "Transition", "detail": "A animates to the right." }
  ],
  "notes": {
    "summary": "A minimal starter scene you can edit.",
    "whereToUse": ["Use as a template for authoring custom scenes."],
    "keyPoints": ["Numeric fields interpolate between keyframes."]
  }
}`;
