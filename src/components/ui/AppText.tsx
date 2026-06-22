import { Text as RNText, type TextProps } from 'react-native';

import { italicOf, palette, type as typeTokens } from '@/theme';

type Variant = keyof typeof typeTokens;

interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
  /** Render in the italic serif face (Newsreader italic). Meaningful on the
   * serif variants (`display`/`title`); used for the brand taglines. */
  italic?: boolean;
}

/** Typography primitive. Every piece of text in the app goes through here so the
 * font family, sizing, and tracking stay consistent (and scale together on TV
 * via the tokens). `italic` swaps a serif variant to its italic face; for the
 * sans variants (no italic face loaded) it falls back to a synthetic slant. */
export function AppText({ variant = 'body', color = palette.text, italic, style, ...rest }: AppTextProps) {
  const base = typeTokens[variant];
  const italicStyle = italic
    ? italicOf[base.fontFamily]
      ? { fontFamily: italicOf[base.fontFamily] }
      : { fontStyle: 'italic' as const }
    : null;
  return <RNText {...rest} style={[base, { color }, italicStyle, style]} />;
}
