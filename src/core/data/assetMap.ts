/**
 * Bridges the declarative `assetURL` strings in `memories.json` to Metro's
 * static `require()` graph.
 *
 * React Native bundles assets at build time, so they cannot be required by a
 * runtime-computed string. Keeping this map as the single place that knows
 * about bundled files lets `memories.json` stay pure data and lets the rest of
 * the app resolve an asset by name.
 */

type AssetModule = number;

export const assetMap: Record<string, AssetModule> = {
  'beach-day-2008.mp4': require('../../../assets/memories/beach-day-2008.mp4'),
  'camping-1996.mp4': require('../../../assets/memories/camping-1996.mp4'),
  'grandma-80th.jpg': require('../../../assets/memories/grandma-80th.jpg'),
  'first-birthday.jpg': require('../../../assets/memories/first-birthday.jpg'),
  'family-reunion.jpg': require('../../../assets/memories/family-reunion.jpg'),
};

/**
 * Poster stills for video memories (extracted from each clip at build time with
 * ffmpeg) so cards and the player can show a real frame without runtime
 * thumbnailing. Keyed by the video's `assetURL`.
 */
export const posterMap: Record<string, AssetModule> = {
  'beach-day-2008.mp4': require('../../../assets/memories/beach-day-2008.poster.jpg'),
  'camping-1996.mp4': require('../../../assets/memories/camping-1996.poster.jpg'),
};

/** Resolves an `assetURL` to its bundled module, or throws if unmapped. */
export function resolveAsset(assetURL: string): AssetModule {
  const asset = assetMap[assetURL];
  if (asset == null) {
    throw new Error(`No bundled asset registered for "${assetURL}"`);
  }
  return asset;
}

/**
 * Returns the bundled poster for a memory: the extracted still for videos, or
 * the photo itself for photos.
 */
export function resolvePoster(assetURL: string): AssetModule {
  return posterMap[assetURL] ?? resolveAsset(assetURL);
}
