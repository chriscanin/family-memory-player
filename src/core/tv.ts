/**
 * Single source of truth for "are we on a 10-foot surface?".
 *
 * `react-native-tvos` reports `Platform.isTV` for both tvOS and Android TV.
 * The standard React Native type defs don't declare `isTV`, so we read it
 * defensively. Centralizing this keeps `Platform.isTV` checks out of feature
 * code and makes the handheld/TV branch explicit and greppable.
 */
import { Platform } from 'react-native';

export const IS_TV: boolean = (Platform as { isTV?: boolean }).isTV === true;

/** Pick a value by surface. `tv(handheld, tv)` reads naturally at call sites. */
export function tv<T>(handheld: T, tvValue: T): T {
  return IS_TV ? tvValue : handheld;
}
