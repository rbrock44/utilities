import { CATEGORIES } from './categories';

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
