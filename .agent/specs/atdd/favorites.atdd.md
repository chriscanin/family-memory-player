# ATDD Specification: Favorites

> **Seam:** marking a memory as a **favorite** and surfacing the **Favorites
> collection**. One boundary: a favorites store (pure logic + persistence,
> mirroring `recentlyViewedStore`) and the UI affordances that toggle and display
> it. Depends on the **Favorites tab shell** from
> [`navigation-shell.atdd.md`](navigation-shell.atdd.md).
>
> **Hard precondition:** the player focus model
> ([`tv-player-focus.atdd.md`](tv-player-focus.atdd.md)) and the nav shell focus
> behavior are preserved — a favorite toggle must not orphan focus on TV.

## 1. Problem Statement

* **Context:** the app has a recently-viewed system that is the **template** for
  favorites: `src/core/recentlyViewed.ts` (pure dedupe/cap/order logic),
  `src/state/recentlyViewedStore.ts` (Zustand + persist over AsyncStorage, key
  `legacybox.recently-viewed.v1`, partializes only `history`, sets `hydrated` on
  rehydrate). Memories are `Memory` objects (`src/core/types.ts`) keyed by `id`,
  indexed in `src/core/data/library.ts` (`memoriesById`).
* **The Gap:** there is **no way to favorite a memory** and **no Favorites
  collection**. The nav shell (spec 2) stands up a Favorites tab, but it's an
  empty placeholder. Users need to (a) toggle any memory as a favorite from the
  home items (and the detail screen), and (b) see all favorites in the Favorites
  tab.
* **Impact:** favorites are table-stakes for a media app and the reason the
  Favorites tab exists. Without persistence they'd be lost on relaunch; without a
  cross-surface toggle they'd be unreachable on TV.

### Expected behavior

* Any memory can be toggled favorite / un-favorite; the state **persists across
  relaunches** (local, AsyncStorage).
* The toggle is reachable on **every surface**: a tap affordance on handheld home
  cards, and a focusable control on TV (via the detail screen, focus-safe).
* The **Favorites tab** lists exactly the favorited memories (most-recently
  favorited first), updates live as items are toggled, and shows a friendly
  **empty state** when there are none.
* Favorites are independent of auth — a **guest** can favorite, and favorites
  survive sign-in/out (per README decision 4).

## 2. System Constraints & Environment

* **Runtime/frameworks:** as in spec 0. Zustand 5, AsyncStorage 2.2, `IS_TV` gate.
* **Pure core first (testable):** put the favorites logic in
  `src/core/favorites.ts` — pure functions over a `FavoriteEntry[]`
  (`{ id: string; favoritedAt: number }`): `toggleFavorite(list, id, now)`,
  `isFavorite(list, id)`, `favoriteMemories(list, memoriesById)` (resolve →
  `Memory[]`, newest-first, skipping unknown ids). **No `react`/`react-native`
  imports in `core/`** (AGENTS.md). This mirrors `recentlyViewed.ts` and is what
  the unit tests cover.
