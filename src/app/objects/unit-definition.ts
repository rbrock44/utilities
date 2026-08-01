interface UnitDefinition {
  id: string;
  label: string;
  aliases: string[];
  toBase: (value: number) => number;
  fromBase: (value: number) => number;
}
