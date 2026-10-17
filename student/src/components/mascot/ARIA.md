# Aria — UnlearnArc’s coding companion

Original layered vector artwork, animated entirely in the browser without new dependencies, CDN calls, or server processing.

## Actions and expressions

`happy`, `sleepy`, `excited`, `sad` (encouraging), `walking`, `sleeping`, `greeting`, `thinking`, `surprised`.

- Walking is deliberately **in place**: alternating legs, lifted shoes, counter-swinging arms and a subtle torso bob. The floating button never moves across the screen or changes its hit target.
- Greeting raises the right hand and waves around the shoulder; excited loops both raised arms with a small upper-body bounce.
- Sleeping has closed eyes, relaxed arms, tilted head and breathing. Thinking and surprise have distinct poses.
- Welcome events greet; correct answers smile; milestones celebrate; mistakes encourage; the idle nudge sleeps. During quiet periods the floating buddy cycles through short walking, thinking and sleeping actions. Reactions interrupt this sequence.
- Muting disables ambient actions and motion. Reduced-motion preference disables looping motion and ambient sequencing, while allowing immediate static expression changes. All timers, media listeners and animation frames are cleaned up.
- Heart effects, romantic emojis and affectionate/flirtatious messages have been removed. Existing `friend` and `companion` preference IDs remain compatible; both are learning-focused tones.

## Preview and integration

Open `/mascot-preview` without signing in. Nine keyboard-accessible state buttons use the production renderer. Tune easing, duration, breathing anchor and light/dark/custom surfaces. Defaults: ease-in-out, 720 ms. The idle toggle controls all looping actions, not just blinking.

```tsx
import { AriaMascot } from './components/mascot';
import type { MascotState } from './components/mascot';

function Companion({ mood }: { mood: MascotState }) {
  return <div style={{ width: 240, height: 300 }}>
    <AriaMascot currentState={mood} label="Aria, your learning companion" />
  </div>;
}
```

Optional props: `idle`, `durationMs`, `easing` (CSS cubic-bezier tuple), `anchor`, `className`, `label`. A ref exposes `transitionTo(state)`; prefer either controlled state or imperative commands. Legacy character IDs resolve to Aria without changing stored personality/mute preferences.

## Editable source and bundled skill

- `mascot.states.js` is the canonical artwork: native Animator Studio `window.STATES_DATA`, `PREVIEW_CONFIG`, `PATH_OVERRIDES`, plus app-specific `MASCOT_TUNING`.
- Shared paths keep identical absolute M/L/Q/C/Z topology and paints. Grouped rotation-aware interpolation preserves nested eyes and limb details, reads live geometry when interrupted, and retains path nodes across state changes.
- `AriaMascot.tsx` uses one persistent animation clock, dampening idle during transitions. Feet are fixed in standing states; individual leg wrappers articulate during walking. Eye layers share each blink pivot.
- The bundled `svg/svg-character-animator` skill’s transform-first and compound-idle patterns are reused. Native `rotate-around-point` parts animate walking, greeting and excitement in Studio too. Runtime walking additionally translates/lifts feet; Studio’s native rotation-only gait is an approximation.
- Generated transparent still SVGs and the downloadable Studio source live in `public/mascot/unlearnarc/`, viewBox `0 0 360 450`, standing sole baseline y=420.

Regenerate and validate after editing artwork:

```sh
node scripts/export-mascot.mjs
node scripts/validate-mascot.mjs
npx tsc -b
npx playwright test tests/ui/mascot.func.spec.ts --project=functional --project=mobile
```

Open the bundled `animator-studio-en.html` and drop the canonical states file to tune native animations or export a web player, PNG sequence or SwiftUI. Studio itself uses CDN dependencies. Studio UI overrides do not rewrite the React source; transfer settings explicitly. Preview background colors are not part of the transparent artwork.
