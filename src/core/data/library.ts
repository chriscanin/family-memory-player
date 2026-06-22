/**
 * The app's memory library, parsed and validated once at module load.
 *
 * Keeping this as the single entry point means feature code never touches raw
 * JSON — it gets already-validated, sorted `Memory` objects and an id index.
 */
import { indexById, parseMemories, sortByDateRecordedDesc } from '@/core';

import raw from './memories.json';

export const memories = sortByDateRecordedDesc(parseMemories(raw));
export const memoriesById = indexById(memories);
