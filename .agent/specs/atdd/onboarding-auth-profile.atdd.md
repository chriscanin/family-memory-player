# ATDD Specification: Onboarding, Auth & Profile

> **Seam:** the app's **identity boundary** — the first-run **intro**, the
> optional **Clerk sign-in/up (mobile only)**, and the **Profile tab**. Depends on
> the **Profile tab shell** from
> [`navigation-shell.atdd.md`](navigation-shell.atdd.md). This is the last spec;
> nothing else depends on it.
>
> **Hard preconditions:**
> 1. **Auth is optional — guest by default** (README decision 1). The intro and
>    sign-in never wall the app; a guest uses everything.
> 2. **Clerk is mobile-only** (README decision 2). TV builds run as guest; gate
>    every auth path on `!IS_TV` **and** the session state.
> 3. **A human creates the Clerk project and supplies
>    `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`** — the agent cannot create accounts (see
>    README "Clerk project — a human prerequisite"). This spec's DoD is blocked
>    until that key exists; never hardcode or invent one.

## 1. Problem Statement

* **Context:** the app is currently **unauthenticated** — no intro, no login, no
  profile; memories are locally bundled and open straight to the library. Spec 2
  adds a **Profile tab** as an empty placeholder.
* **The Gap:** three missing pieces:
  1. **No intro.** First launch drops straight into Home with no brand moment.
     The owner wants a **~3-second intro sequence**, then an opportunity to **log
     in or sign up**.
  2. **No auth.** There's no account system. The owner wants **Clerk** (the Expo
     SDK) for email/sign-in on **mobile**, so a user can have an identity and a
     real profile.
  3. **Empty Profile tab.** It needs real content: signed-out (guest) state with
     sign-in/up entry, and signed-in state with the user's info and sign-out.
