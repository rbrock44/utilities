import { findTool, searchTools, TOOL_INDEX } from './tool-index';

describe('tool index', () => {
  it('should hold every home-page tool with its category', () => {
    expect(TOOL_INDEX.length).toBeGreaterThan(30);
    expect(findTool('jwt-decoder')?.category).toBe('Developer Tools');
  });

  it('should not find unlisted or unknown tools', () => {
    expect(findTool('cleaning-payout-calculator')).toBeUndefined();
    expect(findTool('nope')).toBeUndefined();
  });

  it('should return everything for a blank query', () => {
    expect(searchTools('   ')).toEqual(TOOL_INDEX);
  });

  it('should rank title-prefix matches first', () => {
    const results = searchTools('pdf').map(tool => tool.param);
    expect(results.slice(0, 3).sort()).toEqual(['pdf-combiner', 'pdf-page-utility', 'pdf-to-images']);
  });

  it('should require every word to match somewhere', () => {
    const results = searchTools('json web token').map(tool => tool.param);
    expect(results).toEqual(['jwt-decoder']);
  });

  it('should match on category names', () => {
    const results = searchTools('generators').map(tool => tool.param);
    expect(results).toContain('guid-generator');
    expect(results).toContain('hex-generator');
  });

  it('should be case-insensitive and return nothing for nonsense', () => {
    expect(searchTools('LOAN').map(tool => tool.param)).toContain('loan-calculator');
    expect(searchTools('zzqx')).toEqual([]);
  });
});
