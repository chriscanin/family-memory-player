/**
 * Design tokens — the single vocabulary every component speaks.
 *
 * One warm, cinematic dark theme: family media (often faded, warm-toned) reads
 * better against near-black than against white, and a dark 10-foot UI is easier
 * on the eyes across a living room. Type and spacing scale up on TV so the same
 * components stay legible at couch distance from one set of tokens.
 */
import { IS_TV } from '@/platform/tv';

export const palette = {
  /** App background — warm near-black, not pure #000. */
  bg: '#0C0A0F',
  /** Card / panel surfaces. */
  surface: '#171320',
  surfaceHi: '#221B2E',
  line: '#2C2436',
  text: '#F4EFE8',
  textMuted: '#A99FB1',
  textFaint: '#6F6679',
  /** Warm amber — the "film/nostalgia" accent. */
  accent: '#E8B04B',
  accentInk: '#1B1305',
  /** Focus ring on TV. */
  focus: '#FFFFFF',
  scrim: 'rgba(8,6,12,0.78)',
  // Detail / player surfaces.
  playerBg: '#000000',
  controlScrim: 'rgba(8,6,12,0.55)',
  controlBg: 'rgba(20,16,26,0.6)',
  track: 'rgba(255,255,255,0.25)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
} as const;

const typeScale = IS_TV ? 1.55 : 1;
const t = (size: number) => Math.round(size * typeScale);

export const type = {
  display: { fontSize: t(32), fontWeight: '700' as const, letterSpacing: 0.2 },
  title: { fontSize: t(22), fontWeight: '700' as const },
  heading: { fontSize: t(17), fontWeight: '600' as const },
  body: { fontSize: t(15), fontWeight: '400' as const },
  label: { fontSize: t(12), fontWeight: '700' as const, letterSpacing: 0.6 },
  caption: { fontSize: t(12), fontWeight: '500' as const },
} as const;

/** Layout metrics that differ between handheld and the 10-foot surface. */
export const metrics = {
  isTV: IS_TV,
  screenPad: IS_TV ? spacing.xxxl : spacing.lg,
  railGap: IS_TV ? spacing.xl : spacing.md,
  /** Fixed card width used in horizontal rails / swimlanes. */
  cardWidth: IS_TV ? 296 : 168,
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
    regular: { fontFamily: 'System', fontWeight: '400' as const },
    medium: { fontFamily: 'System', fontWeight: '600' as const },
    bold: { fontFamily: 'System', fontWeight: '700' as const },
    heavy: { fontFamily: 'System', fontWeight: '800' as const },
  },
};
