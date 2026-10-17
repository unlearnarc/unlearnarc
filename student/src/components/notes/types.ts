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

export interface NoteBlock {
  kind: 'ANIMATION' | 'ALGORITHM';
  slug: string;
  caption?: string;
}

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
