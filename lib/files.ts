// Browser-side file handling. CV files are read here and never sent to the server.

export const MAX_FILE_BYTES = 8 * 1024 * 1024;

export async function extractCvText(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) throw new Error('Choose a file smaller than 8 MB.');
  const buffer = await file.arrayBuffer();
  let text = '';
  if (/\.docx$/i.test(file.name)) {
    const mammoth = await import('mammoth');
    text = (await mammoth.extractRawText({arrayBuffer: buffer})).value;
  } else if (/\.pdf$/i.test(file.name)) {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    const pdf = await pdfjs.getDocument({data: new Uint8Array(buffer)}).promise;
    if (pdf.numPages > 20) throw new Error('Please upload a CV with 20 pages or fewer.');
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      for (const item of content.items) {
        if ('str' in item) text += item.str + ('hasEOL' in item && item.hasEOL ? '\n' : ' ');
      }
      text += '\n';
    }
  } else {
    throw new Error('Please upload a PDF or DOCX file.');
  }
  if (text.trim().length < 40) throw new Error('No readable text found. For scanned PDFs, paste your CV text below.');
  return text.slice(0, 30000);
}

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadCv(format: 'docx' | 'pdf', text: string) {
  if (format === 'docx') {
    const {Document, Packer, Paragraph, TextRun} = await import('docx');
    const doc = new Document({
      sections: [{children: text.split('\n').map((line) => new Paragraph({children: [new TextRun({text: line, font: 'Arial', size: 22})], spacing: {after: 100}}))}],
    });
    save(await Packer.toBlob(doc), 'tailored-cv.docx');
    return;
  }
  const {jsPDF} = await import('jspdf');
  const pdf = new jsPDF();
  pdf.setFont('helvetica');
  pdf.setFontSize(11);
  let y = 20;
  for (const line of text.split('\n')) {
    for (const wrapped of pdf.splitTextToSize(line.replace(/•/g, '-').replace(/[–—]/g, '-'), 170)) {
      if (y > 275) {
        pdf.addPage();
        y = 20;
      }
      pdf.text(wrapped, 20, y);
      y += 5.5;
    }
    y += 2;
  }
  save(pdf.output('blob'), 'tailored-cv.pdf');
}
