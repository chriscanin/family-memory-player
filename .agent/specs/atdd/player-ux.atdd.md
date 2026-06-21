# ATDD Specification: Video Player UX

> **Seam:** the **presentation + interaction of the video player** — what the
> player *looks like* and how its controls behave over time. One boundary:
> `VideoPlayer.tsx` (+ its sub-components `ControlButton`, `Scrubber`, and the
> top bar in `MemoryDetailScreen.tsx`). This spec does **not** touch routing,
> the library, or the data model.
>
> **Hard precondition:** the focus model from
> [`tv-player-focus.atdd.md`](tv-player-focus.atdd.md) is sacred. Every change
> here must keep `maestro/tv-focus.yaml` exiting 0. Where this spec moves the
> chapters or changes layout, it **extends** that flow; it never weakens it.

## 1. Problem Statement

* **Context:** `VideoPlayer.tsx` already renders working controls — a play/pause
  button, ±10s skip, a chapter row, and a `Scrubber` (draggable on touch,
  read-only progress on TV) — built from `ControlButton` (text glyphs like `▶`,
  `❚❚`, `«10`), `Badge` chapter chips, and `AppText`. It works, but it reads as a
  **prototype**: monochrome text glyphs, a thin bar, chapters centered, and a
  title in the top-left that **disappears against light video** (no scrim).
* **The Gap:** five concrete shortfalls, all owner-reported:
  1. **Too plain.** Text-glyph controls and a bare bar don't look like a real
     media app. Needs real iconography (`@expo/vector-icons`), depth (gradient
     scrim instead of a flat `controlScrim`), and considered spacing/sizing.
  2. **Chapters are centered.** They should sit on the **left**, while keeping
     the d-pad focus bridges intact.
  3. **Unreadable title on light video.** The top-left title/subtitle has no
     background and vanishes over bright footage — it needs its own scrim.
  4. **Controls never auto-hide.** After a few seconds of playback the chrome
     should **fade away** to reveal the video; **any** input (tap on handheld,
     **any d-pad press** on TV) brings it back. *(On TV this collides with
     "focus is never lost" — see Constraints; the hidden state must still own
     focus.)*
  5. **No real scrubbing / no replay.** Touch can drag the bar, but there's no
     **press-and-hold to seek continuously** (fast-forward/rewind), and at the
     **end of playback** the play button stays a play glyph instead of becoming a
     **replay** control. Transitions (icon swaps, fades) should animate smoothly.
* **Impact:** the player is the app's centerpiece (it's a *memory player*). A
  prototype-grade player undercuts the whole product; an unreadable title is a
  real usability defect on bright home-video footage.

### Expected behavior (what "done" feels like)

A player that looks shipped: crisp vector controls on a gradient scrim, a
left-aligned chapter rail, a legible always-readable title, chrome that gets out
of the way during playback and returns on any input, continuous seek on hold,
and a graceful end-of-video replay — all with smooth (not janky) transitions,
**and the TV d-pad focus guarantees fully intact**.

## 2. System Constraints & Environment

* **Runtime/frameworks:** as in spec 0 — Expo SDK 56, `react-native-tvos@0.85.3-2`
  (Fabric/New Arch, React Compiler on), expo-video ~56.1.4, reanimated 4,
  gesture-handler 2.31. Surface gate is `IS_TV` (`src/platform/tv.ts`); on tvOS
  `Platform.OS === 'ios'`.
* **Design vocabulary:** components speak **only** in tokens
  (`src/design-system/tokens.ts`): `palette`, `spacing` (xs4…xxxl48),
  `radius` (sm/md/lg/pill), the type scale via `AppText` variants, and `metrics`
  (`isTV`, `screenPad`, `overscanY`, `focusScale`). No hardcoded colors/sizes.
  Existing player-relevant colors: `palette.playerBg`, `palette.controlScrim`,
  `palette.controlBg`, `palette.track`, `palette.accent`, `palette.scrim`,
  `palette.text`/`textMuted`. New tokens (e.g. a gradient stop pair, a
  `scrimStrong`) are added to `tokens.ts`, never inlined.
