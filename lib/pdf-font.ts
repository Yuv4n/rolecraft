// Read the embedded TrueType character map before exporting. Missing glyphs
// produce an actionable error rather than a silently corrupted document.
export function missingGlyphs(buffer: ArrayBuffer, text: string): string[] {
 const view = new DataView(buffer);
 const tableCount = view.getUint16(4);
 let cmap = 0;
 for (let i = 0; i < tableCount; i++) {
  const at = 12 + i * 16;
  if (view.getUint32(at) === 0x636d6170) cmap = view.getUint32(at + 8);
 }
 if (!cmap) throw new Error('The PDF font has no character map.');
 const maps: number[] = [];
 for (let i = 0; i < view.getUint16(cmap + 2); i++) {
  const at = cmap + 4 + i * 8;
  const platform = view.getUint16(at);
  if (platform === 0 || platform === 3) maps.push(cmap + view.getUint32(at + 4));
 }
 const has = (code: number) => maps.some(at => {
  const format = view.getUint16(at);
  if (format === 12) {
   for (let i = 0; i < view.getUint32(at + 12); i++) {
    const group = at + 16 + i * 12;
    const start = view.getUint32(group), end = view.getUint32(group + 4);
    if (code >= start && code <= end) return view.getUint32(group + 8) + code - start !== 0;
   }
  }
  if (format === 4 && code <= 0xffff) {
   const count = view.getUint16(at + 6) / 2;
   const ends = at + 14, starts = ends + count * 2 + 2;
   const deltas = starts + count * 2, offsets = deltas + count * 2;
   for (let i = 0; i < count; i++) {
    if (code < view.getUint16(starts + i * 2) || code > view.getUint16(ends + i * 2)) continue;
    const delta = view.getInt16(deltas + i * 2), offset = view.getUint16(offsets + i * 2);
    if (!offset) return ((code + delta) & 0xffff) !== 0;
    const glyph = view.getUint16(offsets + i * 2 + offset + (code - view.getUint16(starts + i * 2)) * 2);
    return glyph !== 0 && ((glyph + delta) & 0xffff) !== 0;
   }
  }
  return false;
 });
 return [...new Set([...text].filter(c => !/\s/.test(c) && !has(c.codePointAt(0)!)))];
}
