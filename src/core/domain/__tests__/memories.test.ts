import { indexById, MemoryParseError, parseMemories, sortByDateRecordedDesc } from '../memories';
import { isPhoto, isVideo, type Memory } from '../types';

const photo = {
  id: 'p1',
  type: 'photo',
  title: 'A photo',
  dateRecorded: '2015-04-22',
  dateDigitized: '2024-02-10',
  assetURL: 'p1.jpg',
};

const video = {
  id: 'v1',
  type: 'video',
  title: 'A video',
  dateRecorded: '2008-08-15',
  assetURL: 'v1.mp4',
  duration: 15.6,
  chapters: [
    { title: 'Start', startTime: 0 },
    { title: 'Middle', startTime: 6 },
  ],
};

describe('parseMemories — happy path', () => {
  it('parses a photo into a typed PhotoMemory', () => {
    const [m] = parseMemories({ memories: [photo] });
    expect(m).toEqual({
      id: 'p1',
      type: 'photo',
      title: 'A photo',
      dateRecorded: '2015-04-22',
      dateDigitized: '2024-02-10',
      assetURL: 'p1.jpg',
    });
    expect(isPhoto(m)).toBe(true);
    expect(isVideo(m)).toBe(false);
  });

  it('parses a video with duration + chapters', () => {
    const [m] = parseMemories({ memories: [video] });
    expect(isVideo(m)).toBe(true);
    if (!isVideo(m)) throw new Error('type guard failed');
    expect(m.duration).toBe(15.6);
    expect(m.chapters).toEqual([
      { title: 'Start', startTime: 0 },
      { title: 'Middle', startTime: 6 },
    ]);
  });

  it('leaves optional fields undefined when absent', () => {
    const { dateDigitized, ...noDigitized } = photo;
    const [m] = parseMemories({ memories: [noDigitized] });
    expect(m.dateDigitized).toBeUndefined();
  });

  it('treats a video with no chapters as undefined chapters (not an error)', () => {
    const { chapters, ...noChapters } = video;
    const [m] = parseMemories({ memories: [noChapters] });
    if (!isVideo(m)) throw new Error('expected video');
    expect(m.chapters).toBeUndefined();
  });
});

describe('parseMemories — validation', () => {
  const expectParseError = (raw: unknown, message: RegExp) =>
    expect(() => parseMemories(raw)).toThrow(message);

  it('rejects a non-{memories:[]} payload', () => {
    expectParseError({}, /shaped like/);
    expectParseError(null, /shaped like/);
    expectParseError([photo], /shaped like/);
  });

  it('rejects missing required string fields', () => {
    expectParseError({ memories: [{ ...photo, id: 1 }] }, /missing a string id/);
    expectParseError({ memories: [{ ...photo, title: undefined }] }, /missing a title/);
    expectParseError({ memories: [{ ...photo, dateRecorded: null }] }, /missing dateRecorded/);
    expectParseError({ memories: [{ ...photo, assetURL: 5 }] }, /missing assetURL/);
  });

  it('rejects an unknown type', () => {
    expectParseError({ memories: [{ ...photo, type: 'audio' }] }, /unknown type "audio"/);
  });

  it('rejects a video missing a numeric duration', () => {
    const { duration, ...noDuration } = video;
    expectParseError({ memories: [noDuration] }, /missing a numeric duration/);
  });

  it('rejects malformed chapters', () => {
    expectParseError({ memories: [{ ...video, chapters: 'nope' }] }, /must be an array/);
    expectParseError({ memories: [{ ...video, chapters: [{ title: 'x' }] }] }, /Invalid chapter at index 0/);
  });

  it('throws a typed MemoryParseError', () => {
    expect(() => parseMemories({})).toThrow(MemoryParseError);
  });
});

describe('sortByDateRecordedDesc', () => {
  it('orders newest-recorded first without mutating the input', () => {
    const input = parseMemories({ memories: [video, photo] }); // 2008, 2015
    const sorted = sortByDateRecordedDesc(input);
    expect(sorted.map((m) => m.id)).toEqual(['p1', 'v1']); // 2015 before 2008
    expect(input.map((m) => m.id)).toEqual(['v1', 'p1']); // input untouched
  });

  it('is stable for equal dates', () => {
    const a: Memory = { id: 'a', type: 'photo', title: 'a', dateRecorded: '2020-01-01', assetURL: 'a.jpg' };
    const b: Memory = { id: 'b', type: 'photo', title: 'b', dateRecorded: '2020-01-01', assetURL: 'b.jpg' };
    expect(sortByDateRecordedDesc([a, b]).map((m) => m.id)).toEqual(['a', 'b']);
  });
});

describe('indexById', () => {
  it('maps each memory by its id', () => {
    const memories = parseMemories({ memories: [photo, video] });
    const map = indexById(memories);
    expect(map.size).toBe(2);
    expect(map.get('v1')?.title).toBe('A video');
    expect(map.get('missing')).toBeUndefined();
  });
});
