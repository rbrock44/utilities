import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-combo-box',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './combo-box.html',
  styleUrl: './combo-box.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComboBoxComponent implements OnChanges {
  @Input() options: ComboBoxOption[] = [];
  @Input() value: string | null = null;
  @Input() placeholder = 'Search…';
  @Input() ariaLabel = 'Select an option';
  /** Decides whether one typed word fits an option; every word has to fit, in any order. */
  @Input() matchesWord: (option: ComboBoxOption, word: string) => boolean =
    (option, word) => option.searchText.includes(word);
  @Output() valueChange = new EventEmitter<string>();

  query = '';
  isOpen = false;
  highlightedIndex = 0;
  private hasTyped = false;

  constructor(private elementRef: ElementRef<HTMLElement>, private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (this.isOpen && this.hasTyped) {
      return;
    }
    if (changes['value'] || changes['options']) {
      this.syncQueryToSelectedValue();
    }
  }

  get filteredOptions(): ComboBoxOption[] {
    if (!this.hasTyped || this.query.trim() === '') {
      return this.options.filter(option => !option.disabled);
    }
    const words = this.query.trim().toLowerCase().split(/\s+/);
    const matches = this.options.filter(option => words.every(word => this.matchesWord(option, word)));
    return [...matches.filter(option => !option.disabled), ...matches.filter(option => option.disabled)];
  }

  /** Hints sit after every real match, so arrowing stops at the last one that can be picked. */
  private get lastSelectableIndex(): number {
    return this.filteredOptions.filter(option => !option.disabled).length - 1;
  }

  onFocus(event: FocusEvent): void {
    this.isOpen = true;
    this.hasTyped = false;
    this.highlightedIndex = Math.max(0, this.filteredOptions.findIndex(option => option.id === this.value));
    (event.target as HTMLInputElement).select();
  }

  onInput(): void {
    this.hasTyped = true;
    this.isOpen = true;
    this.highlightedIndex = 0;
  }

  onKeydown(event: KeyboardEvent): void {
    if (!this.isOpen) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        this.isOpen = true;
      }
      return;
    }

    const options = this.filteredOptions;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.highlightedIndex = Math.max(0, Math.min(this.highlightedIndex + 1, this.lastSelectableIndex));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.highlightedIndex = Math.max(this.highlightedIndex - 1, 0);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const option = options[this.highlightedIndex];
      if (option) {
        this.selectOption(option);
      }
    } else if (event.key === 'Escape') {
      this.isOpen = false;
      this.syncQueryToSelectedValue();
    }
  }

  selectOption(option: ComboBoxOption): void {
    if (option.disabled) {
      return;
    }
    this.value = option.id;
    this.isOpen = false;
    this.syncQueryToSelectedValue();
    this.valueChange.emit(option.id);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isOpen && !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.isOpen = false;
      this.syncQueryToSelectedValue();
      this.cdr.markForCheck();
    }
  }

  private syncQueryToSelectedValue(): void {
    this.query = this.options.find(option => option.id === this.value)?.label ?? '';
  }
}