* **Icons:** `@expo/vector-icons` (Ionicons or Material — pick **one** family for
  consistency). `ControlButton` takes an icon name, not a glyph string. Keep a
  text fallback only if an icon is genuinely missing.
* **Gradient:** prefer a token-driven gradient scrim behind the controls and
  title. If a gradient needs `expo-linear-gradient`, that's an allowed 5th
  dependency **only if** a layered-opacity `View` stack can't achieve it; default
  to the no-dependency layered approach and note the choice.
* **expo-video reality:** the player is purely presentational
  (`nativeControls={false}`); RN draws all chrome. Playback state comes from
  `usePlaybackState(player)` (`isPlaying`, `currentTime`, `duration`). **End of
  playback** is detected from the player's status/`playToEnd` event — extend
  `usePlaybackState` to surface an `ended` (a.k.a. `didJustFinish`) flag rather
  than inferring it from `currentTime >= duration` (which is fragile).
* **⚠️ The focus invariant (spec 0) constrains the auto-hide design on TV.**
  Today the code special-cases TV to *never* hide (`scheduleHide` early-returns
  when `IS_TV`) precisely because hidden controls = no focus target = lost focus.
  This spec **changes** that: on TV, the hidden state must still **own exactly
  one focus target** (a full-screen focusable "reveal catcher"), so that "focus
  is never lost" holds even while the chrome is invisible, and the first d-pad
  press reveals the controls and restores focus to play/pause. The two
  `autoFocus` bridge guides (top bar ↔ controls cluster) must continue to work in
  the *visible* state exactly as today.
* **Animations:** reanimated 4 shared values / `withTiming` for fades and the
  icon cross-fade; no layout-thrash. Respect reduce-motion where trivial.
* **Files in scope:**
  * `src/features/detail/VideoPlayer.tsx` (the player + visibility state machine)
  * `src/features/detail/ControlButton.tsx` (glyph → vector icon; sizes)
  * `src/features/detail/Scrubber.tsx` (hold-to-seek; richer visuals)
  * `src/features/detail/usePlaybackState.ts` (add `ended` flag)
  * `src/features/detail/MemoryDetailScreen.tsx` (title scrim; participates in
    auto-hide — the top bar fades with the controls)
  * `src/design-system/tokens.ts` (new scrim/gradient tokens only)
  * `maestro/tv-focus.yaml` (extend for the moved chapters + hidden-state focus)
* **Out of scope:** PhotoViewer, the library, routing, favorites, auth. Don't
  restructure navigation here.

## 3. Black-Box Test Cases (the "green" gates)

> Handheld scenarios are driven by Maestro on an iOS sim / Android emulator
> (tap + assert visibility). TV scenarios assert the **`focused` flag** via
> Maestro on Android TV (the spec-0 oracle) and are confirmed on Apple TV. Visual
> polish (Scenarios 1, 4) is gated by a **screenshot review**, since "looks like a
> real app" isn't a pixel assertion — capture before/after stills.

### Scenario 1: Controls render as real iconography on a scrim (visual)
* **Given:** a video memory open on any surface.
* **When:** the controls are visible.
* **Then:** play/pause, skip-back, skip-forward (and PiP on iOS-handheld) render
  as **vector icons** (not text glyphs); the controls sit on a **gradient/scrim**
  that keeps them legible over both dark and light footage; the scrubber shows a
  filled progress track with a visible thumb (touch) / position marker. *(Gate:
  screenshot review against the "prototype" baseline.)*

### Scenario 2: Chapters are left-aligned and still focus-reachable (TV)
* **Given:** a video with chapters, open on TV, focus on play/pause.
* **When:** the d-pad walks Up to the chapters, Up again to Back, and Down back
  to the controls.
* **Then:** the chapter chips are visually **left-aligned** (not centered), and
  the full traversal still holds: Up reaches a chapter, Up reaches **Back**, Up at
  the top edge stays on Back, Down from Back returns to a control — **exactly one
  element focused after every press** (spec-0 invariant). *(This is the existing
  `tv-focus.yaml` flow, re-asserted against the new left layout.)*

