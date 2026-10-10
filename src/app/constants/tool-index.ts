import { CATEGORIES } from './categories';
import { TOOLS } from './tools';

export interface IndexedTool extends Tile {
  category: string;
}

/** Every tool on the home page, flattened in home-page order. */
export const TOOL_INDEX: IndexedTool[] = CATEGORIES.flatMap(category =>
  category.tiles.map(tile => ({ ...tile, category: category.name }))
);

export function findTool(param: string): IndexedTool | undefined {
  return TOOL_INDEX.find(tool => tool.param === param);
}

/**
 * Every word of the query must appear somewhere in the title, description, or category.
 * Matches are ranked by how strongly the title matches, keeping home-page order within
 * a rank, so "pdf" puts the PDF tools first and "con" puts converters before "Cron".
 */
export function searchTools(query: string): IndexedTool[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return TOOL_INDEX;
  }

  const terms = normalized.split(/\s+/);
  const rank = (tool: IndexedTool): number => {
    const title = tool.title.toLowerCase();
    if (title.startsWith(normalized)) return 0;
    if (title.split(/\s+/).some(word => word.startsWith(terms[0]))) return 1;
    if (title.includes(normalized)) return 2;
    return 3;
  };

  return TOOL_INDEX
    .filter(tool => {
      const haystack = `${tool.title} ${tool.description} ${tool.category}`.toLowerCase();
      return terms.every(term => haystack.includes(term));
    })
    .map(tool => ({ tool, rank: rank(tool) }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ tool }) => tool);
}

/**
 * The hand-picked `related` tools first, then the tools that follow this one in its own
 * category (wrapping around), so siblings vary from page to page instead of every page
 * linking the category's first few.
 */
export function relatedTools(param: string, count = 4): IndexedTool[] {
  const self = findTool(param);
  const picked: IndexedTool[] = [];
  const add = (tool: IndexedTool | undefined) => {
    if (tool && tool.param !== param && !picked.includes(tool) && picked.length < count) {
      picked.push(tool);
    }
  };

  (TOOLS[param]?.related ?? []).forEach(related => add(findTool(related)));

  if (self) {
    const siblings = TOOL_INDEX.filter(tool => tool.category === self.category);
    const start = siblings.indexOf(self);
    for (let offset = 1; offset < siblings.length; offset++) {
      add(siblings[(start + offset) % siblings.length]);
    }
  }

  return picked;
}
