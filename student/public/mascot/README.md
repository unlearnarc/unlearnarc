# Mascot Lottie animations

Drop `.lottie` or `.json` Lottie files here, one per character.
The loader maps by character id -> `/mascot/<id>.lottie` (falls back to `<id>.json`).

Character ids (see src/components/mascot/characters.ts):
  - luna, max, mochi, byte

Optional per-mood files for richer reactions (checked first, then the base file):
  /mascot/<id>.<mood>.lottie   e.g. luna.celebrate.lottie, max.wave.lottie
  moods: idle | happy | celebrate | encourage | proud | thinking | wave | love

## IMPORTANT: why the character showed the SVG (not Lottie) before
The dev/prod server is a SPA — it returns index.html (HTTP 200, text/html) for
ANY unknown path. A plain existence check therefore thought every candidate
"existed" and tried to feed index.html to the Lottie player, which failed.

lottieManifest.ts now rejects any response whose content-type is text/html, so:
  - no Lottie file present  -> clean inline-SVG avatar (always works)
  - real .lottie/.json here -> the Lottie animation plays

So the character ALWAYS renders. Add files to upgrade from SVG to Lottie.

## Settings
Character + personality (Buddy / Companion) + mute are configured in:
  - Profile page -> "Study Buddy" card (primary)
  - Right-click the floating buddy -> quick settings menu
