# Family Memory Player

A small player for a family's digitized memories — videos and photos — that runs
on **iOS, Android, Apple TV, and Android TV from a single React Native / Expo
codebase**.
It's the playback surface a Legacybox customer would see after a box of VHS tapes
and film reels comes back digitized.

> The brief defaults Option A to SwiftUI. Per the follow-up email, I built it in
> **React Native / Expo** instead — to show, in code, what the platform buys you:
> the same memory player on a phone *and* in the living room from one codebase.

---

## What it does

- **Library** — loads memories from a local `memories.json`, shows them with real
  poster frames, type/duration chips, and a **Recently Viewed** section.
- **Video detail** — `expo-video` (AVPlayer/ExoPlayer) playback with a custom
  **gesture scrubber**, **chapter** jump, ±10s skip, and **Picture-in-Picture**
  (iOS).
- **Photo detail** — **pinch-to-zoom** and **double-tap-to-zoom** (Reanimated +
  Gesture Handler), with pan when zoomed.
- **Recently Viewed** — last 5 opened, deduped and persisted across launches.
- **Apple TV & Android TV** — the same screens adapted to a 10-foot,
  d-pad-navigable UI (swimlanes + focus engine).

## Run it

```bash
npm install

npm test                  # unit tests
npx tsc --noEmit          # typecheck

npx expo run:ios          # iPhone simulator
npx expo run:android      # Android emulator (boot one first)

# Apple TV / Android TV — regenerate the native project for TV (EXPO_TV=1):
EXPO_TV=1 npx expo prebuild --clean
EXPO_TV=1 npx expo run:ios --device "Apple TV 4K (3rd generation)"   # tvOS
EXPO_TV=1 npx expo run:android                                       # Android TV emulator
```

> Native `ios/`/`android/` folders are generated (Continuous Native Generation)
> and git-ignored — the commands above materialize them. Picture-in-Picture
> needs a physical iOS device.

**Toolchain note.** `react-native` is aliased to the **`react-native-tvos`** fork
(`package.json`), so one codebase targets iOS, Android, and tvOS; `.npmrc` sets
`legacy-peer-deps` for the fork's prerelease version. Two small `patch-package`
patches under `patches/` fix a bleeding-edge **Xcode 26 / Swift 6** incompatibility
in Expo's own native modules (`weak let` / mutable-in-`Sendable`), applied
automatically on install.

---

## 1. Architecture decisions, and why

The layout is **feature folders over a pure core**, deliberately not a monorepo:

| Layer | Responsibility | Why it's split out |
|---|---|---|
| `src/core/` | Domain types, JSON parsing, recently-viewed rules, formatting | **Zero React Native imports** — pure TS, so it's portable and unit-tested in plain Node. The interesting logic lives here, away from the UI. |
| `src/data/` | `memories.json` + `assetMap` | RN can't `require()` an asset by a runtime string, so one map bridges declarative data to Metro's static graph. Keeps the JSON pure data. |
| `src/design-system/` | Tokens + reusable focus-aware components | One style vocabulary; type/spacing scale up on TV from the same tokens. |
| `src/features/` | `library` + `detail` screens | Composed from the design system; the routes stay thin. |
| `src/platform/` | `IS_TV` + helpers | Single source of truth for the surface branch. |

**Why feature folders, not separate packages?** For a one-app exercise, a Metro
+ CocoaPods + tvOS-prebuild monorepo is overhead that buys nothing here. Module
boundaries are enforced by discipline (the no-RN-in-`core` rule) and imports,
not by package manifests. At team/product scale I'd promote `core` and
`design-system` to workspace packages so they can be versioned and shared.

**State.** Recently-viewed is the only real state: a pure reducer in `core`
(`recordView`), wrapped in a tiny Zustand store with `persist` → AsyncStorage.
The library itself is static, parsed once at module load.

## 2. The multi-surface bet (the headline)

This isn't four apps — it's **one shared core with two presentation modes**:
*handheld* (iOS + Android, near-identical) and *10-foot* (Apple TV + Android TV).
Phone parity is nearly free with RN; the TV surface is the deliberate, crafted
adaptation:

- `FocusablePressable` unifies input — it reacts to **press** on touch and to the
  **focus engine** (`onFocus`/`onBlur`, `hasTVPreferredFocus`) on TV, driving the
  same lift/scale animation.
- The library renders a **grid** on handheld and **swimlanes** on TV; the
  scrubber is a **draggable bar** on touch and a **read-only progress bar + d-pad
  skip/chapter controls** on TV — same state, right input model per surface.
- The sharpest trap: **tvOS reports `Platform.OS === 'ios'`**, so Picture-in-
  Picture is gated on `!IS_TV && Platform.OS === 'ios'` (`CAN_PIP`). Getting this
  wrong would ship a dead PiP button on the TV.

## 3. AI workflow

Built in one focused session pairing with **Claude Code (Opus)**. The repo's own
AI guardrails are committed and are part of how it was built:

- **`AGENTS.md`** (imported by `CLAUDE.md`) — the architecture map and the
  invariants that matter: *no React Native in `core`*, the *two-surface rule*,
  and the *tvOS `Platform.OS` trap*. A real contract, not a checkbox — it's what
  kept the AI from leaking RN into the domain layer or mis-gating PiP.
- **`.claude/commands/verify.md`** — a `/verify` command encoding the done-gate
  (typecheck → tests → bundle), plus a permission allow-list in
  `.claude/settings.json` for the common build commands.

**Where AI helped:** scaffolding, the design-system boilerplate, the pure-logic +
its unit tests, and these docs — fast and mostly right. **Where it needed
steering / where it fell down:** the tvOS `Platform.OS` gotcha (pre-empted by
writing the rule down first); choosing *seek-on-release* scrubbing over thrashing
the player mid-drag; and toolchain yaks it couldn't think its way around — an
ffmpeg-in-a-loop stdin bug while prepping assets, and a bleeding-edge **Xcode 26 /
Swift 6** incompatibility in Expo's own native modules (see `patches/`).
I made the architecture and scope calls, reviewed every file, and verified on
simulators; the AI did the bulk of the typing.

## 4. Scope — what I built well, stubbed, and would do next

- **Built well:** the player feel (custom scrubber, chapters, PiP), the
  focus-aware design system, the pure tested core, and the genuine 3-surface run.
- **Stubbed / reasonable defaults:** bundled royalty-free sample media (see
  `assets/memories/CREDITS.md`) standing in for customer media; light error
  handling; the handheld grid is a wrapping `View`, not virtualized.
- **Week 2:** virtualize the library for real libraries; resume playback
  position; richer TV focus (`TVFocusGuideView` traps, parallax posters); promote
  `core`/`design-system` to workspace packages; generate thumbnails at import
  time instead of pre-baking them.

## 5. Time spent

One focused, AI-paired session (roughly a half-day of wall-clock, including the
four-surface build-out, the Xcode 26 / Swift 6 toolchain patches, and an
adversarial review pass). I won't pretend it was hand-typed — the AI workflow
above is the honest account: I made the architectural and scope calls and
reviewed/verified everything; Claude did most of the typing.

## Tests

`npx jest` — 19 tests over the recently-viewed rules (dedupe, cap at 5, ordering,
immutability) and formatting. The recently-viewed reducer is pure precisely so it
can be tested exhaustively without a renderer.
