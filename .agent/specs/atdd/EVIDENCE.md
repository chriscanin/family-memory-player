# Evidence: TV Video Player Focus Loss

Supporting context for `tv-player-focus.atdd.md`. The spec is the contract; this
is the data the implementing agent reads to ground the fix. **It's all about
context for the agent** — read this before touching code.

## Symptom (reported)

> "On the video player screen, the focus is getting lost when we navigate up
> toward the back button … focus is getting completely lost when moving up from
> the pause button. There is no way to return the focus anymore."

Repro:
1. Open a **video** memory on a TV surface.
2. Focus starts on play/pause.
3. Press **Up** → focus is orphaned (zero focused elements), unrecoverable by any
   further d-pad input.

## The react-native-tvos focus contract (the load-bearing fundamental)

From the fork's source (`Libraries/Components/TV/TVFocusGuideView.js`,
`TVViewPropTypes.js`):

* A `TVFocusGuideView` is an active focus participant **only** when it has
  **`autoFocus`** or **`destinations`**:

  ```
  isTVSelectable = destinationsProp != null || autoFocus
  ```

* A guide configured with **only** `trapFocus*` props is **INERT**. It does not
  contain focus. When focus tries to move into an inert guide, it is **dropped**
  — which is exactly the "focus lost" failure mode.

* `destinations` is a one-way trampoline: refs/handles are resolved via
  `findNodeHandle` / `tagForComponentOrHandle`. A `destinations` array that is
  `undefined` (or whose target ref has not resolved yet) provides **no landing
  spot** — Up has nowhere to go.

* `nextFocusUp/Down/Left/Right` are node-handle props that work on **Android TV
  only**. They are not a tvOS solution.

* `hasTVPreferredFocus` sets the **initial** focus on mount. Exactly one element
  per screen should set it.

* **`Platform.OS === 'ios'` on tvOS.** Surface branching must use `IS_TV`
  (`Platform.isTV`), never the OS string. (Same trap that gates PiP.)

## Current implementation under suspicion

### `MemoryDetailScreen.tsx` — root guide + top bar + Back

The root is a `TVFocusGuideView` with `autoFocus` + `trapFocus*` (active — good).
The **top bar** is a `TVFocusGuideView` whose `destinations` is the Back button,
populated via a **callback ref → state** round-trip:

```tsx
const [backNode, setBackNode] = useState<unknown>(null);
// ...
const topBarProps = IS_TV
  ? { destinations: backNode ? [backNode] : undefined }   // ⚠ undefined until backNode resolves
  : { edges: ['top'] as const };
// ...
<FocusablePressable ref={setBackNode} ... accessibilityLabel="Back to library">
```

**Prime suspect:** `destinations` is `undefined` whenever `backNode` is falsy.
`backNode` is set by a callback ref (`ref={setBackNode}`) which triggers a state
update **after** first render. During that window — and on any re-render where
the ordering drops the ref — the top bar guide is **inert** (no `autoFocus`, no
`destinations`). Up from the controls then has no landing spot and focus is
dropped. This matches the symptom precisely (Up from play/pause → nothing
focused → unrecoverable).

Lines of interest:
* `MemoryDetailScreen.tsx:23` — `const [backNode, setBackNode] = useState(null)`
* `MemoryDetailScreen.tsx:69-71` — `destinations: backNode ? [backNode] : undefined`
* `MemoryDetailScreen.tsx:77-89` — top bar `TVFocusGuideView` + Back `FocusablePressable`

### `VideoPlayer.tsx` — transport + skip + chapter rail

Rows are plain (no per-row `autoFocus` guides — correct; per-row `autoFocus`
previously *trapped* focus inside a row and was removed). Chapters are a plain
horizontal `ScrollView` of `FocusablePressable` chips; the transport is a plain
`View`. Play/pause has `hasTVPreferredFocus` for video (initial focus).

### `FocusablePressable.tsx` — the primitive

`forwardRef` to the underlying `AnimatedPressable` so a guide's `destinations`
can target it. Reacts to `onFocus`/`onBlur` (TV) and press (touch) with the same
scale animation. This part is sound; the ref forwarding is what makes Back
targetable.

## Why earlier "verified" runs may have passed while the bug persists

A previous Maestro run asserted Up → chapter → Back → trapped-at-edge and passed.
But that run does **not** guard the **per-press non-empty-focus invariant**
(Scenario 7) nor the **first-frame** window where `destinations` is `undefined`.
A timing-dependent drop (ref/state not yet resolved) can pass a happy-path
sequence on a warm build and still orphan focus in the reported repro. The new
scenarios close that gap by asserting **exactly one focused element after every
press**, and by asserting initial single focus on mount.

## Assertion mechanism (the oracle)

Maestro `inspect_screen` returns the view hierarchy with a **`focused: true`**
flag per node. Assertions are on that flag, never on pixels:

