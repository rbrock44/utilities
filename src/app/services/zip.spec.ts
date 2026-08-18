import { buildZip } from './zip';

describe('buildZip', () => {
  const bytes = (text: string) => new TextEncoder().encode(text);

  const readU32 = (zip: Uint8Array, at: number) =>
    new DataView(zip.buffer, zip.byteOffset, zip.byteLength).getUint32(at, true);

  const readU16 = (zip: Uint8Array, at: number) =>
    new DataView(zip.buffer, zip.byteOffset, zip.byteLength).getUint16(at, true);

  it('should write a central directory entry for every file', () => {
    const zip = buildZip([
      { name: 'one.txt', bytes: bytes('hello') },
      { name: 'two.txt', bytes: bytes('{}') },
    ]);

    expect(readU32(zip, 0)).toBe(0x04034b50);
    // Method 0 is "stored"; anything else would need a deflate stream.
    expect(readU16(zip, 8)).toBe(0);

    const end = zip.length - 22;
    expect(readU32(zip, end)).toBe(0x06054b50);
    expect(readU16(zip, end + 10)).toBe(2);

    const centralOffset = readU32(zip, end + 16);
    expect(readU32(zip, centralOffset)).toBe(0x02014b50);
    expect(readU32(zip, end + 12)).toBe(end - centralOffset);
  });

  it('should repeat the size in the compressed and uncompressed fields', () => {
    const zip = buildZip([{ name: 'one.txt', bytes: bytes('hello') }]);

    expect(readU32(zip, 18)).toBe(5);
    expect(readU32(zip, 22)).toBe(5);
  });

  it('should checksum entries so the archive verifies', () => {
    const zip = buildZip([{ name: 'a.txt', bytes: bytes('123456789') }]);

    // The CRC-32 of "123456789" is the standard check value for the algorithm.
    expect(readU32(zip, 14)).toBe(0xcbf43926);
  });

  it('should point each local header at the right offset', () => {
    const zip = buildZip([
      { name: 'a.txt', bytes: bytes('1234') },
      { name: 'b.txt', bytes: bytes('5678') },
    ]);

    const end = zip.length - 22;
    const centralOffset = readU32(zip, end + 16);
    const secondLocal = readU32(zip, centralOffset + 46 + 5 + 42);

    expect(secondLocal).toBe(30 + 5 + 4);
    expect(readU32(zip, secondLocal)).toBe(0x04034b50);
  });

  it('should build an empty archive without an entry', () => {
    const zip = buildZip([]);

    expect(zip.length).toBe(22);
    expect(readU32(zip, 0)).toBe(0x06054b50);
  });
});
