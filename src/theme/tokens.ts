/**
 * Design tokens — the single vocabulary every component speaks.
 *
 * A warm, editorial heritage palette built around a deep
 * forest-green canvas, a sage-green accent, and warm cream ink, paired with a
 * **Newsreader** serif (the emotional, editorial voice — memory titles, taglines)
 * and **Hanken Grotesk** sans (the UI chrome — buttons, labels, metadata). Type
 * and spacing scale up on TV so the same components stay legible at couch
 * distance from one set of tokens.
 *
 * Components speak ONLY in these tokens — no hardcoded colors, fonts, or sizes.
 */
import { Dimensions } from 'react-native';

import { IS_TV } from '@/core/tv';

/**
 * 10-foot sizing is density-independent. The TV design was tuned on Apple TV
 * whose logical canvas is ~1920dp wide; other TV platforms render the same dp at
 * a different physical size (e.g. an Android TV at density 320 has a 960dp
 * canvas, so fixed sizes look 2× too big). Scaling all TV sizing to the window
 * width keeps the UI the same fraction of the screen on any TV. Clamped to ≤1 so
 * Apple TV (the design reference) is unchanged and only denser panels shrink.
 */
const TV_REF_WIDTH = 1920;
const tvScale = IS_TV ? Math.min(1, Dimensions.get('window').width / TV_REF_WIDTH) : 1;
/** Scale a 10-foot dp value to the current TV canvas (no-op on handheld).
 * Exported so components sizing their own TV-only dimensions stay
 * density-independent like the tokens. */
export const px = (n: number) => Math.round(n * tvScale);

export const palette = {
  /** App background — deep forest green (the heritage canvas). */
  bg: '#1C3A2E',
  /** Lifted panels / cards on the forest canvas. */
  surface: '#244639',
  surfaceHi: '#2C5142',
  /** Hairline dividers over the dark canvas. */
  line: 'rgba(243,239,230,0.10)',
  /** Warm cream — primary text on the dark canvas. */
  text: '#F3EFE6',
  /** Muted sage-gray — secondary text / metadata. */
  textMuted: '#8A9C92',
  textFaint: '#6F7D72',
  /** Sage green — the heritage accent (active states, brand, focus). */
  accent: '#A7C4B5',
  /** Deep-green ink for text/icons sitting on the sage accent. */
  accentInk: '#163026',
  /** Heart / favorite red — the one warm pop in the palette. */
  favorite: '#D8473B',
  /** Focus ring on TV — sage, to match the accent. */
  focus: '#A7C4B5',
  /** Soft sage halo drawn outside the focus ring on cards. */
  focusHalo: 'rgba(167,196,181,0.25)',
  /** Dark forest-green translucent — rail, tab bar, dialog scrim base. */
  scrim: 'rgba(8,20,15,0.6)',
  /** Chip surfaces (over footage / posters): translucent dark for the PHOTO
   * badge, a hairline cream border for outlined chips, a soft dark scrim for the
   * duration pill. */
  badgePhotoBg: 'rgba(15,30,24,0.55)',
  badgeBorder: 'rgba(243,239,230,0.4)',
  badgeScrim: 'rgba(0,0,0,0.45)',
  /** Warm parchment — the light editorial surface (photo viewer chrome). */
  cream: '#F1ECE1',
  creamInk: '#1F3A2D',
  creamMuted: '#6F7D72',
  // Detail / player surfaces.
  /** Player backdrop — near-black warm forest. */
  playerBg: '#16261E',
  controlScrim: 'rgba(8,20,15,0.55)',
  /** Circular transport-control fill (over footage). */
  controlBg: 'rgba(0,0,0,0.40)',
  /** Filled / pressed transport button. */
  controlBgActive: 'rgba(167,196,181,0.22)',
  /** Scrubber track behind the sage fill. */
  track: 'rgba(243,239,230,0.25)',
  /** Near-black warm ink for the player chrome scrims (see the Scrim component). */
  scrimInk: '#0A140F',
} as const;

export const spacing = {
  xs: px(4),
  sm: px(8),
  md: px(12),
  lg: px(16),
  xl: px(24),
  xxl: px(32),
  xxxl: px(48),
} as const;

export const radius = {
  sm: px(8),
  md: px(14),
  lg: px(20),
  pill: 999,
} as const;

