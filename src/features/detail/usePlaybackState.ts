import { useEffect, useState } from 'react';
import type { VideoPlayer } from 'expo-video';

export interface PlaybackState {
  isPlaying: boolean;
  /** Seconds. */
  currentTime: number;
  /** Seconds; 0 until the asset reports its duration. */
  duration: number;
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
  });

  useEffect(() => {
    const subscriptions = [
      player.addListener('timeUpdate', (payload) => {
        setState((s) => ({
          ...s,
          currentTime: payload.currentTime,
          duration: player.duration || s.duration,
        }));
      }),
      player.addListener('playingChange', (payload) => {
        setState((s) => ({ ...s, isPlaying: payload.isPlaying }));
      }),
      // Duration becomes known once the asset is ready.
      player.addListener('statusChange', () => {
        setState((s) => ({ ...s, duration: player.duration || s.duration }));
      }),
    ];
    return () => subscriptions.forEach((sub) => sub.remove());
  }, [player]);

  return state;
}
