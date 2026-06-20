# Family Memory Player — guide for AI agents (and humans)

A small Expo / React Native app that plays a family's digitized memories
(videos + photos) from **one codebase on iOS, Android, and Apple TV**. Built for
the Legacybox take-home. This file is the working contract for anyone — human or
agent — touching the code. It's intentionally short; read it before editing.

## Architecture, and the invariants that keep it honest

- `src/core/` — pure domain logic + types (memory model, JSON parsing,
  recently-viewed rules, formatting). **No `react` / `react-native` imports
  here.** This is what the unit tests cover and what makes the logic portable
  and trivially testable. If you reach for a RN import in `core`, you're in the
  wrong folder.
- `src/data/` — the `memories.json` library and `assetMap.ts`, which bridges the
  declarative `assetURL` strings to Metro's static `require()` graph (RN can't
  require an asset by a runtime string).
- `src/design-system/` — tokens (the single style vocabulary) + reusable,
  focus-aware components. Components speak **only** in tokens; no hardcoded
  colors, spacing, or font sizes.
- `src/features/{library,detail}/` — screens, composed from the design system.
- `src/platform/tv.ts` — the single source of truth for `IS_TV`. Branch on this,
  never on scattered `Platform.isTV` reads.
- `src/app/` — expo-router routes; keep them thin and delegate to features.

## The two-surface rule

This is **not three apps**. It's one shared core with two presentation modes:
**handheld** (iOS + Android, near-identical) and **10-foot** (Apple TV). When you
add UI:

- Make it work with touch **and** the TV focus engine — build on
  `FocusablePressable`, give the first element `hasTVPreferredFocus` on a screen.
- ⚠️ On tvOS, `Platform.OS === 'ios'`. **Never** gate an iOS-handheld-only
  feature (Picture-in-Picture, pinch-zoom) on `Platform.OS` alone — also gate on
  `!IS_TV`. (`CAN_PIP` in `VideoPlayer.tsx` is the reference example.)

## Commands

```bash
npx jest                 # unit tests (pure core logic)
npx tsc --noEmit         # typecheck (strict)
npx expo export --platform ios   # fast JS bundle smoke test (no native build)
npx expo run:ios         # phone build + launch (handheld)
npx expo run:android     # phone build + launch (handheld)
EXPO_TV=1 npx expo prebuild --clean && npx expo run:ios   # Apple TV build
```

## Definition of done — don't claim done without it

1. `npx tsc --noEmit` is clean.
2. `npx jest` is green.
3. `npx expo export --platform ios` bundles with no errors.
4. Prefer verifying the change on a real surface (a simulator screenshot) over
   asserting it works. (`/verify` runs steps 1–3.)

## Conventions

- TypeScript strict; no `any` in `core`/`features` without a written reason.
- Don't add dependencies without a clear need — the living-room build cares about
  bundle size.
- Keep authoring and reviewing as separate passes; don't self-approve in the same
  breath as writing.