/**
 * Loaded font-family names (each weight/style is its own family, the way
 * `expo-font`/`@expo-google-fonts` register them). Components and the `type`
 * scale reference these so the serif/sans split lives in exactly one place. The
 * matching faces are loaded in `src/app/_layout.tsx`; keep the two in sync.
 */
export const fonts = {
  /** Newsreader — editorial serif. */
  serif: 'Newsreader_400Regular',
  serifMedium: 'Newsreader_500Medium',
  serifItalic: 'Newsreader_400Regular_Italic',
  serifMediumItalic: 'Newsreader_500Medium_Italic',
  /** Hanken Grotesk — UI sans. */
  sans: 'HankenGrotesk_400Regular',
  sansMedium: 'HankenGrotesk_500Medium',
  sansSemiBold: 'HankenGrotesk_600SemiBold',
  sansBold: 'HankenGrotesk_700Bold',
} as const;

/** Maps each serif family to its italic counterpart (used by AppText `italic`). */
export const italicOf: Record<string, string> = {
  [fonts.serif]: fonts.serifItalic,
  [fonts.serifMedium]: fonts.serifMediumItalic,
};

const typeScale = IS_TV ? 1.55 : 1;
const t = (size: number) => px(size * typeScale);

/**
 * Type ramp. Serif (Newsreader) carries the editorial voice — screen titles,
 * memory names, taglines; sans (Hanken Grotesk) carries the chrome. We set
 * `fontFamily` (which encodes the weight) and deliberately omit `fontWeight`:
 * with named font faces, a separate weight triggers faux-bolding / wrong-face
 * selection on Android.
 */
export const type = {
  /** Serif hero — screen titles, photo captions, player title. */
  display: { fontFamily: fonts.serifMedium, fontSize: t(30), letterSpacing: 0 },
  /** Serif sub-hero — memory-card titles, profile name, detail subtitle. */
  title: { fontFamily: fonts.serifMedium, fontSize: t(18), letterSpacing: 0 },
  /** Sans emphasis — buttons, nav labels, the favorite control. */
  heading: { fontFamily: fonts.sansSemiBold, fontSize: t(16) },
  /** Sans body — subtitles, notes, metadata. */
  body: { fontFamily: fonts.sans, fontSize: t(15) },
  /** Sans metadata — dates, counts, small print. */
  caption: { fontFamily: fonts.sansMedium, fontSize: t(12.5) },
  /** Sans micro-label — media-type / duration chips. */
  label: {
    fontFamily: fonts.sansBold,
    fontSize: t(11),
    letterSpacing: t(11) * 0.08,
    textTransform: 'uppercase' as const,
  },
  /** Sans brand / section eyebrow — wide-tracked uppercase (the wordmark + rail/section headers). */
  eyebrow: {
    fontFamily: fonts.sansSemiBold,
    fontSize: t(13),
    letterSpacing: t(13) * 0.16,
    textTransform: 'uppercase' as const,
  },
} as const;

/** Layout metrics that differ between handheld and the 10-foot surface. */
export const metrics = {
  isTV: IS_TV,
  screenPad: IS_TV ? spacing.xxxl : spacing.lg,
  /** Vertical TV overscan. tvOS reports a safe area, but Android TV does not,
   * so we pad explicitly on TV instead of relying on safe-area insets. */
  overscanY: IS_TV ? px(44) : 0,
  railGap: IS_TV ? spacing.xl : spacing.md,
  /** Fixed card width used in horizontal rails / swimlanes. */
  cardWidth: IS_TV ? px(296) : 168,
  /** poster height as a fraction of card width. */
  cardPosterRatio: 0.62,
  /** Extra scale a focused/pressed card grows to. */
  focusScale: IS_TV ? 1.06 : 1.03,
} as const;

/** Theme object handed to expo-router's <ThemeProvider>. */
export const navigationTheme = {
  dark: true,
  colors: {
    primary: palette.accent,
    background: palette.bg,
    card: palette.bg,
    text: palette.text,
    border: palette.line,
    notification: palette.accent,
  },
  fonts: {
    regular: { fontFamily: fonts.sans, fontWeight: '400' as const },
    medium: { fontFamily: fonts.sansMedium, fontWeight: '500' as const },
    bold: { fontFamily: fonts.sansSemiBold, fontWeight: '600' as const },
    heavy: { fontFamily: fonts.sansBold, fontWeight: '700' as const },
  },
};
