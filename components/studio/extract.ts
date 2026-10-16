// Browser-side document reading. Nothing here sends CV content anywhere.

export const MAX_BYTES = 8 * 1024 * 1024;

export async function extractCvText(file: File): Promise<string> {
  if (file.size > MAX_BYTES) throw new Error('Choose a file smaller than 8 MB.');
  const buffer = await file.arrayBuffer();
  let text = '';
  if (/\.docx$/i.test(file.name)) {
    const { extractDocx } = await import('../../lib/docx-import');
    text = extractDocx(buffer);
  } else if (/\.pdf$/i.test(file.name)) {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    const task = pdfjs.getDocument({ data: new Uint8Array(buffer) });
    try {
      const pdf = await task.promise;
      if (pdf.numPages > 20) throw new Error('Please upload a CV with 20 pages or fewer.');
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        for (const item of content.items) {
          if ('str' in item) text += item.str + ('hasEOL' in item && item.hasEOL ? '\n' : ' ');
        }
        text += '\n';
      }
    } finally {
      await task.destroy();
    }
  } else if (/\.(txt|md)$/i.test(file.name)) {
    text = new TextDecoder().decode(buffer);
  } else throw new Error('Please upload a PDF, DOCX or text file.');
  if (text.trim().length < 40) throw new Error('No readable text found. For scanned PDFs, paste your CV text instead.');
  if (text.length > 30000) throw new Error('This CV exceeds 30,000 characters. Paste a shorter version instead.');
  return text;
}

export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
