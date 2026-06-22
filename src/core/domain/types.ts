/**
 * Domain types for the memory library.
 *
 * This module is intentionally free of any React Native / Expo imports so the
 * core domain can be unit-tested in plain Node and reused on any surface
 * (phone, tablet, TV) without pulling in the rendering layer.
 */

export type MemoryType = 'video' | 'photo';

/** A jump point inside a video (e.g. a scene from a digitized reel). */
export interface Chapter {
  title: string;
  /** Seconds from the start of the video. */
  startTime: number;
}

interface BaseMemory {
  id: string;
  type: MemoryType;
  title: string;
  /** ISO date (YYYY-MM-DD) the original moment was captured. */
  dateRecorded: string;
  /** ISO date the physical media was digitized by Legacybox. */
  dateDigitized?: string;
  /** Bundled asset filename; resolved to a Metro module via the asset map. */
  assetURL: string;
}

export interface VideoMemory extends BaseMemory {
  type: 'video';
  /** Duration in seconds. */
  duration: number;
  chapters?: Chapter[];
}

export interface PhotoMemory extends BaseMemory {
  type: 'photo';
}

export type Memory = VideoMemory | PhotoMemory;

export function isVideo(memory: Memory): memory is VideoMemory {
  return memory.type === 'video';
}

export function isPhoto(memory: Memory): memory is PhotoMemory {
  return memory.type === 'photo';
}
