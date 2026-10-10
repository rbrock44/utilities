import { CATEGORIES } from './categories';
import { resolveLegacyTile, TOOLS } from './tools';

describe('TOOLS', () => {
  const tileParams = CATEGORIES.flatMap(category => category.tiles.map(tile => tile.param));

  it('should have a tool for every home-page tile', () => {
    const missing = tileParams.filter(param => !(param in TOOLS));
    expect(missing).toEqual([]);
  });

  it('should only hold tools that are on the home page or marked unlisted', () => {
    const orphans = Object.keys(TOOLS).filter(
      param => !tileParams.includes(param) && !TOOLS[param].unlisted
    );
    expect(orphans).toEqual([]);
  });

  it('should not list a tool on the home page twice', () => {
    expect(new Set(tileParams).size).toBe(tileParams.length);
  });

  it('should use unique legacy aliases that never collide with a param', () => {
    const aliases = Object.values(TOOLS).flatMap(tool => (tool.alias ? [tool.alias] : []));
    expect(new Set(aliases).size).toBe(aliases.length);
    expect(aliases.filter(alias => alias in TOOLS)).toEqual([]);
  });
});

describe('resolveLegacyTile', () => {
  it('should map a short alias to its param', () => {
    expect(resolveLegacyTile('gg')).toBe('guid-generator');
  });

  it('should accept a full param as-is', () => {
    expect(resolveLegacyTile('guid-generator')).toBe('guid-generator');
  });

  it('should return null for unknown or missing tiles', () => {
    expect(resolveLegacyTile('nope')).toBeNull();
    expect(resolveLegacyTile('')).toBeNull();
    expect(resolveLegacyTile(null)).toBeNull();
  });
});
