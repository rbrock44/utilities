import { Injectable } from "@angular/core";
import { Location } from "@angular/common";
import { ActivatedRoute } from "@angular/router";
import { Category } from "../objects/category";

@Injectable({
    providedIn: 'root'
})
export class SettingsService {
    private selectedTile: string | null = null;
    tileUrlParam: string = 'tile';
    categories: Category[] = [
    // {
    //   name: 'Productivity',
    //   tiles: [
    //     {
    //       title: 'Calculator',
    //       description: 'Basic calculator utility',
    //       icon: '🧮',
    //       param: ''
    //     },
    //     {
    //       title: 'Timer',
    //       description: 'Countdown and stopwatch',
    //       icon: '⏱️',
    //       param: ''
    //     },
    //     {
    //       title: 'Notes',
    //       description: 'Quick note taking',
    //       icon: '📝',
    //       param: ''
    //     }
    //   ]
    // },
    // {
    //   name: 'Converters',
    //   tiles: [
    //     {
    //       title: 'Unit Converter',
    //       description: 'Convert between units',
    //       icon: '📏',
    //       param: ''
    //     },
    //     {
    //       title: 'Currency',
    //       description: 'Exchange rates',
    //       icon: '💱',
    //       param: ''
    //     }
    //   ]
    // },
    {
      name: 'Calculators',
      tiles: [
        {
          title: 'Precious Metals',
          description: 'Convert weight and type to spot price',
          icon: '📏',
          param: 'pm'
        }
      ]
    }
  ];

    constructor(
        private location: Location,
    ) { }

    getSelectedTile(): string | null {
        return this.selectedTile;
    }

    setSelectedTile(tile: string = ""): void {
        if (tile == "") {
            this.selectedTile = null;
        } else {
            this.selectedTile = tile;
        }
    }

    resetUrl(): void {
        this.location.replaceState(this.buildUrl());
    }

    private buildUrl(): string {
        const queryParams = new URLSearchParams();

        if (this.selectedTile !== null && this.selectedTile !== '') {
            queryParams.set(this.tileUrlParam, this.selectedTile);
        }

        const end = queryParams.toString();
        if (end !== '') {
            return `${location.pathname}?${queryParams.toString()}`;
        } else {
            return location.pathname;
        }
    }
}