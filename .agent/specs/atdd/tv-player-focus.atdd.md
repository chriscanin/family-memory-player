# ATDD Specification: TV Video Player Focus

> Seam: the **focus model of the video player detail screen** on the 10-foot
> surfaces (Apple TV + Android TV). One architectural boundary: how the
> react-native-tvos focus engine routes the d-pad across the player's
> interactive elements, and how the screen guarantees focus is never orphaned.

## 1. Problem Statement

* **Context:** The video player detail screen (`MemoryDetailScreen` →
  `VideoPlayer`) renders, on TV, a set of d-pad-navigable controls: a top-left
  **Back** button, a **play/pause** button, **±10s skip** buttons, and a row of
  **chapter** chips. Navigation is driven entirely by the react-native-tvos
  focus engine (no touch on TV).
* **The Gap / Bug:** On the video player screen, **focus is lost when navigating
  up toward the Back button**. Concretely: focus starts on the play/pause
  control; pressing **Up** orphans focus — *nothing* becomes focused, and there
  is **no d-pad input that can recover it**. The screen is left with zero
  focused elements and is unrecoverable without backing out.
* **Impact:** A 10-foot app with no focused element is a **dead screen** — the
  remote does nothing, the user cannot reach Back, cannot reach the chapters,
  cannot resume playback control. This is the single most severe class of TV-UX
  defect: lost, unrecoverable focus.

### Expected behavior (the two invariants)

1. **Focus is never lost.** At every moment after the screen mounts, **exactly
   one** interactive element holds focus. No d-pad sequence — including pressing
   a direction at a layout edge — may result in zero focused elements.
2. **Every part is reachable.** From the initial focus, the d-pad can reach
   **all** interactive elements: the **play/pause** button, both **skip**
   buttons (±10s), the **chapter** chips, and the top-left **Back** button — and
   can navigate back down again. No element is a one-way trap or an island.

## 2. System Constraints & Environment

* **Runtime:** Expo SDK 56, React Native 0.85.3 aliased to
  **`react-native-tvos@0.85.3-2`**, React 19.2.3.
* **Frameworks:** expo-router (file-based), expo-video, react-native-reanimated 4,
  react-native-gesture-handler 2.31, Zustand.
* **Surfaces under test:** Apple TV (tvOS) and Android TV. **`Platform.OS` is
  `'ios'` on tvOS** — surface detection must use `IS_TV` (`Platform.isTV`), not
  the OS string.
* **Focus engine contract (load-bearing):** A `TVFocusGuideView` is only an
  active focus participant when it has **`autoFocus`** *or* **`destinations`**
  (`isTVSelectable = destinations || autoFocus`). A guide configured with only
  `trapFocus*` props is **inert** — it does not contain focus, and focus falling
  into it is lost. **`autoFocus` (an attractor) is the only mechanism that
  reliably bridges a focus void on this stack** (RN-tvos 0.85, Fabric, Reanimated
  wrappers); the *tag-based* mechanisms — `destinations` and `nextFocusUp/Down`
  (which **does** exist on tvOS, contrary to older notes) — resolve via
  `findNodeHandle`/`viewWithTag:` and were verified **not** to move focus through
  the Reanimated/Fabric wrapper here. Because an attractor traps the reverse
  direction, bridging a gap **both** ways needs **two** autoFocus guides, one at
  each end. See `EVIDENCE.md` → "Root cause (CONFIRMED) & resolution".
* **Files in scope:**
  * `src/features/detail/MemoryDetailScreen.tsx` (root guide + top bar + Back)
  * `src/features/detail/VideoPlayer.tsx` (transport row, skip, chapter rail)
  * `src/design-system/components/FocusablePressable.tsx` (the focusable
    primitive; forwards its ref so a guide can target it via `destinations`)
* **Oracle / harness:** Maestro driving the **Android TV** emulator. Maestro
  cannot drive tvOS's remote, so Android TV is the automated harness for the
  shared react-native-tvos focus code; Apple TV is verified by the same code
  path plus manual confirmation. The assertion mechanism is the **`focused`
  flag** in the view hierarchy returned by `inspect_screen` — *not* pixels.

## 3. Black-Box Test Cases (The "Green" Gates)

> Driven on the Android TV emulator via Maestro. Each `Then` asserts the real
> `focused` flag on a node in the hierarchy. "Something is focused" =
> at least one node reports `focused: true`.

### Scenario 1: Initial focus is present and unique (happy path)
* **Given:** A memory whose `type` is `video` (it has chapters and a transport
  row), opened from the library on a TV surface.
* **When:** The detail screen finishes mounting (`waitForAnimationToEnd`).
* **Then:** **Exactly one** interactive element reports `focused: true`. No state
  exists where zero elements are focused.

### Scenario 2: Up from play/pause reaches the controls, never orphans (the bug)
* **Given:** The video player screen with focus on the **play/pause** control.
* **When:** **Up** is pressed once.
* **Then:** A different interactive element (a **chapter** chip, per current
  layout) reports `focused: true`. Focus is **not** lost — the count of focused
  elements after the press is **exactly one**, never zero. *(This is the exact
  regression in the Problem Statement.)*

