// Shared types for the Notes admin feature.

export interface NoteSummary {
  id: string;
  title: string;
  summary?: string;
  coverImageUrl?: string;
  topicId?: string;
  courseId?: string;
  noteOrder: number;
  readMinutes?: number;
  isPublished: boolean;
  updatedAt: string;
}

export interface Note extends NoteSummary {
  contentHtml: string;
  blocksJson?: string;
  createdAt: string;
}

/** A reusable visual embedded inside a note, referenced by slug. */
export interface NoteBlock {
  /** ANIMATION → Canvas Animation scene; ALGORITHM → Algorithm visualizer. */
  kind: 'ANIMATION' | 'ALGORITHM';
  slug: string;
  /** Optional human caption rendered under the visual. */
  caption?: string;
}

export type NoteParent =
  | { topicId: string; courseId?: undefined }
  | { courseId: string; topicId?: undefined };

/** Parse the stored blocks_json string into a typed array (safe, never throws). */
export function parseBlocks(blocksJson?: string | null): NoteBlock[] {
  if (!blocksJson) return [];
  try {
    const parsed = JSON.parse(blocksJson);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((b) => b && (b.kind === 'ANIMATION' || b.kind === 'ALGORITHM') && typeof b.slug === 'string')
      .map((b) => ({ kind: b.kind, slug: b.slug, caption: b.caption }));
  } catch {
    return [];
  }
}