### Scenario 3: Title is legible over light video (visual)
* **Given:** a video whose footage is bright/light behind the top-left title.
* **When:** the title bar is visible.
* **Then:** the title + subtitle sit on their **own scrim/gradient** and remain
  readable (sufficient contrast) regardless of footage brightness. *(Gate:
  screenshot over a known-light frame.)*

### Scenario 4: Controls auto-hide during playback, reveal on input — handheld
* **Given:** a playing video on handheld with controls visible.
* **When:** no input occurs for the hide delay (~3.5s, the current constant).
* **Then:** the controls **and the title bar** fade out smoothly and the video is
  unobstructed.
* **And when:** the user taps anywhere.
* **Then:** the controls fade back in and the hide timer restarts. Pausing keeps
  controls visible (no hide while paused).

### Scenario 5: Controls auto-hide on TV without ever losing focus (TV — critical)
* **Given:** a playing video on TV with controls visible and focus on a control.
* **When:** the hide delay elapses with no d-pad input.
* **Then:** the chrome fades out **and a single focus target still exists** (the
  full-screen reveal catcher) — `inspect_screen` reports **exactly one**
  `focused: true` node at every moment, never zero.
* **And when:** **any** d-pad button is pressed.
* **Then:** the controls fade back in and focus lands on **play/pause** (and the
  two `autoFocus` bridges are live again). No press in the hidden state may orphan
  focus. *(This is the spec-0 invariant extended to the hidden state.)*

### Scenario 6: Press-and-hold seeks continuously (scrub / fast-forward)
* **Given:** a video with controls visible.
* **When (handheld):** the user **holds** the skip-forward / skip-back control (or
  drags the scrubber thumb).
* **When (TV):** the user **holds** the d-pad Right/Left while a seek control /
  the scrubber is focused.
* **Then:** playback position seeks **continuously** while held (accelerating or
  steady-rate is acceptable — pick one and keep it smooth), the scrubber fill
  tracks the seek in real time, and on release the position **commits** to the
  player. A single short press still does a discrete ±10s jump (don't break the
  existing tap behavior).

