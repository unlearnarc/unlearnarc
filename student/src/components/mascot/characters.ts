/** Aria replaces the previous four buddies. Legacy IDs resolve to her too. */
export type CharacterKind = 'girl' | 'boy' | 'cat' | 'robot';

export interface CharacterDef {
  id: string;
  name: string;
  kind: CharacterKind;
  tagline: string;
  palette: {
    skin: string;
    hair: string;
    hairDark: string;
    accent: string;
    accentSoft: string;
  };
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'aria',
    name: 'Aria',
    kind: 'girl',
    tagline: 'Your curious coding companion',
    palette: { skin: '#E8B897', hair: '#49312B', hairDark: '#302322', accent: '#14B8A6', accentSoft: '#CCFBF1' },
  },
];

export function getCharacter(id: string): CharacterDef {
  return CHARACTERS.find(c => c.id === id) ?? CHARACTERS[0];
}
