// Browser-side document reading. Nothing here sends CV content anywhere.

export const MAX_BYTES = 8 * 1024 * 1024;

export async function extractCvText(file: File): Promise<string> {
  if (file.size > MAX_BYTES) throw new Error('Choose a file smaller than 8 MB.');
  const buffer = await file.arrayBuffer();
  let text = '';
  if (/\.docx$/i.test(file.name)) {
    const mammoth = await import('mammoth');
    text = (await mammoth.extractRawText({ arrayBuffer: buffer })).value;
  } else if (/\.pdf$/i.test(file.name)) {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
    if (pdf.numPages > 20) throw new Error('Please upload a CV with 20 pages or fewer.');
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      for (const item of content.items) {
        if ('str' in item) text += item.str + ('hasEOL' in item && item.hasEOL ? '\n' : ' ');
      }
      text += '\n';
    }
  } else if (/\.(txt|md)$/i.test(file.name)) {
    text = new TextDecoder().decode(buffer);
  } else throw new Error('Please upload a PDF, DOCX or text file.');
  if (text.trim().length < 40) throw new Error('No readable text found. For scanned PDFs, paste your CV text instead.');
  return text.slice(0, 30000);
}

export async function fetchJobText(url: string): Promise<string> {
  const r = await fetch('/api/job', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
  const d = (await r.json()) as { error?: string; text?: string };
  if (!r.ok || !d.text) throw new Error(d.error || 'Could not read the URL. Paste the description instead.');
  return d.text;
}

export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