### Scenario 7: Reaching the end swaps play → replay and replays cleanly
* **Given:** a video playing near its end.
* **When:** playback reaches the end (`ended` becomes true).
* **Then:** the primary control's icon **animates** from pause/play to a
  **replay** icon, and the controls **reveal** (don't auto-hide on a finished
  video — there's nothing to watch).
* **And when:** the replay control is activated (tap / d-pad select).
* **Then:** the video seeks to 0 and plays from the start; the icon animates back
  to the pause icon. On TV, focus stays on the primary control throughout (never
  lost across the icon swap).

### Scenario 8: Focus invariant holds across every new interaction (TV guard)
* **Given:** a video on TV.
* **When:** any sequence of d-pad presses is applied — including during the fade,
  in the hidden state, while holding to seek, and at end-of-video.
* **Then:** after **every** individual press, **exactly one** element reports
  `focused: true`. There is no sequence — in any of the new states this spec adds
  — that yields zero focused elements. *(Mechanical restatement of spec-0
  invariant #1, now covering auto-hide + replay.)*

## 4. Definition of Done (DoD)

- [ ] Controls + transport use `@expo/vector-icons`; the text glyphs (`▶`, `❚❚`,
      `«10`, `10»`, `⧉`) are gone. `ControlButton` takes an icon name.
- [ ] A gradient/scrim sits behind the bottom controls **and** the top title bar;
      both are legible over light and dark footage (Scenarios 1, 3, screenshots
      attached to the PR).
- [ ] Chapter chips are **left-aligned** on TV, and `maestro/tv-focus.yaml`
      passes unchanged-or-extended (Scenario 2).
- [ ] Auto-hide works on **both** surfaces (Scenarios 4, 5). On TV the hidden
      state owns exactly one focus target and any d-pad press reveals + restores
      focus to play/pause. The old `if (IS_TV) return` short-circuit in
      `scheduleHide` is replaced by the focus-safe hidden state.
- [ ] Press-and-hold continuous seek works on handheld (hold control / drag bar)
      and TV (hold d-pad), with real-time scrubber feedback and commit-on-release;
      short-press ±10s still works (Scenario 6).
- [ ] End-of-video swaps the primary control to **replay** with a smooth icon
      transition; replay restarts from 0; controls don't auto-hide once ended
      (Scenario 7). `usePlaybackState` surfaces an `ended` flag from the player's
      status/end event (not a `currentTime` heuristic).
- [ ] **Spec-0 invariant intact:** Scenario 8 holds — exactly one focused element
      after every press, in every new state. `maestro/tv-focus.yaml` exits 0,
      extended to cover the hidden→reveal transition.
- [ ] No new hardcoded colors/sizes — new scrim/gradient values live in
      `tokens.ts`. At most one new dependency beyond `@expo/vector-icons`
      (`expo-linear-gradient`) and only if layered Views can't do the gradient;
      justify it in the PR.
- [ ] `npx tsc --noEmit` clean, `npx jest` green, `npx expo export --platform ios`
      clean. No regression to PhotoViewer or handheld touch.

## 5. Executable Validation (the oracle)

```bash
# TV focus (the load-bearing invariant) — must exit 0, extended for left chapters
# + the hidden→reveal focus transition (Scenarios 2, 5, 8).
maestro --device <android-tv> test maestro/tv-focus.yaml

# Handheld auto-hide + reveal + replay (Scenarios 4, 6, 7) — a new flow.
maestro --device <ios-or-android> test maestro/player-ux.yaml   # author this

# Verification gates.
npx tsc --noEmit && npx jest && npx expo export --platform ios
```

* **Focus oracle:** the `focused: true` flag in Maestro's `inspect_screen` view
  hierarchy (never pixels) — same mechanism as spec 0.
* **Visual oracle:** simulator **screenshots** for Scenarios 1, 3 (real-app look,
  title legibility over light footage) — attach before/after to the PR. Apple TV
  is confirmed manually with the `[FOCUS]` log oracle for the focus scenarios
  (Maestro can't drive tvOS).

## 6. Notes for the Implementing Agent

* **Touch the focus model with extreme care.** The auto-hide-on-TV change is the
  only part of this spec that can re-break spec 0. Design the hidden state as: a
  single full-screen `TVFocusGuideView`/focusable "reveal catcher" with
  `hasTVPreferredFocus` while hidden, whose `onFocus`/key handling reveals the
  chrome; the moment chrome is visible again, the existing root-trap + two
  `autoFocus` bridges resume. Verify with the `[FOCUS]` oracle on Apple TV that
  **no** press in the hidden state yields zero focused nodes.
* **Left chapters vs. geometry.** Spec 0 deliberately made TV chapters a plain
  centered row (not a ScrollView) so geometry routes Pause↔chapter↔Back. Moving
  them left must keep a chapter chip reachable by Up from the transport and Back
  reachable by Up from a chip. If left-alignment breaks the geometric bridge,
  the fix is an `autoFocus` guide (an attractor) — **not** `nextFocus*`/
  `destinations` (verified unreliable on this stack; see spec 0 / `EVIDENCE.md`).
  Re-run `tv-focus.yaml` after every layout change.
* **`ended` flag:** add it to `usePlaybackState` from the player's
  status/`playToEnd` signal; don't infer from `currentTime`. Drive Scenario 7 off
  it.
* **Hold-to-seek:** on handheld reuse gesture-handler (a long-press/pan in
  `Scrubber` or on the skip `ControlButton`s); on TV use key-down/up duration on
  the focused control. Keep the existing short-press ±10s and tap-to-seek intact.
* **Animations:** reanimated `withTiming` for the chrome fade and an icon
  cross-fade for play↔replay; keep it under ~250ms so it feels responsive, not
  sluggish.
* **Keep authoring and review separate** (AGENTS.md): a reviewer/verifier pass
  confirms the focus oracle and screenshots — don't self-approve.
* **Scope discipline:** `git diff --stat` should show only the in-scope files
  (+ the new `maestro/player-ux.yaml`). Revert any drift into navigation/library.