* "Something is focused" = at least one node has `focused: true`.
* "Focus is unique" = exactly one node has `focused: true`.
* Maestro selectors map react-native a11y → `text:` (e.g. the Back focusable's
  a11y label `Back to library`, chapter chips `Chapter:.*`).
* Maestro can drive **Android TV** only. The focus code is identical
  react-native-tvos on tvOS, so Android TV is the automated harness; Apple TV is
  the same code path + manual confirm.

Existing harness: `src/core/e2e/tv-focus.yaml` (Scenarios 2-5, 7 partial).

## Root-cause hypothesis (1-2 sentences) — SUPERSEDED, see below

The original guess (top-bar `destinations` inert until `backNode` resolves) was
**wrong**. The confirmed investigation below replaces it.

---

## Root cause (CONFIRMED) & resolution

Two distinct defects stacked on top of each other. Both are fixed.

### 1. The video itself was eating the d-pad search (primary, native)

expo-video's `VideoView` embeds a native **`AVPlayerViewController`**, which on
tvOS is **focusable by default** and **absorbs the focus engine's directional
search**. A React-Native d-pad UI layered over a full-screen video therefore
cannot move focus *across* the video's area — Up from the bottom controls never
reaches the top-left Back, because the video swallows the search. No RN prop
(`focusable`, `pointerEvents`, `isTVSelectable`, `accessibilityElementsHidden`)
reaches expo-video's native view, so this is **only** fixable natively.

**Fix:** `patches/expo-video+56.1.4.patch` — after `addSubview(playerViewController.view)`
in `VideoView.swift`, set `playerViewController.view.isUserInteractionEnabled = false`
on tvOS. The video is purely presentational (RN drives all controls,
`nativeControls={false}`), so removing it from the focus/interaction system lets
the search pass through. `VideoPlayer.tsx` also wraps the video in a
`pointerEvents="none"` layer as JS-side belt-and-suspenders.

### 2. Bridging the focus void: attractors, not tag targets (secondary, JS)

Once the video no longer blocks the search, there is still a large **focus void**
(the full-screen video) between the bottom controls and the top-left Back, and
the two are horizontally offset (Back is left, controls are centered). tvOS will
**not** cross that void by plain geometry. Empirically, on this stack
(react-native-tvos **0.85** on the **New Architecture / Fabric**, focusables
wrapped by **Reanimated** `AnimatedPressable`):

* **`autoFocus` guides (attractors) reliably bridge the void.** A
  `TVFocusGuideView` with `autoFocus` pulls an incoming directional search onto
  its preferred focusable child across the gap.
* **Tag-based targeting (`destinations`, `nextFocusUp/Down`) did NOT work here.**
  Both resolve a target via `findNodeHandle` → `viewWithTag:`. Verified on device
  with the `[FOCUS]` oracle: neither `destinations:[backTag]` nor a chip's
  `nextFocusUp={backTag}` moved focus across the gap, even with a *valid*
  resolved tag (388). The most likely cause is the Reanimated/Fabric wrapper: the
  resolved tag doesn't point at the actual focusable view, so the redirect is a
  silent no-op. (Note: `nextFocus*` is **not** Android-only as the contract
  section above claims — Fabric's `RCTViewComponentView` implements it on tvOS
  via 1px `UIFocusGuide`s — it just isn't reliable through this wrapper.)
* **`autoFocus` is an attractor, so it traps the *reverse* direction.** A single
  autoFocus top-bar guide bridges Up→Back, but then Down-from-Back is re-homed
  straight back onto Back (the "ALMOST FIXED — can't navigate down" report).

**Fix (in `MemoryDetailScreen.tsx` + `VideoPlayer.tsx`):** use **two** autoFocus
guides, one per direction, each only attracting focus *entering* it:

* **Root** = `TVFocusGuideView` with `trapFocus*` on all sides and **no**
  `autoFocus` (a root attractor re-homes Back and was itself part of the trap).
  This makes losing focus structurally impossible.
* **Top bar** = `autoFocus` guide containing only Back → an Up search from the
  controls homes onto Back.
* **Controls cluster** = `autoFocus` guide → a Down search from Back homes onto a
  control. Because each guide only attracts on *entry*, neither traps the other
  direction, and geometry still handles navigation *within* the controls.

### Verified on device (Apple TV sim, tvOS 26, `[FOCUS]` log oracle)

* Initial focus: exactly one element (play/pause).
* Up: `Pause → Chapter → Back` (crosses the void).
* Down: `Back → Chapter` (crosses the void back — the reported bug).
* Coverage: `Back 10 ↔ Play ↔ Forward 10` via Left/Right; chapters via Up.
* Top edge: Up from Back holds on Back (focus-ring confirmed visually).
* Bottom edge: Down from Forward-10 holds (no orphan).
