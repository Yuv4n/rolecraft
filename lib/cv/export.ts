import type { Snapshot } from './types.ts';
import { renderBlocks } from './render.ts';
import type { RenderBlock } from './render.ts';

export const pageSize = { A4: { w: 210, h: 297 }, Letter: { w: 215.9, h: 279.4 } } as const;
export const PT_TO_MM = 25.4 / 72;

const pdfFont = { sans: 'helvetica', serif: 'times' } as const;
const docxFont = { sans: 'Arial', serif: 'Times New Roman' } as const;

/** Standard PDF fonts cover Latin-1 plus a few typographic marks. Anything else becomes a question mark. */
export function pdfSafe(text: string): string {
  return text.replace(/[^\x20-\x7E\xA0-\xFF–—‘’“”•…€]/g, '?');
}

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [17, 17, 17];
}

export async function exportPdf(snap: Snapshot): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const { page } = snap.layout;
  const dims = pageSize[page.size];
  const pdf = new jsPDF({ unit: 'mm', format: page.size === 'A4' ? 'a4' : 'letter' });
  const { margins: m } = page;
  const cols = page.columns;
  const colW = (dims.w - m.left - m.right - page.columnGap * (cols - 1)) / cols;
  const bottom = dims.h - m.bottom;
  let col = 0;
  let y = m.top;
  let atTop = true;

  const newPage = () => { pdf.addPage(); col = 0; y = m.top; atTop = true; };
  const nextColumn = () => { if (col + 1 < cols) { col++; y = m.top; atTop = true; } else newPage(); };
  const originX = () => m.left + col * (colW + page.columnGap);

  const draw = (b: RenderBlock) => {
    const s = b.style;
    if (b.pageBreakBefore && !(atTop && col === 0)) newPage();
    else if (b.columnBreakBefore && !atTop) nextColumn();
    pdf.setFont(pdfFont[s.font], s.bold && s.italic ? 'bolditalic' : s.bold ? 'bold' : s.italic ? 'italic' : 'normal');
    pdf.setFontSize(s.size);
    pdf.setTextColor(...hexToRgb(s.color));
    const lineH = s.size * s.lineHeight * PT_TO_MM;
    const before = atTop ? 0 : s.spaceBefore * PT_TO_MM;
    const wrapped: string[] = pdf.splitTextToSize(pdfSafe(b.text), Math.max(10, colW - s.indent));
    const needed = lineH * (b.role === 'sectionTitle' || b.role === 'entry' ? Math.min(wrapped.length + 1, 3) : 1);
    if (y + before + needed > bottom) nextColumn();
    else y += before;
    const x0 = originX();
    wrapped.forEach((line, i) => {
      if (y + lineH > bottom) nextColumn();
      const baseline = y + s.size * PT_TO_MM * 0.9;
      if (i === 0 && b.prefix) pdf.text(pdfSafe(b.prefix), x0 + Math.max(0, s.indent - 3.5), baseline);
      const left = x0 + s.indent;
      const width = colW - s.indent;
      if (s.align === 'center') pdf.text(line, left + width / 2, baseline, { align: 'center' });
      else if (s.align === 'right') pdf.text(line, left + width, baseline, { align: 'right' });
      else if (s.align === 'justify' && i < wrapped.length - 1) pdf.text(line, left, baseline, { align: 'justify', maxWidth: width });
      else pdf.text(line, left, baseline);
      y += lineH;
      atTop = false;
    });
    y += s.spaceAfter * PT_TO_MM;
  };

  for (const b of renderBlocks(snap)) draw(b);
  return pdf.output('blob');
}

export async function exportDocx(snap: Snapshot): Promise<Blob> {
  const d = await import('docx');
  const { page } = snap.layout;
  const dims = pageSize[page.size];
  const mm = d.convertMillimetersToTwip;
  const align = { left: d.AlignmentType.LEFT, center: d.AlignmentType.CENTER, right: d.AlignmentType.RIGHT, justify: d.AlignmentType.JUSTIFIED } as const;
  const paragraphs = renderBlocks(snap).map((b) => {
    const s = b.style;
    const run = new d.TextRun({ text: b.prefix ? `${b.prefix}\t${b.text}` : b.text, font: docxFont[s.font], size: Math.round(s.size * 2), bold: s.bold, italics: s.italic, color: s.color.replace('#', '') });
    return new d.Paragraph({
      children: b.columnBreakBefore ? [new d.ColumnBreak(), run] : [run],
      alignment: align[s.align],
      pageBreakBefore: b.pageBreakBefore,
      keepNext: b.role === 'sectionTitle' || b.role === 'entry',
      spacing: { before: Math.round(s.spaceBefore * 20), after: Math.round(s.spaceAfter * 20), line: Math.round(s.lineHeight * 240), lineRule: d.LineRuleType.AUTO },
      indent: b.prefix ? { left: mm(s.indent), hanging: mm(Math.min(3.5, s.indent)) } : { left: mm(s.indent) },
    });
  });
  const doc = new d.Document({
    sections: [{
      properties: {
        page: { size: { width: mm(dims.w), height: mm(dims.h) }, margin: { top: mm(page.margins.top), right: mm(page.margins.right), bottom: mm(page.margins.bottom), left: mm(page.margins.left) } },
        column: { count: page.columns, space: mm(page.columnGap) },
      },
      children: paragraphs,
    }],
  });
  return d.Packer.toBlob(doc);
}
