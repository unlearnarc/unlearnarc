import React from 'react';
import type { MascotMood } from './messages';
import { getCharacter, type CharacterDef, type CharacterKind } from './characters';

/* =============================================================================
   MascotAvatar — inline-SVG buddies that react to mood.
   Supports multiple characters (girl / boy / cat / robot) chosen by id.
   The waving arm (.ua-mascot-arm) is animated from mascot.css on 'wave' mood.
   Pure SVG → crisp at any size, themeable, zero image assets.
   ============================================================================= */

/* ── shared facial parts ─────────────────────────────────────────────────── */

function Mouth({ mood }: { mood: MascotMood }) {
  switch (mood) {
    case 'celebrate':
    case 'happy':
    case 'proud':
    case 'wave':
    case 'love':
      return <path d="M40 60 Q50 73 60 60" stroke="#1F2937" strokeWidth="3" fill="none" strokeLinecap="round" />;
    case 'encourage':
      return <path d="M42 62 Q50 66 58 62" stroke="#1F2937" strokeWidth="3" fill="none" strokeLinecap="round" />;
    case 'thinking':
      return <path d="M42 64 L56 62" stroke="#1F2937" strokeWidth="3" fill="none" strokeLinecap="round" />;
    default:
      return <path d="M43 62 Q50 67 57 62" stroke="#1F2937" strokeWidth="3" fill="none" strokeLinecap="round" />;
  }
}

function Eyes({ mood }: { mood: MascotMood }) {
  if (mood === 'love') {
    // heart eyes
    return (
      <>
        <path d="M38 44 l3 3 3-3a2.2 2.2 0 0 0-3-1.6 2.2 2.2 0 0 0-3 1.6z" fill="#EF4444" />
        <path d="M56 44 l3 3 3-3a2.2 2.2 0 0 0-3-1.6 2.2 2.2 0 0 0-3 1.6z" fill="#EF4444" />
      </>
    );
  }
  if (mood === 'celebrate' || mood === 'proud') {
    return (
      <>
        <path d="M36 46 Q41 42 46 46" stroke="#1F2937" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M54 46 Q59 42 64 46" stroke="#1F2937" strokeWidth="3" fill="none" strokeLinecap="round" />
      </>
    );
  }
  if (mood === 'wave') {
    return (
      <>
        <path d="M36 46 Q41 42 46 46" stroke="#1F2937" strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="59" cy="46" r="3.2" fill="#1F2937" />
      </>
    );
  }
  if (mood === 'thinking') {
    return (
      <>
        <circle cx="41" cy="45" r="3.2" fill="#1F2937" />
        <circle cx="59" cy="45" r="3.2" fill="#1F2937" />
      </>
    );
  }
  return (
    <>
      <circle cx="41" cy="46" r="3.4" fill="#1F2937" />
      <circle cx="59" cy="46" r="3.4" fill="#1F2937" />
    </>
  );
}

function Blush({ mood, color }: { mood: MascotMood; color: string }) {
  if (!['happy', 'celebrate', 'wave', 'proud', 'love'].includes(mood)) return null;
  return (
    <>
      <circle cx="35" cy="56" r="4" fill={color} opacity="0.7" />
      <circle cx="65" cy="56" r="4" fill={color} opacity="0.7" />
    </>
  );
}

/** Waving arm — the CSS targets .ua-mascot-arm to swing it on 'wave'. */
function WavingArm({ mood, accent }: { mood: MascotMood; accent: string }) {
  const up = mood === 'wave' || mood === 'celebrate' || mood === 'love';
  return (
    <g
      className={mood === 'wave' ? 'ua-mascot-arm ua-mascot-arm--wave' : 'ua-mascot-arm'}
      style={{ transformOrigin: '76px 74px' }}
    >
      <line
        x1="76" y1="74"
        x2={up ? 86 : 82} y2={up ? 56 : 82}
        stroke={accent} strokeWidth="5" strokeLinecap="round"
      />
      <circle cx={up ? 86 : 82} cy={up ? 56 : 82} r="4" fill="#FFE0BD" />
    </g>
  );
}

/* ── per-kind hair / head ────────────────────────────────────────────────── */

