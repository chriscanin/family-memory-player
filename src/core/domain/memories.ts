/**
 * Loading, validating, and indexing the memory library.
 *
 * The parser is deliberately strict enough to catch authoring mistakes in
 * `memories.json` but, per the brief, uses reasonable defaults rather than
 * production-grade exhaustive validation.
 */

import type { Chapter, Memory } from './types';

export class MemoryParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MemoryParseError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseChapters(value: unknown): Chapter[] | undefined {
  if (value == null) return undefined;
  if (!Array.isArray(value)) throw new MemoryParseError('`chapters` must be an array');
  return value.map((raw, index) => {
    if (!isRecord(raw) || typeof raw.title !== 'string' || typeof raw.startTime !== 'number') {
      throw new MemoryParseError(`Invalid chapter at index ${index}`);
    }
    return { title: raw.title, startTime: raw.startTime };
  });
}

function parseMemory(raw: unknown, index: number): Memory {
  if (!isRecord(raw)) throw new MemoryParseError(`Memory at index ${index} is not an object`);

  const { id, type, title, dateRecorded, dateDigitized, assetURL } = raw;
  if (typeof id !== 'string') throw new MemoryParseError(`Memory ${index} is missing a string id`);
  if (typeof title !== 'string') throw new MemoryParseError(`Memory ${id} is missing a title`);
  if (typeof dateRecorded !== 'string') throw new MemoryParseError(`Memory ${id} is missing dateRecorded`);
  if (typeof assetURL !== 'string') throw new MemoryParseError(`Memory ${id} is missing assetURL`);

  const base = {
    id,
    title,
    dateRecorded,
    dateDigitized: typeof dateDigitized === 'string' ? dateDigitized : undefined,
    assetURL,
  };

  if (type === 'photo') {
    return { ...base, type: 'photo' };
  }
  if (type === 'video') {
    if (typeof raw.duration !== 'number') {
      throw new MemoryParseError(`Video memory ${id} is missing a numeric duration`);
    }
    return { ...base, type: 'video', duration: raw.duration, chapters: parseChapters(raw.chapters) };
  }
  throw new MemoryParseError(`Memory ${id} has unknown type "${String(type)}"`);
}

/** Parses the `{ memories: [...] }` payload into validated domain objects. */
export function parseMemories(raw: unknown): Memory[] {
  if (!isRecord(raw) || !Array.isArray(raw.memories)) {
    throw new MemoryParseError('Expected an object shaped like { memories: [...] }');
  }
  return raw.memories.map(parseMemory);
}

/** Newest-recorded first; stable for equal dates. */
export function sortByDateRecordedDesc(memories: Memory[]): Memory[] {
  return [...memories].sort((a, b) => b.dateRecorded.localeCompare(a.dateRecorded));
}

export function indexById(memories: Memory[]): Map<string, Memory> {
  return new Map(memories.map((memory) => [memory.id, memory]));
}
