interface ComboBoxOption {
  id: string;
  label: string;
  searchText: string;
  /** A hint, not a choice: listed only once something is typed, after the real matches, and can't be picked. */
  disabled?: boolean;
  /** Styles a hint as a caution rather than a quiet note. */
  warning?: boolean;
}