* **Impact:** the intro is the app's first impression; auth turns "a demo" into
  "an account-backed app." Done wrong (a hard wall, or auth attempted on tvOS
  where it's unreliable) it breaks the guest-first, one-codebase contract — hence
  the optional + mobile-only decisions.

### Expected behavior

* **Intro:** on first launch (and only first launch, unless re-triggered), a
  branded ~3s sequence plays with a smooth animation, then transitions to a
  screen offering **Sign in**, **Sign up**, and **Continue as guest**. Skipping
  (guest) lands in Home with the full app available.
* **Auth (mobile):** Clerk-backed sign-in/up (email-code is the low-friction
  default). A signed-in user's session persists (secure token cache) across
  relaunch. Sign-out returns to guest.
* **TV:** **no** intro-gated auth and **no** sign-in UI. The intro brand moment
  may still play (no auth buttons), and the Profile tab shows a **"sign in on your
  phone"** guest state. The app is fully usable as a guest on TV.
* **Profile tab:** guest state (avatar placeholder + "Sign in / Sign up" on
  mobile, "sign in on your phone" on TV) vs. signed-in state (name/email/avatar
  from Clerk + "Sign out"), on mobile.

## 2. System Constraints & Environment

* **Runtime/frameworks:** as in spec 0. Add `@clerk/clerk-expo` (**verify the
  current package/version + setup against Clerk's official docs at implementation
  time** — the owner referred to the "core-3 js sdk for Expo"; confirm before
  pinning), `expo-secure-store` (Clerk token cache, mobile only), and
  `expo-web-browser` **only if** social OAuth is enabled. **Consult the official
  Clerk Expo docs before implementing** (AGENTS.md: docs before SDKs) — route via
  the `document-specialist`/context7.
* **Provider placement:** wrap the app in `<ClerkProvider>` at the **root**
  (`src/app/_layout.tsx`), reading `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` from env.
  On **TV**, either skip the provider or render it inert — auth hooks must never
  drive UI when `IS_TV`. A small `useAuthState()` wrapper should return a stable
  `{ isSignedIn: false, isGuest: true }` on TV so call-sites don't branch on
  `IS_TV` everywhere.
* **Token cache:** Clerk's secure token cache via `expo-secure-store`, gated on
  `!IS_TV` (expo-secure-store support is unreliable/absent on tvOS — never call it
  there). Session must survive relaunch on mobile.
* **Intro mechanics:** a dedicated route (e.g. `src/app/intro.tsx`) or a root-level
  gate shown before the `(tabs)` group on first launch. Track "intro seen" in a
  tiny persisted flag (AsyncStorage, e.g. `legacybox.intro-seen.v1`) so it doesn't
  replay every launch. Animate with reanimated (fade/scale, ~3s total). The intro
  must **time out / be skippable** — never trap the user (a "Skip" affordance; on
  TV it auto-advances since there are no auth buttons).
* **⚠️ Guest-first, never a wall:** there is **no** route guard that blocks
  `(tabs)` for unauthenticated users. The intro → auth-offer → guest path always
  reaches Home. Signing in is an *enhancement*, not a gate. (README decision 1.)
* **⚠️ TV gating:** every auth control, the Clerk provider's UI, secure-store
  calls, and the web-browser OAuth path are gated on `!IS_TV`. The TV Profile tab
  renders a static guest panel. Verify on a TV surface that **no** Clerk/native
  auth code runs.
* **Credentials boundary:** the **agent must not** create the Clerk account,
  enter credentials, or sign in on the owner's behalf. Implementation builds the
  UI; a human performs the actual Clerk project setup and any real sign-in during
  verification.
* **Files in scope:**
  * `src/app/_layout.tsx` (ClerkProvider at root, TV-inert; intro gate)
  * `src/app/intro.tsx` (**new** — the intro sequence) *(or a root gate component)*
  * `src/features/onboarding/IntroSequence.tsx` (**new** — animation + auth offer)
  * `src/features/auth/` (**new** — sign-in/up screens/sheets, mobile only)
  * `src/features/profile/ProfileScreen.tsx` (fills the spec-2 placeholder:
    guest vs. signed-in vs. TV-guest)
  * `src/state/` — a tiny `introStore`/flag; an `useAuthState()` wrapper
  * `src/design-system/` — any new profile/auth UI primitives (token-driven)
  * `maestro/onboarding.yaml` (**new**, handheld); `tv-focus.yaml` re-run
* **Out of scope:** syncing favorites to the user (spec 3 keeps them local),
  social graph, account settings beyond sign-out, password reset flows beyond what
  Clerk provides out of the box, **full TV auth** (explicitly excluded).

## 3. Black-Box Test Cases (the "green" gates)

> Handheld via Maestro on an iOS sim / Android emulator. TV via the `focused`
> flag on Android TV (+ Apple TV manual). Real Clerk sign-in is performed by a
> human during verification (the agent never enters credentials); the automated
> flow asserts the **UI states and the guest path**, not a live credential entry.

### Scenario 1: Intro plays once, then offers auth, then guest reaches Home — handheld
* **Given:** a fresh install (intro not seen) on handheld.
* **When:** the app launches.
* **Then:** the ~3s intro animation plays, then a screen offers **Sign in**,
  **Sign up**, and **Continue as guest**.
* **And when:** the user taps **Continue as guest**.
* **Then:** Home shows with the full app available (library, tabs).
* **And when:** the app is relaunched.
* **Then:** the intro does **not** replay (the "seen" flag persists) — it goes
  straight to Home (still guest).

### Scenario 2: Guest is never walled
* **Given:** a guest (skipped auth) on handheld.
* **When:** the user navigates Home → Favorites → opens a memory → Profile.
* **Then:** every section and the player are fully usable; nothing demands
  sign-in. The only auth surface is the Profile tab's sign-in entry.

### Scenario 3: Profile shows guest vs. signed-in — handheld
* **Given:** a guest on the **Profile** tab.
* **Then:** it shows a guest panel (avatar placeholder + **Sign in** / **Sign
  up**).
* **And when:** a human completes Clerk sign-in (email-code).
* **Then:** the Profile tab shows the user's name/email/avatar and a **Sign out**
  control; relaunching keeps the user signed in (secure token cache); **Sign out**
  returns to the guest panel.

### Scenario 4: TV runs as guest with no auth code — TV
* **Given:** the app on a TV surface.
* **When:** the app launches and the user opens the **Profile** tab.
* **Then:** the intro brand moment may play but shows **no auth buttons** and
  auto-advances; Profile shows a **"sign in on your phone"** guest panel; **no**
  Clerk provider UI, secure-store, or web-browser auth code executes
  (`!IS_TV`-gated). The whole app is usable as a guest, and **focus is never
  lost** in the Profile tab (exactly one focused element per press).

### Scenario 5: The intro never traps the user
* **Given:** the intro playing on any surface.
* **When:** the user waits (or, on handheld, taps Skip).
* **Then:** the intro always advances to the auth-offer (handheld) or Home (TV) —
  there is no state where the intro hangs or blocks input indefinitely.

### Scenario 6: Focus invariant holds on the new screens (TV guard)
* **Given:** the app on TV.
* **When:** any d-pad sequence runs through the (auth-button-free) intro and the
  TV Profile guest panel.
* **Then:** after **every** press, **exactly one** element is focused — never
  zero. `maestro/tv-focus.yaml` (player) still exits 0. *(Spec-0 invariant
  extended to onboarding/profile.)*

## 4. Definition of Done (DoD)

- [ ] A ~3s **intro** plays on first launch only (persisted "seen" flag), animates
      smoothly, then offers Sign in / Sign up / Continue as guest on handheld;
      it is **skippable / always advances** (Scenarios 1, 5).
- [ ] **Guest-first:** no route guard blocks the app; a guest reaches and uses
      every section + the player (Scenario 2).
- [ ] **Clerk (mobile only)**: `<ClerkProvider>` at root reading
      `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`; email-code sign-in/up; secure token
      cache via `expo-secure-store`; session persists across relaunch; sign-out
      returns to guest (Scenario 3). **Built against the official Clerk Expo docs.**
- [ ] **TV is guest-only**: no auth UI, no Clerk/secure-store/web-browser code runs
      when `IS_TV`; Profile shows "sign in on your phone"; app fully usable as
      guest; focus never lost (Scenarios 4, 6).
- [ ] **Profile tab** renders guest / signed-in / TV-guest states correctly,
      filling the spec-2 placeholder.
- [ ] The agent did **not** create the Clerk account or enter credentials; the
      publishable key is supplied by a human via env (no hardcoded/invented key).
- [ ] `npx tsc --noEmit` clean, `npx jest` green, `npx expo export --platform ios`
      clean. `maestro/tv-focus.yaml` exits 0. No regression to guest usage.

## 5. Executable Validation (the oracle)

```bash
# Handheld: intro-once + guest path + profile states (live sign-in done by a human).
maestro --device <ios-or-android> test maestro/onboarding.yaml

# TV: guest-only, no auth code, focus never lost.
maestro --device <android-tv> test maestro/onboarding.yaml
maestro --device <android-tv> test maestro/tv-focus.yaml   # player invariant intact

npx tsc --noEmit && npx jest && npx expo export --platform ios
```

* **Oracles:** Maestro visibility for the intro/guest/profile UI states; Maestro
  `focused` flag for TV focus safety; a **human** performs real Clerk sign-in for
  Scenario 3's signed-in branch (the automated flow covers the guest path and the
  UI states, not a live credential entry).