function GirlHead({ p }: { p: CharacterDef['palette'] }) {
  return (
    <>
      <path d="M22 52 Q22 20 50 20 Q78 20 78 52 L78 72 Q78 66 72 66 L28 66 Q22 66 22 72 Z" fill={p.hairDark} />
      <circle cx="50" cy="50" r="24" fill={p.skin} />
      <path d="M28 44 Q30 26 50 26 Q70 26 72 44 Q62 38 50 38 Q38 38 28 44 Z" fill={p.hair} />
      {/* side hair tufts */}
      <path d="M26 46 Q24 60 30 66 L30 48 Z" fill={p.hair} />
      <path d="M74 46 Q76 60 70 66 L70 48 Z" fill={p.hair} />
    </>
  );
}

function BoyHead({ p }: { p: CharacterDef['palette'] }) {
  return (
    <>
      <circle cx="50" cy="50" r="24" fill={p.skin} />
      {/* short spiky hair */}
      <path d="M27 42 Q28 24 50 24 Q72 24 73 42 Q66 34 60 36 Q58 30 50 31 Q42 30 40 36 Q34 34 27 42 Z" fill={p.hair} />
    </>
  );
}

function CatHead({ p }: { p: CharacterDef['palette'] }) {
  return (
    <>
      {/* ears */}
      <path d="M30 32 L26 16 L42 28 Z" fill={p.hair} />
      <path d="M70 32 L74 16 L58 28 Z" fill={p.hair} />
      <path d="M31 30 L29 21 L38 28 Z" fill={p.accentSoft} />
      <path d="M69 30 L71 21 L62 28 Z" fill={p.accentSoft} />
      <circle cx="50" cy="52" r="26" fill={p.skin} />
      {/* whiskers */}
      <line x1="20" y1="54" x2="34" y2="56" stroke="#92400E" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="20" y1="60" x2="34" y2="60" stroke="#92400E" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="80" y1="54" x2="66" y2="56" stroke="#92400E" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="80" y1="60" x2="66" y2="60" stroke="#92400E" strokeWidth="1.5" strokeLinecap="round" />
      {/* nose */}
      <path d="M48 56 L52 56 L50 59 Z" fill="#EF4444" />
    </>
  );
}

function RobotHead({ p }: { p: CharacterDef['palette'] }) {
  return (
    <>
      {/* antenna */}
      <line x1="50" y1="22" x2="50" y2="30" stroke={p.hairDark} strokeWidth="2.5" />
      <circle cx="50" cy="20" r="3.5" fill={p.accent} className="ua-mascot-antenna" />
      {/* head plate */}
      <rect x="28" y="30" width="44" height="42" rx="12" fill={p.skin} />
      <rect x="32" y="34" width="36" height="34" rx="9" fill="#E2E8F0" />
      {/* side bolts */}
      <circle cx="26" cy="50" r="3" fill={p.hairDark} />
      <circle cx="74" cy="50" r="3" fill={p.hairDark} />
    </>
  );
}

function Head({ kind, p }: { kind: CharacterKind; p: CharacterDef['palette'] }) {
  switch (kind) {
    case 'boy': return <BoyHead p={p} />;
    case 'cat': return <CatHead p={p} />;
    case 'robot': return <RobotHead p={p} />;
    default: return <GirlHead p={p} />;
  }
}

/* ── main component ──────────────────────────────────────────────────────── */

export const MascotAvatar: React.FC<{
  mood: MascotMood;
  size?: number;
  characterId?: string;
}> = ({ mood, size = 72, characterId = 'luna' }) => {
  const char = getCharacter(characterId);
  const p = char.palette;
  const isRobot = char.kind === 'robot';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={`${char.name} is ${mood}`}
    >
      <circle cx="50" cy="50" r="48" fill={p.accent} opacity="0.12" />

      <Head kind={char.kind} p={p} />

      <Blush mood={mood} color={p.accentSoft} />
      <Eyes mood={mood} />
      {!isRobot && <Mouth mood={mood} />}
      {isRobot && (
        /* robot smile is a little LED bar */
        <rect x="42" y="60" width="16" height="4" rx="2" fill="#1F2937" />
      )}

      {/* shoulders / collar accent */}
      <path d="M26 92 Q26 76 50 76 Q74 76 74 92 Z" fill={p.accent} />
      <WavingArm mood={mood} accent={p.accent} />

      {/* coach whistle / lanyard on humans */}
      {(char.kind === 'girl' || char.kind === 'boy') && (
        <>
          <circle cx="50" cy="82" r="3.5" fill="#FDE68A" stroke={p.hairDark} strokeWidth="1" />
          <path d="M40 78 L50 82 L60 78" stroke={p.accentSoft} strokeWidth="2" fill="none" />
        </>
      )}
    </svg>
  );
};
