import { Text as RNText, type TextProps } from 'react-native';

import { palette, type as typeTokens } from '../tokens';

type Variant = keyof typeof typeTokens;

interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
}

/** Typography primitive. Every piece of text in the app goes through here so
 * sizing/weight stay consistent (and scale together on TV via the tokens). */
export function AppText({ variant = 'body', color = palette.text, style, ...rest }: AppTextProps) {
  return <RNText {...rest} style={[typeTokens[variant], { color }, style]} />;
}
