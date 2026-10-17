# React + TypeScript + Vite

## Student practice experience

`/tests` uses the dashboard's learner-focused visual language: adventure scope
cards, guided setup, a paginated practice journal (`?view=history`), and growth
insights (`?view=insights`). `PracticeLayout.tsx` and scoped `practice.css` share
the hero, tactile cards, stats and responsive styling without changing admin or
catalog cards. Light/dark themes and reduced motion are supported.

History loads 12 rounds per page; its best, average and passed stats explicitly
refer to the current page, while total rounds comes from the server. Insights
remain backend-computed and can be filtered by time range. Successful grading
refreshes history and both insight reports. No invented XP or mastery metrics
are displayed.

With the student dev server running, run the mocked browser checks without a
backend: `npx playwright test tests/ui/practice.func.spec.ts --project=functional
--project=mobile`. These cover quiz submission, journal review/pagination,
insight filters, error recovery, light/dark accessibility and 320–1920px layouts.

## New-account feature tour

Google OAuth account creation redirects to `/auth/callback` with `isNewUser=true`.
The callback queues a seven-step feature guide for that account; ordinary sign-ins
never queue it. Both OIDC and OAuth2 backend paths supply this flag.

The guide covers courses, animations, algorithm visualisers, level-based tests,
roadmaps, search, and study tools. Users can go back/next, skip, close with Escape,
or open a feature directly. The guide is not listed in the sidebar. For support
or onboarding review, `/dashboard?tour=1` replays it. The theme-aware native modal
keeps keyboard focus inside the guide and respects reduced-motion preferences.

## Theme and localization

New visitors get light mode, regardless of the device color scheme. An explicit
light/dark choice remains saved across visits. The public landing page always
uses a scoped light palette without changing the saved application theme.

The language selector translates static interface strings from `src/i18n/locales`.
API-authored course content, notes and questions stay in their original language.
Runtime machine translation, language-pack downloads and text-to-speech are
disabled; saved TTS preferences do not enable read-aloud controls or background
speech initialization.

Pending/done status uses `ua_feature_tour_v1:<userId>` in local storage, scoped to
the account and browser. Skipping or completing dismisses automatic replay;
clearing browser storage does not force tours for returning sign-ins. A pending
registration tour survives reloads until dismissed. Mascot rendering is disabled
on `/` without affecting its availability on other routes.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
