import { useEffect, useState } from 'react';
import type { VideoPlayer } from 'expo-video';

export interface PlaybackState {
  isPlaying: boolean;
  /** Seconds. */
  currentTime: number;
  /** Seconds; 0 until the asset reports its duration. */
  duration: number;
  /** True once playback has reached the end (drives the replay affordance).
   * Sourced from the player's `playToEnd` event — not a `currentTime >= duration`
   * heuristic, which is fragile near the last frame. Cleared on replay/seek-back. */
  ended: boolean;
}

/**
 * Subscribes to an expo-video player and surfaces the slice of state the UI
 * needs as plain React state. The player itself stays the source of truth for
 * seeking; this only mirrors playback position/state for rendering.
 */
export function usePlaybackState(player: VideoPlayer): PlaybackState {
  const [state, setState] = useState<PlaybackState>({
    isPlaying: player.playing,
    currentTime: player.currentTime ?? 0,
    duration: player.duration ?? 0,
    ended: false,
  });

  useEffect(() => {
    const subscriptions = [
      player.addListener('timeUpdate', (payload) => {
        setState((s) => {
          const duration = player.duration || s.duration;
          // Seeking back from the end (e.g. a paused scrub) clears `ended`.
          const ended = s.ended && duration > 0 && payload.currentTime < duration - 0.5 ? false : s.ended;
          return { ...s, currentTime: payload.currentTime, duration, ended };
        });
      }),
      player.addListener('playingChange', (payload) => {
        // Resuming playback means we're no longer at the end.
        setState((s) => ({ ...s, isPlaying: payload.isPlaying, ended: payload.isPlaying ? false : s.ended }));
      }),
      // Duration becomes known once the asset is ready.
      player.addListener('statusChange', () => {
        setState((s) => ({ ...s, duration: player.duration || s.duration }));
      }),
      // The authoritative end-of-playback signal.
      player.addListener('playToEnd', () => {
        setState((s) => ({ ...s, ended: true, isPlaying: false }));
      }),
    ];
    return () => subscriptions.forEach((sub) => sub.remove());
  }, [player]);

  return state;
}