### Scenario 3: Up continues to the top-left Back button
* **Given:** The video player screen with focus on a **chapter** chip (i.e. one
  Up above play/pause).
* **When:** **Up** is pressed again.
* **Then:** The **Back** button (top-left, a11y label `Back to library`) reports
  `focused: true` and visibly highlights.

### Scenario 4: Top edge traps focus on Back (never lost at the boundary)
* **Given:** The video player screen with focus on the **Back** button (top of
  the screen).
* **When:** **Up** is pressed again (against the top edge).
* **Then:** **Back** still reports `focused: true`. Pressing a direction at the
  layout boundary keeps focus where it is — it is never pushed off-screen into
  nothing.

### Scenario 5: Bottom edge traps focus on the transport row (never lost)
* **Given:** The video player screen with focus on the lowest control (e.g.
  **Back 10 seconds** in the transport row).
* **When:** **Down** is pressed repeatedly past the last control.
* **Then:** A transport control still reports `focused: true` after each press.
  Focus is never lost off the bottom edge.

### Scenario 6: Every interactive element is reachable by the d-pad (coverage)
* **Given:** The video player screen, starting from initial focus.
* **When:** The d-pad walks the interface (Up to Back, Down through the transport
  and skip controls, Left/Right across the chapter chips and the transport row).
* **Then:** Across the traversal, **each** of these reports `focused: true` at
  some step: the **Back** button, the **play/pause** button, the **skip-back
  (−10s)** button, the **skip-forward (+10s)** button, and **at least one
  chapter** chip. No element is unreachable.

### Scenario 7: Focus is continuous across a full traversal (invariant guard)
* **Given:** The video player screen with focus present.
* **When:** Any sequence of d-pad presses is applied (Up/Down/Left/Right in any
  order, including at edges).
* **Then:** After **every** individual press, **exactly one** element reports
  `focused: true`. There is **no** press in any sequence that produces zero
  focused elements. *(This is invariant #1 stated as a mechanical gate: assert
  non-empty focus after each `pressKey`.)*

## 4. Definition of Done (DoD)

- [ ] Scenarios 1-7 are implemented as automated steps in
      `maestro/tv-focus.yaml` (extending the existing flow), driving the Android
      TV emulator and asserting the real `focused` flag at each step.
- [ ] `maestro/tv-focus.yaml` **passes** end-to-end on the Android TV emulator
      (`maestro --device <android-tv> test maestro/tv-focus.yaml`, or via the
      Maestro MCP `run` with a booted Android TV `device_id`).
- [ ] The bug in Scenario 2 / Scenario 7 is gone: there is no d-pad sequence on
      the video player screen that yields zero focused elements.
- [ ] The fix relies on the documented react-native-tvos contract — a focus
      guide is active **only** with `autoFocus` or `destinations`; inert
      `trapFocus`-only guides are not used to "hold" focus.
- [ ] **Back stays top-left.** The fix does not relocate the Back button to
      "solve" focus (a relocation is an explicit non-fix and fails review).
- [ ] Existing unit tests still pass (`npm test`) and typecheck is clean
      (`npx tsc --noEmit`). No regression to the handheld (touch) surfaces.

## 5. Executable Validation (the oracle)

```
# Android TV emulator must be booted first (the shared focus code is identical
# on tvOS, which Maestro cannot drive — Android TV is the automated harness).
maestro test maestro/tv-focus.yaml
```

The flow encodes Scenarios 2-5 and 7 today (open video → Up → chapter focused →
Up → Back focused → Up at edge → Back still focused). Extend it to add Scenario 1
(initial single focus), Scenario 6 (full element coverage), and the per-press
non-empty-focus assertion of Scenario 7. The Maestro run **must exit 0** before
this seam is marked done.

> **Supporting evidence** lives alongside this spec in `EVIDENCE.md`: the
> react-native-tvos focus contract, the current (suspect) implementation, and
> the assertion mechanism. Read it before implementing.

## 6. Notes for the Implementing Agent

* This is a **single-seam** spec — one screen's focus model. Do **not** restructure
  navigation, routing, or the handheld layout. Keep the change minimal and on the
  three in-scope files.
* The most likely root cause to investigate first: a focus guide that is **inert**
  because it has neither `autoFocus` nor a resolved `destinations` target (e.g. a
  `destinations={backNode ? [backNode] : undefined}` that is `undefined` on first
  render because the callback ref hasn't populated `backNode` yet — leaving a
  window where Up has nowhere to go and focus is dropped). Verify whether the
  destinations target is reliably resolved before asserting the fix.
* **Post-implementation verification is mandatory:** run the Maestro flow to exit
  0, run `npm test` and `npx tsc --noEmit`, and `git diff --stat` to confirm only
  the in-scope files changed (revert any scope drift). Do **not** trust a
  self-reported "it works" — the `focused` flag in the Maestro run is the oracle.