## 6. Notes for the Implementing Agent

* **Docs before SDK (AGENTS.md).** Read the **official Clerk Expo docs** first —
  provider setup, `tokenCache` with `expo-secure-store`, the email-code flow, and
  the current package name/version. Confirm what the owner called the "core-3 js
  sdk for Expo" maps to before installing. Route via `document-specialist`/context7.
* **Build the guest path first, auth second.** Implement intro → guest → Home and
  prove the app is never walled (Scenario 2) before wiring Clerk. That keeps the
  app shippable even if Clerk setup is pending the human's project/key.
* **One auth-state wrapper.** `useAuthState()` returns `{ isSignedIn, isGuest }`
  and short-circuits to guest on TV — so screens don't sprinkle `IS_TV && Clerk`
  branches. Gate **all** native auth (secure-store, web-browser) inside it.
* **TV: prove no auth code runs.** The acceptance bar is not just "no buttons" —
  it's that secure-store / Clerk native paths are never invoked on TV. Verify on a
  TV surface (a guard/log) that the `!IS_TV` gates hold.
* **Never trap the intro.** Always provide an escape (Skip / auto-advance);
  re-triggering the intro (if desired) is a deliberate action, not a launch
  default after the flag is set.
* **Credentials are the human's.** Do not create the Clerk account, accept its
  terms, or enter any credential — surface those steps to the owner. (CLAUDE.md /
  prohibited actions.)
* **Verify, don't assert** (AGENTS.md): Maestro + a separate reviewer pass; the
  signed-in branch is human-verified.
* **Scope:** `git diff --stat` shows root layout + intro/auth/profile features +
  the small intro flag/auth wrapper + the new Maestro flow. Revert any drift.
