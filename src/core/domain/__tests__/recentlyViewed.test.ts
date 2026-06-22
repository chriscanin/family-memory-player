import { indexById } from '../memories';
import {
  RECENTLY_VIEWED_LIMIT,
  recentMemories,
  recordView,
  type RecentView,
} from '../recentlyViewed';
import type { Memory } from '../types';

describe('recordView', () => {
  it('records the first view', () => {
    expect(recordView([], 'a', 1)).toEqual([{ id: 'a', viewedAt: 1 }]);
  });

  it('keeps the most-recent view first', () => {
    let history = recordView([], 'a', 1);
    history = recordView(history, 'b', 2);
    expect(history.map((v) => v.id)).toEqual(['b', 'a']);
  });

  it('dedupes a re-view, moving it to the front with a fresh timestamp', () => {
    let history = recordView([], 'a', 1);
    history = recordView(history, 'b', 2);
    history = recordView(history, 'a', 3);
    expect(history.map((v) => v.id)).toEqual(['a', 'b']);
    expect(history[0].viewedAt).toBe(3);
    expect(history).toHaveLength(2);
  });

  it('caps the history at the limit, evicting the oldest', () => {
    let history: RecentView[] = [];
    ['a', 'b', 'c', 'd', 'e', 'f'].forEach((id, i) => {
      history = recordView(history, id, i + 1);
    });
    expect(history).toHaveLength(RECENTLY_VIEWED_LIMIT);
    expect(history.map((v) => v.id)).toEqual(['f', 'e', 'd', 'c', 'b']);
    expect(history.find((v) => v.id === 'a')).toBeUndefined();
  });

  it('respects a custom limit', () => {
    let history: RecentView[] = [];
    ['a', 'b', 'c'].forEach((id, i) => {
      history = recordView(history, id, i + 1, 2);
    });
    expect(history.map((v) => v.id)).toEqual(['c', 'b']);
  });

  it('never mutates the input array', () => {
    const original: RecentView[] = [{ id: 'a', viewedAt: 1 }];
    const next = recordView(original, 'b', 2);
    expect(original).toEqual([{ id: 'a', viewedAt: 1 }]);
    expect(next).not.toBe(original);
  });
});

describe('recentMemories', () => {
  const memories: Memory[] = [
    { id: 'a', type: 'photo', title: 'A', dateRecorded: '2020-01-01', assetURL: 'a.jpg' },
    { id: 'b', type: 'photo', title: 'B', dateRecorded: '2020-01-02', assetURL: 'b.jpg' },
  ];
  const byId = indexById(memories);

  it('resolves history into memories in view order', () => {
    const history: RecentView[] = [
      { id: 'b', viewedAt: 2 },
      { id: 'a', viewedAt: 1 },
    ];
    expect(recentMemories(history, byId).map((m) => m.id)).toEqual(['b', 'a']);
  });

  it('drops ids that no longer exist in the library', () => {
    const history: RecentView[] = [
      { id: 'ghost', viewedAt: 3 },
      { id: 'a', viewedAt: 1 },
    ];
    expect(recentMemories(history, byId).map((m) => m.id)).toEqual(['a']);
  });
});
