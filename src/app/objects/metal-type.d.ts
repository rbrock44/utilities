interface MetalType {
  name: string;
  purity: number;
  /** The fineness stamped on the piece, e.g. `585` on 14K; none for a custom percent. */
  stamp?: string;
}