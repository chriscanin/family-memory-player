# ATDD specs — UI improvements (June 2026)

This folder holds the acceptance-test-driven specs for the app. Each file is a
**single seam** (one architectural boundary) with black-box Given/When/Then
gates and an executable oracle. Read the seam you're implementing top-to-bottom
before touching code; the oracle — not a self-reported "it works" — is what
marks it done.

## The specs

| # | Spec | Seam | Status |
|---|------|------|--------|
| 0 | [`tv-player-focus.atdd.md`](tv-player-focus.atdd.md) | The d-pad focus model of the player detail screen | **Done** (shipped) |
| 1 | [`player-ux.atdd.md`](player-ux.atdd.md) | The video player's look + controls (visual overhaul, chapters-left, title scrim, auto-hide, scrub/hold-seek, replay-at-end) | Planned |
| 2 | [`navigation-shell.atdd.md`](navigation-shell.atdd.md) | The app's top-level navigation (mobile bottom tabs + TV collapsible left rail) over Home / Favorites / Profile | Planned |
| 3 | [`favorites.atdd.md`](favorites.atdd.md) | Marking a memory as a favorite and the Favorites collection | Planned |
| 4 | [`onboarding-auth-profile.atdd.md`](onboarding-auth-profile.atdd.md) | First-run intro + Clerk auth (mobile) + the Profile tab | Planned |

Spec 0 is the focus model we already fixed and is the **load-bearing
invariant** every other spec must preserve. When a later spec changes the
player layout (spec 1) or adds a navigation region (spec 2), `src/core/e2e/tv-focus.yaml`
must still pass — extend it, never weaken it.

## Product decisions (settled — don't re-litigate)

These were chosen with the project owner; the specs assume them:

1. **Auth is optional — guest by default.** The app opens straight into Home as
   it does today. The intro plays, then *offers* sign-in/sign-up, but a guest can
   skip and use the whole app (browse, favorite, play). Nothing is walled.
2. **Clerk auth is mobile-only (iOS + Android).** The 10-foot TV builds run as a
   guest: no sign-in wall, and the Profile tab shows a "sign in on your phone"
   state. This sidesteps tvOS's poor support for browser-OAuth and secure token
   storage. Gate every auth-only path on `!IS_TV` **and** the auth state.
3. **Iconography is `@expo/vector-icons`.** Real glyphs (Ionicons/Material) for
   play/pause/replay/skip/scrub and the Home/Favorites/Profile tabs — no native
   build change, ships with Expo. Retire the text glyphs (`▶`, `❚❚`, `«10`).
4. **Favorites persist locally** (AsyncStorage), mirroring
   `recentlyViewedStore`. They are **not** tied to the Clerk account in this
   pass — a guest can favorite, and favorites survive sign-in/out. (A future
   pass could sync them to the user; out of scope here.)

## Shared setup (do once, before specs 1-4)

### Dependencies to add

| Package | For | Notes |
|---------|-----|-------|
| `@expo/vector-icons` | All icons | Ships with the Expo SDK; usually already resolvable. Confirm it's a direct dependency. |
| `@clerk/clerk-expo` | Auth (mobile) | The Expo SDK. **Verify the current major + the documented install steps against Clerk's official docs at implementation time** (the owner referred to it as the "core-3 js sdk for Expo" — confirm the exact package/version before pinning). |
| `expo-secure-store` | Clerk token cache (mobile) | Clerk's recommended token cache on native. Gate usage on `!IS_TV`. |
| `expo-web-browser` | Clerk OAuth redirect (mobile) | Only if social sign-in is enabled; email/password + email-code need no browser. |

> ⚠️ **Bundle-size rule (AGENTS.md):** the living-room build cares about bundle
> size — don't pull in more than the four above. No icon-font-per-screen, no
> navigation library beyond what expo-router already provides (see spec 2: TV
> uses a hand-rolled rail, not a second nav lib).

### Clerk project — a human prerequisite

Creating the Clerk application requires a Clerk account and dashboard sign-in,
which the agent **cannot and must not** do on the owner's behalf. Before spec 4:

1. The **owner** creates the Clerk app (the owner mentioned the Clerk CLI is an
   option) and enables the desired sign-in methods (email-code is the lowest-
   friction default).
2. The owner provides the **publishable key** as
   `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (e.g. in `.env` / EAS secrets). The spec's
   DoD is blocked until this exists; never hardcode or invent a key.

### Suggested implementation order

`1 (player-ux)` → `2 (navigation-shell)` → `3 (favorites)` → `4 (onboarding-auth-profile)`.

Player polish is self-contained and low-risk. Navigation restructures routing
(everything else hangs off it). Favorites needs the Favorites tab from spec 2 to
have a home. Auth/intro is last and depends on the Profile tab existing.

## Definition of done (applies to every spec)

Per `AGENTS.md`:

1. `npx tsc --noEmit` clean.
2. `npx jest` green.
3. `npx expo export --platform ios` bundles with no errors.
4. `src/core/e2e/tv-focus.yaml` still **exits 0** on Android TV (the focus invariant
   is never allowed to regress).
5. Verify on a real surface (simulator screenshot / focus log), don't assert.
