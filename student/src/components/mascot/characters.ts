/* =============================================================================
   Coach Buddy — character roster.

   Each character has an id, a display name, a gender/kind tag (used to pick the
   right SVG renderer) and a themeable palette. Add a new entry here + a matching
   branch in MascotAvatar to introduce a brand-new buddy.
   ============================================================================= */

export type CharacterKind = 'girl' | 'boy' | 'cat' | 'robot';

export interface CharacterDef {
  id: string;
  name: string;
  kind: CharacterKind;
  /** one-line vibe shown in the picker */
  tagline: string;
  palette: {
    skin: string;
    hair: string;
    hairDark: string;
    accent: string;   // clothes / accent colour
    accentSoft: string;
  };
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'luna',
    name: 'Luna',
    kind: 'girl',
    tagline: 'Warm & encouraging',
    palette: { skin: '#FFE0BD', hair: '#5A3825', hairDark: '#4B2E2E', accent: '#EC4899', accentSoft: '#FBCFE8' },
  },
  {
    id: 'max',
    name: 'Max',
    kind: 'boy',
    tagline: 'Chill & hype',
    palette: { skin: '#F1C9A5', hair: '#2B2B2B', hairDark: '#1C1C1C', accent: '#3B82F6', accentSoft: '#BFDBFE' },
  },
  {
    id: 'mochi',
    name: 'Mochi',
    kind: 'cat',
    tagline: 'Cute & cuddly',
    palette: { skin: '#FDE68A', hair: '#F59E0B', hairDark: '#D97706', accent: '#F97316', accentSoft: '#FED7AA' },
  },
  {
    id: 'byte',
    name: 'Byte',
    kind: 'robot',
    tagline: 'Smart & logical',
    palette: { skin: '#CBD5E1', hair: '#64748B', hairDark: '#475569', accent: '#06B6D4', accentSoft: '#A5F3FC' },
  },
];

export function getCharacter(id: string): CharacterDef {
  return CHARACTERS.find(c => c.id === id) ?? CHARACTERS[0];
}
