import { favoriteMemories, isFavorite, toggleFavorite, type FavoriteEntry } from '../favorites';
import type { Memory } from '../types';

const mem = (id: string): Memory => ({
  id,
  type: 'photo',
  title: id,
  dateRecorded: '2020-01-01',
  assetURL: `${id}.jpg`,
});

describe('toggleFavorite', () => {
  it('adds an id to the front (newest-first)', () => {
    const after = toggleFavorite([{ id: 'a', favoritedAt: 1 }], 'b', 2);
    expect(after.map((f) => f.id)).toEqual(['b', 'a']);
  });

  it('removes an id that is already a favorite', () => {
    const after = toggleFavorite([{ id: 'a', favoritedAt: 1 }, { id: 'b', favoritedAt: 2 }], 'a', 3);
    expect(after.map((f) => f.id)).toEqual(['b']);
  });

  it('does not mutate the input', () => {
    const input: FavoriteEntry[] = [{ id: 'a', favoritedAt: 1 }];
    toggleFavorite(input, 'b', 2);
    expect(input).toEqual([{ id: 'a', favoritedAt: 1 }]);
  });

  it('round-trips back to empty', () => {
    const once = toggleFavorite([], 'a', 1);
    expect(isFavorite(once, 'a')).toBe(true);
    const twice = toggleFavorite(once, 'a', 2);
    expect(twice).toEqual([]);
  });
});

describe('isFavorite', () => {
  it('reflects membership', () => {
    const list: FavoriteEntry[] = [{ id: 'a', favoritedAt: 1 }];
    expect(isFavorite(list, 'a')).toBe(true);
    expect(isFavorite(list, 'z')).toBe(false);
  });
});

describe('favoriteMemories', () => {
  const byId = new Map<string, Memory>([
    ['a', mem('a')],
    ['b', mem('b')],
  ]);

  it('resolves entries to memories in list order', () => {
    const list: FavoriteEntry[] = [{ id: 'b', favoritedAt: 2 }, { id: 'a', favoritedAt: 1 }];
    expect(favoriteMemories(list, byId).map((m) => m.id)).toEqual(['b', 'a']);
  });

  it('drops unknown ids', () => {
    const list: FavoriteEntry[] = [{ id: 'a', favoritedAt: 1 }, { id: 'gone', favoritedAt: 2 }];
    expect(favoriteMemories(list, byId).map((m) => m.id)).toEqual(['a']);
  });
});
