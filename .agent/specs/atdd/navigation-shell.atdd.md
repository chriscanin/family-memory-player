# ATDD Specification: Navigation Shell (tabs + TV rail)

> **Seam:** the app's **top-level navigation** — the boundary between "which
> section am I in" (Home / Favorites / Profile) and the screens themselves. One
> shell, two presentations: a **bottom tab bar on handheld** and a **collapsible
> left rail on TV**. This spec owns the routing restructure and the nav chrome;
> it does **not** own what Favorites or Profile *contain* (specs 3, 4) — it
> stands those up as reachable shells.
>
> **Hard precondition:** the player detail screen
> ([`tv-player-focus.atdd.md`](tv-player-focus.atdd.md)) keeps its focus model and
> renders **full-screen, above the nav** (no tab bar / rail over the player).
> `maestro/tv-focus.yaml` must still exit 0.

## 1. Problem Statement

* **Context:** today routing is a flat expo-router `Stack` (`src/app/_layout.tsx`)
  with two screens: `index` (`LibraryScreen`) and `memory/[id]`
  (`MemoryDetailScreen`). There is **no concept of sections** — the library is the
  whole app. Navigation is `router.push('/memory/[id]')`; back returns to the
  library.
* **The Gap:** the product needs **three sections** — **Home** (today's library),
  **Favorites** (a filtered collection, spec 3), **Profile** (account, spec 4) —
  with surface-appropriate navigation:
  * **Handheld:** a standard **bottom tab bar** (Home / Favorites / Profile).
  * **TV:** a **left side rail** that is **collapsed** (icons only) when focus is
    in the content, and **expands** (icons + labels) when focus moves into it.
    A bottom tab bar is wrong for 10-foot/d-pad; the rail is the 10-foot idiom.
* **Impact:** without a shell there's nowhere to *put* Favorites or Profile, and
  the app can't grow past "a library." The shell is the spine specs 3 and 4 hang
  on — and it's the highest-risk change because it restructures routing and adds
  **two new focus regions on TV** that must obey "focus is never lost."

### Expected behavior

* Handheld: a persistent bottom tab bar with three tabs; tapping switches
  section; the active tab is indicated; the player opens **over** the tabs
  (full-screen, no tab bar).
* TV: a left rail showing three icons when collapsed. Pressing **Left** from the
  content moves focus into the rail, which **expands** to show labels; moving
  **Right** (or selecting a tab) collapses it back and returns focus to content.
  Focus is **never lost** entering, traversing, or leaving the rail.
* Both: switching sections preserves each section's own scroll/focus state where
  practical; the player route is unaffected and keeps its spec-0 focus model.

## 2. System Constraints & Environment

* **Runtime/frameworks:** as in spec 0. expo-router ~56.2.11 (file-based),
  `react-native-tvos@0.85.3-2` (Fabric), reanimated 4. Surface gate `IS_TV`.
* **Routing approach:** introduce an expo-router **tab group** for the three
  sections and keep the player as a **stack screen above it**:

  ```
  src/app/
    _layout.tsx            # root Stack: the (tabs) group + the full-screen player
    (tabs)/
      _layout.tsx          # THE SHELL — branches on IS_TV:
                           #   handheld → expo-router <Tabs> (bottom bar)
                           #   TV       → custom left-rail layout (Slot + rail)
      index.tsx            # Home  → <LibraryScreen/> (moved from app/index.tsx)
      favorites.tsx        # Favorites → <FavoritesScreen/> (shell now; spec 3 fills it)
      profile.tsx          # Profile  → <ProfileScreen/> (shell now; spec 4 fills it)
    memory/[id].tsx        # unchanged — full-screen player, OUTSIDE (tabs), no nav chrome
  ```

  `memory/[id]` stays a sibling of `(tabs)` in the root Stack so the player
  renders over the whole shell with **no tab bar / rail** — preserving the
  spec-0 focus void model exactly.
* **TV rail is hand-rolled, not a new nav library.** expo-router/react-navigation
  bottom-tabs is fine for handheld, but its tab bar is **not** 10-foot/focus
  friendly. On TV the `(tabs)/_layout.tsx` renders a custom rail + `<Slot/>` for
  the active section. **No new navigation dependency** (AGENTS.md bundle rule) —
  build the rail from `FocusablePressable` + `TVFocusGuideView` + `IS_TV`.
* **Icons:** `@expo/vector-icons` for the three tabs (e.g. home, heart/star,
  person), consistent with the family chosen in spec 1.
* **⚠️ TV focus — the rail is a new focus region governed by spec 0's invariant:**
  * Focus is **never lost** moving content↔rail or within the rail.
  * **Collapsed→expanded on focus enter, expanded→collapsed on focus leave.**
    Drive the expand/collapse off the rail's focus state (a rail-level
    `onFocus`/`onBlur` or an `autoFocus` `TVFocusGuideView` wrapping the rail),
    **not** a timer. Animate the width with reanimated.
  * Crossing content→rail (Left) and rail→content (Right/select) is a directional
    bridge: if plain geometry doesn't route it reliably, use an **`autoFocus`
    guide** (attractor) — **not** `nextFocus*`/`destinations` (verified unreliable
    on this stack; spec 0 / `EVIDENCE.md`). Exactly one tab item should carry
    `hasTVPreferredFocus` when the rail first takes focus.
  * The content screens (Home rail/grid) already manage their own focus; the
    shell must not steal or orphan it when switching sections.
