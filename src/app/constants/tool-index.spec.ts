import { findTool, relatedTools, searchTools, TOOL_INDEX } from './tool-index';

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

describe('relatedTools', () => {
  const params = (param: string, count?: number) => relatedTools(param, count).map(tool => tool.param);

  it('should put hand-picked tools first, then fill from the same category', () => {
    expect(params('jwt-decoder')).toEqual([
      'base64-converter', 'json-formatter', 'timestamp-converter', 'cron-translator'
    ]);
  });

  it('should wrap around the category when filling', () => {
    // Generators run hex, guid, qr. After qr's two picks, the fill wraps to hex then guid.
    expect(params('qr-code-generator')).toEqual([
      'url-encoder', 'email-link-generator', 'hex-generator', 'guid-generator'
    ]);
  });

  it('should never repeat a tool or include the tool itself', () => {
    const related = params('stair-stringer-calculator', 10);
    expect(related).not.toContain('stair-stringer-calculator');
    expect(new Set(related).size).toBe(related.length);
  });

  it('should stop at the requested count', () => {
    expect(params('precious-metals', 2)).toEqual(['gold-in-coins', 'silver-in-coins']);
  });

  it('should return nothing for unknown tools', () => {
    expect(relatedTools('nope')).toEqual([]);
  });
});
