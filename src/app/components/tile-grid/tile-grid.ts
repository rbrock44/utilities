import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoryComponent } from '../category/category';
import { CATEGORIES } from '../../constants/categories';
import { FavoritesService } from '../../services/favorites';
import { CommandPaletteService } from '../../services/command-palette';
import { TOOL_INDEX } from '../../constants/tool-index';
import { TOOLS } from '../../constants/tools';
import { SettingDefinition, ToolSettingsService } from '../../services/tool-settings';
import { ToolSettingsComponent } from '../tool-settings/tool-settings';
import { SettingsDrawerComponent } from '../settings-drawer/settings-drawer';

/** Every home-page tool that has settings, in home-page order. */
const SETTINGS_TOOLS = TOOL_INDEX
  .filter(tool => (TOOLS[tool.param]?.settings?.length ?? 0) > 0)
  .map(tool => ({ param: tool.param, title: tool.title, definitions: TOOLS[tool.param].settings! }));

/** Everything a search can hit for one setting: its tool, label, hint, and choices. */
function settingText(toolTitle: string, definition: SettingDefinition): string {
  const options = definition.kind === 'select' ? definition.options.map(option => option.label) : [];
  return [toolTitle, definition.label, definition.hint ?? '', ...options].join(' ').toLowerCase();
}

@Component({
  selector: 'app-tile-grid',
  standalone: true,
  imports: [
    CommonModule, 
    CategoryComponent,
    ToolSettingsComponent,
    SettingsDrawerComponent
  ],
  templateUrl: './tile-grid.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './tile-grid.scss',
})
export class TileGridComponent {
  searchTerm = signal('');
  readonly favorites = inject(FavoritesService);
  readonly palette = inject(CommandPaletteService);
  private readonly settings = inject(ToolSettingsService);

  readonly settingsTools = SETTINGS_TOOLS;
  readonly settingsOpen = signal(false);
  readonly settingsQuery = signal('');
  /** A setting shows when every word searched appears in its text, so "cut kerf" finds one. */
  readonly filteredSettingsTools = computed(() => {
    const terms = this.settingsQuery().toLowerCase().split(/\s+/).filter(Boolean);
    return SETTINGS_TOOLS
      .map(tool => ({
        ...tool,
        definitions: tool.definitions.filter(definition => {
          const text = settingText(tool.title, definition);
          return terms.every(term => text.includes(term));
        }),
      }))
      .filter(tool => tool.definitions.length > 0);
  });

  openSettings(): void {
    this.settingsQuery.set('');
    this.settingsOpen.set(true);
  }
  /** How many settings, across every tool, differ from their defaults. */
  readonly changedSettings = computed(() =>
    SETTINGS_TOOLS.reduce((count, tool) => count + this.settings.changedKeys(tool.param, tool.definitions).length, 0)
  );

  readonly pinnedCategory = computed<Category>(() => ({ name: 'Pinned', tiles: this.favorites.pinnedTools() }));
  readonly recentCategory = computed<Category>(() => ({ name: 'Recent', tiles: this.favorites.recentTools() }));

  get filteredCategories(): Category[] {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) {
      return CATEGORIES;
    }

    return CATEGORIES
      .map(category => {
        const categoryMatches = category.name.toLowerCase().includes(term);
        const tiles = categoryMatches
          ? category.tiles
          : category.tiles.filter(tile =>
              tile.title.toLowerCase().includes(term) || tile.description.toLowerCase().includes(term)
            );
        return { ...category, tiles };
      })
      .filter(category => category.tiles.length > 0);
  }
}