* **Handheld:** the bottom tab bar is the standard expo-router `<Tabs>` (or
  `@react-navigation/bottom-tabs` if already transitively present — **don't add
  it as a new top-level dep** unless required; prefer expo-router's `Tabs`). The
  player route hides the tab bar (renders outside the group).
* **Files in scope:**
  * `src/app/_layout.tsx` (root Stack now wraps the tab group + player)
  * `src/app/(tabs)/_layout.tsx` (**new** — the shell, the heart of this spec)
  * `src/app/(tabs)/index.tsx` (**moved** Home route → `LibraryScreen`)
  * `src/app/(tabs)/favorites.tsx` (**new** shell → `FavoritesScreen`)
  * `src/app/(tabs)/profile.tsx` (**new** shell → `ProfileScreen`)
  * `src/features/favorites/FavoritesScreen.tsx` (**new** placeholder; spec 3)
  * `src/features/profile/ProfileScreen.tsx` (**new** placeholder; spec 4)
  * `src/design-system/components/` — a new `TabBar` (handheld) and `NavRail` (TV)
    component pair, token-driven, focus-aware
  * `maestro/` — a new `navigation.yaml`; `tv-focus.yaml` re-run unchanged
* **Out of scope:** the *contents* of Favorites (spec 3) and Profile (spec 4) —
  here they're reachable placeholders. The player's internals (spec 1). The intro
  (spec 4).

## 3. Black-Box Test Cases (the "green" gates)

> Handheld via Maestro tap + visibility on an iOS sim / Android emulator. TV via
> the **`focused` flag** on Android TV (+ Apple TV manual confirm).

### Scenario 1: Three tabs exist and switch — handheld
* **Given:** the app open on handheld, on Home.
* **When:** the user taps the **Favorites** tab, then **Profile**, then **Home**.
* **Then:** each tap shows the corresponding screen; the **active** tab is
  visually indicated; the bottom tab bar persists across all three; Home still
  shows the memory library.

### Scenario 2: Opening a memory hides the nav chrome — handheld
* **Given:** Home with the tab bar visible.
* **When:** the user opens a memory (tap a card).
* **Then:** the player is **full-screen with no tab bar**; pressing Back returns
  to Home **with the tab bar restored** and the previous scroll position intact.

### Scenario 3: TV rail is collapsed in content, expands on focus enter
* **Given:** the app open on TV, focus in the Home content (a memory card).
* **When:** the user presses **Left** to move focus into the rail.
* **Then:** the rail **expands** (labels appear), a tab item is **focused**
  (exactly one), and no focus is lost in the transition.
* **And when:** the user presses **Right** (or selects a tab) to return to
  content.
* **Then:** the rail **collapses** (icons only), focus is back in the content
  (exactly one focused element), and no press in the sequence orphaned focus.

### Scenario 4: TV rail switches sections without losing focus
* **Given:** the TV rail focused, on the Home item.
* **When:** the user moves Down to **Favorites**, selects it, then opens the rail
  again and selects **Profile**, then **Home**.
* **Then:** each selection swaps the content region to that section; after **every**
  press, **exactly one** element reports `focused: true`; the newly shown section
  has a sensible initial focus (its first focusable / `hasTVPreferredFocus`).

### Scenario 5: The player is unaffected by the shell (spec-0 guard)
* **Given:** any section on TV.
* **When:** the user opens a video and runs the spec-0 traversal (Up→chapter→Back,
  Down→control, edge traps).
* **Then:** `maestro/tv-focus.yaml` passes **unchanged** — the player renders over
  the shell with no rail, and its two `autoFocus` bridges + root trap behave
  exactly as before. Back from the player returns to the originating section.

### Scenario 6: Focus continuity across the shell (TV invariant guard)
* **Given:** the app on TV.
* **When:** any sequence of d-pad presses moves between content and rail, switches
  sections, opens and closes the player.
* **Then:** after **every** press, **exactly one** element is focused — never
  zero. The rail introduces no orphan state. *(Spec-0 invariant #1 extended to the
  navigation region.)*

## 4. Definition of Done (DoD)

- [ ] Routing restructured into a `(tabs)` group (Home/Favorites/Profile) with the
      player (`memory/[id]`) as a full-screen stack screen **outside** the group;
      Home content is the unchanged `LibraryScreen`.
- [ ] Handheld renders a **bottom tab bar** (three tabs, active indicator); the
      player opens over it with **no tab bar** and back restores it (Scenarios 1, 2).
- [ ] TV renders a **left rail**: collapsed (icons) in content, **expanded**
      (icons + labels) when focused, driven by focus state + animated width
      (Scenario 3).
- [ ] TV rail switches sections and **never loses focus** entering, traversing,
      leaving, or switching (Scenarios 3, 4, 6); exactly one focused element after
      every press.
- [ ] **No new navigation dependency** — handheld uses expo-router `Tabs`; the TV
      rail is built from `FocusablePressable`/`TVFocusGuideView`. Any cross-region
      focus bridge uses `autoFocus` (attractor), never `nextFocus*`/`destinations`.
- [ ] `maestro/tv-focus.yaml` exits 0 **unchanged** — the player's spec-0 focus
      model is untouched (Scenario 5).
- [ ] Favorites and Profile are reachable **shells** (placeholder screens) so the
      shell is independently verifiable before specs 3/4 fill them.
- [ ] `npx tsc --noEmit` clean, `npx jest` green, `npx expo export --platform ios`
      clean. No regression to the player or library.

## 5. Executable Validation (the oracle)

```bash
# New: nav shell — tabs (handheld) and rail focus (TV).
maestro --device <ios-or-android> test maestro/navigation.yaml   # author this
maestro --device <android-tv>     test maestro/navigation.yaml   # TV rail focus

# The load-bearing player focus invariant — must pass UNCHANGED.
maestro --device <android-tv> test maestro/tv-focus.yaml

npx tsc --noEmit && npx jest && npx expo export --platform ios
```

* **Oracle:** Maestro `focused: true` flag (TV) and visibility/active-tab
  assertions (handheld) — never pixels. Apple TV confirmed manually with the
  `[FOCUS]` log for the rail-enter/leave/switch transitions.

## 6. Notes for the Implementing Agent

* **This is the riskiest seam — it restructures routing and adds TV focus
  regions.** Do it in two passes: (a) restructure routing into `(tabs)` with
  placeholder Favorites/Profile and **prove the player still passes
  `tv-focus.yaml`** before (b) building the TV rail's expand/collapse + focus
  bridges. Don't build the rail until routing is green.
* **Keep the player outside the tab group.** That single decision is what
  preserves the spec-0 focus void (full-screen video, no nav chrome). If the
  player ever renders *inside* a tab, the rail becomes a competing focus region
  over the video and spec 0 breaks.
* **Rail expand/collapse is focus-driven, not timed.** Wrap the rail in a focus
  container; expand on focus-enter, collapse on focus-leave; animate width with
  reanimated `withTiming`. A timer-based expand will feel wrong and can desync
  from focus.
* **Cross-region bridges:** prefer geometry; if Left-into-rail / Right-out-of-rail
  isn't reliable, add an `autoFocus` `TVFocusGuideView` (attractor) at the seam —
  and remember an attractor traps the reverse direction, so you may need one at
  each end (the spec-0 two-guide lesson applies here too).
* **Don't add `@react-navigation/bottom-tabs` as a new dep** unless expo-router's
  `Tabs` genuinely can't express the handheld bar; justify in the PR if you do.
* **Verify, don't assert** (AGENTS.md): the Maestro `focused` flag and a separate
  reviewer pass gate this; screenshots for the handheld tab bar + TV rail states.
* **Scope:** `git diff --stat` should show routing + the two nav components + the
  two placeholder screens + the new Maestro flow. Revert drift into the player or
  favorites/profile internals.
