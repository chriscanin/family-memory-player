# Family Memory Player

A small player for a family's digitized memories — videos and photos — built for
the Legacybox take-home. One **React Native / Expo** codebase runs it on phones
*and* in the living room: browse a library, open a memory, scrub a video or
zoom a photo, and the app remembers what you recently viewed.

> Option A defaults to SwiftUI. Per the follow-up email, I built it in React
> Native / Expo to make the platform's case in code — the same player on a phone
> *and* a TV from a single codebase, instead of two native apps kept in sync.

## Surfaces

Four surfaces, one codebase:

- **iOS** and **Android** — the handheld experience (near-identical).
- **Apple TV** and **Android TV** — the same screens adapted to a 10-foot,
  d-pad-navigable UI (focus engine, swimlanes, a collapsible nav rail).

- NOTE: Please keep in mind that ios simulators do not support picture in picture mode (most of the time), so if there are any issues using PiP on the mobile device, you will need to sign the ios package with a developer account (in xcworkspace signing and capabilities section), and install the app to a real device. Android PiP should work on the emulator. PiP is not enabled for television devices.

`src/core/tv.ts` (`IS_TV`) is the single branch point; everything else is shared.

## Running it

```bash
npm install            # installs dependencies + applies native patches (postinstall)
npm start              # start Metro, then press  i  for iOS  or  a  for Android
```

Or build a surface directly — **pick the one you want to start on:**

```bash
# Handheld
npm run ios            # iPhone simulator        (expo run:ios)
npm run android        # Android emulator        (boot one first)

# 10-foot — regenerate the native project for TV first (EXPO_TV=1):
EXPO_TV=1 npx expo prebuild --clean
EXPO_TV=1 npx expo run:ios --device "Apple TV 4K (3rd generation)"   # tvOS
EXPO_TV=1 npx expo run:android                                       # Android TV emulator
```

Checks: `npm run verify` (typecheck + tests), or `npm test` / `npm run typecheck`
individually. (Picture-in-Picture needs a physical iOS device.)

## Continuous Native Generation — why there's no `ios/` or `android/`

The native projects are **generated, not committed.** They're git-ignored and
produced on demand by `expo prebuild` (Expo's Continuous Native Generation) from
`app.json` and its config plugins — so the repo stays pure JS/TS + config, and a
clean checkout reproduces the native folders 100%. `EXPO_TV=1` produces the TV
variant (leanback / landscape); unset produces the handheld one.

The only native changes live in **`patches/`** — three small `patch-package`
patches (an `expo-video` tvOS focus fix, plus two Xcode 26 / Swift 6 build fixes
in Expo's own modules) that re-apply automatically on `npm install`, so a freshly
regenerated project always has them.

## Project structure

Organized by layer over a pure, framework-free core:

| Path | What lives here |
|---|---|
| `src/core/` | Everything non-UI, consolidated: `domain/` (pure RN-free logic + types, unit-tested in plain Node), `data/` (`memories.json` + asset map), `e2e/` (Maestro specs), and `tv.ts` (the `IS_TV` flag) |
| `src/theme/` | Design tokens — palette, type, spacing, radius |
| `src/components/` | Reusable focus-aware components: `ui` · `media` · `player` · `navigation` · `onboarding` |
| `src/screens/` | `Library` · `Favorites` · `Profile` · `MemoryDetail` |
| `src/hooks/` | Playback, TV focus, and the persisted Zustand stores |
| `src/app/` | expo-router routes (thin; each delegates to a screen) |

`theme` + `components` are the design system; screens compose them; `core/domain`
stays free of the framework so the interesting logic is testable without a renderer.

## AI overview

Built pairing with **Claude Code (Opus)**, with the AI guardrails committed to the
repo as part of how it was built:

- **`.agent/specs/atdd/`** — acceptance-test specs, one architectural seam each
  (Given/When/Then), driving the hard problems. `EVIDENCE.md` is the root-cause
  paper trail for the tvOS focus bug, and **`src/core/e2e/tv-focus.yaml`** is the
  executable oracle: it drives the Android TV d-pad and asserts the real `focused`
  flag after every press.
- **`AGENTS.md`** (imported by `CLAUDE.md`) — the architecture contract: no RN in
  `core/domain`, the two-surface rule, the tvOS `Platform.OS` trap.
- **`.claude/`** — a `/verify` command (typecheck → tests → bundle) and a
  build-command allow-list.

I made the architecture and scope calls and verified on real simulators; the AI
did the bulk of the typing.

## Thanks

Thanks for reading, and for the chance to build this — it was a genuinely fun
problem. I'm happy to walk through any of it (especially the 10-foot focus model)
in the deep dive.