* **Store:** `src/state/favoritesStore.ts` — Zustand + persist, AsyncStorage key
  `legacybox.favorites.v1`, partialize only the list, `hydrated` flag on
  rehydrate (copy the recently-viewed store's shape exactly). Actions:
  `toggle(id)`, `has(id)` (or a selector), `clear()`.
* **Cross-surface toggle affordance:**
  * **Handheld:** a **heart/star button overlaid on `MemoryCard`** (tap to
    toggle) — a small `FocusablePressable` with a filled/outline `@expo/vector-icons`
    glyph; tapping it toggles **without** opening the memory (stop propagation).
    Also expose the toggle in the **detail top bar**.
  * **TV:** **do not** add a second focusable to each card — a per-card toggle
    button would double every card's focus stops and complicate the rail/grid
    focus model. Instead, the favorite toggle on TV lives in the **detail screen's
    top bar** (next to Back), as a focusable `FocusablePressable`. This keeps the
    home grid/rail single-action (select → open) and keeps the toggle inside the
    already-solved detail focus model. *(Explicit cross-surface design choice —
    don't "unify" it into per-card TV buttons.)*
* **⚠️ Focus safety (TV):** adding a favorite control to the detail top bar means
  the top bar now has **two** focusables (Back + Favorite). The top bar is an
  `autoFocus` guide (spec 0) — confirm the Up-from-controls bridge still homes
  sensibly (Back should remain the default landing for the upward bridge), and
  that Left/Right between Back and Favorite works by geometry, and that Down
  returns to the controls. Re-run `tv-focus.yaml` and extend it to cover the new
  top-bar control.
* **Files in scope:**
  * `src/core/favorites.ts` (**new**, pure) + `src/core/index.ts` export
  * `src/core/__tests__/favorites.test.ts` (**new** unit tests)
  * `src/state/favoritesStore.ts` (**new**)
  * `src/design-system/components/MemoryCard.tsx` (handheld heart overlay)
  * `src/design-system/components/FavoriteButton.tsx` (**new** shared toggle)
  * `src/features/detail/MemoryDetailScreen.tsx` (top-bar favorite control)
  * `src/features/favorites/FavoritesScreen.tsx` (fills the spec-2 placeholder)
  * `src/core/e2e/favorites.yaml` (**new**); `tv-focus.yaml` extended
* **Out of scope:** syncing favorites to the Clerk user (future), reordering,
  collections/playlists. The nav shell itself (spec 2).

## 3. Black-Box Test Cases (the "green" gates)

> Handheld via Maestro tap + visibility; TV via the `focused` flag on Android TV
> (+ Apple TV manual). Pure logic via Jest.

### Scenario 1: Toggle persists (unit + relaunch)
* **Given:** a memory that is not a favorite.
* **When:** it is toggled favorite, the app is relaunched, and the store
  rehydrates.
* **Then:** the memory is still a favorite. Toggling again removes it and that
  also persists. *(Unit-tested in `favorites.test.ts` for the pure logic;
  relaunch verified via Maestro `clearState: false`.)*

### Scenario 2: Favorite from a home card — handheld
* **Given:** Home on handheld with a memory card visible.
* **When:** the user taps the card's **heart** affordance.
* **Then:** the heart switches to its **filled/active** state, the card does
  **not** navigate to the player (the tap is isolated to the toggle), and the
  memory now appears in the Favorites tab.

### Scenario 3: Favorites tab lists favorites + empty state
* **Given:** zero favorites.
* **When:** the user opens the **Favorites** tab.
* **Then:** a friendly **empty state** shows (e.g. "No favorites yet").
* **And when:** one or more memories are favorited.
* **Then:** the tab lists **exactly** those memories, newest-favorited first,
  using the same `MemoryCard` (grid on handheld, rail/grid on TV), and updates
  **live** as items are toggled.

### Scenario 4: Favorite from the detail screen — TV (focus-safe)
* **Given:** a memory open on TV, the detail top bar visible.
* **When:** the user navigates to the **Favorite** control in the top bar and
  selects it.
* **Then:** the favorite state toggles (icon reflects it), and **focus is never
  lost**: Back and Favorite are both reachable in the top bar, Up from the
  controls still bridges to the top bar, Down returns to a control — exactly one
  focused element after every press. `tv-focus.yaml` (extended) passes.

### Scenario 5: Favorites survive auth changes
* **Given:** a guest with some favorites (handheld).
* **When:** the user signs in (spec 4), then signs out.
* **Then:** the favorites are unchanged across both transitions (local store is
  independent of the Clerk session).

### Scenario 6: Focus invariant holds with the new controls (TV guard)
* **Given:** the app on TV.
* **When:** any d-pad sequence interacts with the detail top-bar Favorite control
  and the Favorites tab.
* **Then:** after **every** press, **exactly one** element is focused — never
  zero. *(Spec-0 invariant extended to the favorite control + Favorites tab.)*

## 4. Definition of Done (DoD)

- [ ] `src/core/favorites.ts` is **pure** (no RN imports), unit-tested
      (`favorites.test.ts`) for toggle/dedupe/order/resolve, mirroring
      `recentlyViewed.ts`.
- [ ] `favoritesStore.ts` persists to AsyncStorage (`legacybox.favorites.v1`),
      partializes only the list, exposes `hydrated`; favorites survive relaunch
      (Scenario 1) and auth changes (Scenario 5).
- [ ] Handheld home cards have a **heart toggle** that toggles without navigating
      (Scenario 2); the detail top bar exposes the toggle on **all** surfaces.
- [ ] TV favoriting is via the **detail top bar only** (no per-card TV button),
      and is **focus-safe**: `tv-focus.yaml` extended for the new top-bar control
      and **passes** (Scenarios 4, 6).
- [ ] The **Favorites tab** lists favorites newest-first with a live update and a
      friendly empty state (Scenario 3), reusing `MemoryCard`.
- [ ] `npx tsc --noEmit` clean, `npx jest` green (incl. new favorites tests),
      `npx expo export --platform ios` clean. `src/core/e2e/tv-focus.yaml` exits 0.

## 5. Executable Validation (the oracle)

```bash
npx jest src/core/__tests__/favorites.test.ts   # pure toggle/order/resolve logic

# Handheld: card toggle + tab listing + relaunch persistence.
maestro --device <ios-or-android> test src/core/e2e/favorites.yaml

# TV: focus-safe top-bar toggle (extends the spec-0 invariant).
maestro --device <android-tv> test src/core/e2e/tv-focus.yaml

npx tsc --noEmit && npx jest && npx expo export --platform ios
```

* **Oracles:** Jest for the pure logic (the real source of truth for
  dedupe/order); Maestro visibility for the handheld toggle + tab; Maestro
  `focused` flag for TV focus safety.

## 6. Notes for the Implementing Agent

* **Copy the recently-viewed pattern, don't reinvent it.** `favorites.ts` ↔
  `recentlyViewed.ts`, `favoritesStore.ts` ↔ `recentlyViewedStore.ts` — same
  shape, same persistence idiom, same test style. This keeps the codebase
  coherent and the review trivial.
* **Isolate the card tap.** On handheld the heart sits over `MemoryCard`, whose
  whole surface navigates on press — the heart's `onPress` must **not** bubble to
  the card (it toggles, never opens). Verify a heart tap doesn't open the player.
* **Resist per-card TV toggles.** A second focusable per card doubles focus stops
  on the home rail/grid and risks the focus model. The TV path is the detail
  top-bar control — keep it there.
* **Top bar now has two focusables.** Re-verify the spec-0 bridges with Back +
  Favorite present: the upward bridge should still favor Back, Left/Right routes
  between them, Down returns to controls. Extend `tv-focus.yaml` and run it.
* **Verify, don't assert** (AGENTS.md): the Jest suite + Maestro `focused` flag +
  a separate reviewer pass gate this.
* **Scope:** `git diff --stat` shows the core/store/components/detail/favorites
  files + the new Maestro flow. Revert drift into navigation or profile.
