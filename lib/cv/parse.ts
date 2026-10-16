import type { Content, ContentNode, Layout, NodeLayout, NodeType, Role, SectionKind, Snapshot, TextStyle } from './types.ts';
import { ROOT } from './types.ts';

const baseStyle: TextStyle = {
  font: 'sans', size: 10.5, bold: false, italic: false, color: '#111111', align: 'left',
  spaceBefore: 0, spaceAfter: 2, lineHeight: 1.25, indent: 0, uppercase: false, bulletGlyph: '•', separator: ' | ',
};

export function defaultStyles(): Record<Role, TextStyle> {
  const s = (patch: Partial<TextStyle>): TextStyle => ({ ...baseStyle, ...patch });
  return {
    name: s({ size: 20, bold: true, spaceAfter: 2 }),
    headline: s({ size: 11.5, color: '#333333', spaceAfter: 2 }),
    contact: s({ size: 9.5, color: '#333333', spaceAfter: 6 }),
    sectionTitle: s({ size: 11, bold: true, color: '#1b3a32', spaceBefore: 12, spaceAfter: 4 }),
    entry: s({ bold: true, spaceBefore: 6, spaceAfter: 2 }),
    bullet: s({ indent: 5, spaceAfter: 2 }),
    paragraph: s({ spaceAfter: 3 }),
    skills: s({ spaceAfter: 3 }),
  };
}

export function defaultLayout(): Layout {
  return {
    page: { size: 'A4', margins: { top: 20, right: 20, bottom: 20, left: 20 }, columns: 1, columnGap: 8 },
    styles: defaultStyles(),
    order: { [ROOT]: [] },
    overrides: {},
  };
}

const headingKinds: [SectionKind, RegExp][] = [
  ['summary', /^(profile|summary|professional summary|personal statement|personal profile|about( me)?|objective|career objective)$/i],
  ['experience', /^(experience|work experience|professional experience|employment( history)?|work history|career history|relevant experience)$/i],
  ['education', /^(education|academic background|qualifications|education (and|&) training)$/i],
  ['skills', /^(skills|technical skills|key skills|core skills|skills (and|&) strengths|skills (and|&) tools|competencies)$/i],
  ['projects', /^(projects|selected projects|personal projects)$/i],
];
const otherHeading = /^(certifications?|awards?|languages|interests|volunteering|volunteer experience|publications|references|achievements|courses|additional information)$/i;
const bulletMarker = /^\s*([•*\-–▪●◦·])\s+/;

export function headingKind(title: string): SectionKind | null {
  const t = title.trim().replace(/:$/, '');
  for (const [kind, re] of headingKinds) if (re.test(t)) return kind;
  return otherHeading.test(t) ? 'other' : null;
}

function isAllCaps(line: string): boolean {
  const letters = line.replace(/[^A-Za-z]/g, '');
  return letters.length >= 3 && letters === letters.toUpperCase();
}

export function titleCase(text: string): string {
  const small = new Set(['and', 'of', 'the', 'for', 'to', 'in']);
  return text
    .toLowerCase()
    .split(/(\s+)/)
    .map((w, i) => (/^\s+$/.test(w) || (i > 0 && small.has(w)) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join('');
}

function looksLikeContact(line: string): boolean {
  return /@|https?:\/\/|linkedin\.|github\.|\+?\d[\d\s().-]{7,}\d/i.test(line) || line.includes(' | ');
}

function splitParts(line: string): string[] {
  return line.split(/\s+\|\s+/).map((p) => p.trim()).filter(Boolean);
}

/** Parses plain CV text into structured content plus an inferred layout. */
export function parseCv(text: string): Snapshot {
  const nodes: Record<string, ContentNode> = {};
  const layout = defaultLayout();
  let seq = 0;
  const add = (type: NodeType, parent: string, body: Partial<ContentNode>, override?: NodeLayout): ContentNode => {
    const id = `n${++seq}`;
    const node: ContentNode = { id, type, parent, text: '', ...body };
    nodes[id] = node;
    (layout.order[parent] ||= []).push(id);
    if (override && Object.keys(override).length) layout.overrides[id] = override;
    return node;
  };

  const lines = text.replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/\s+$/, ''));
  let section = add('section', ROOT, { kind: 'header', text: '' }, { hidden: true });
  let entry: ContentNode | null = null;
  let last: ContentNode | null = null;
  let seenFirst = false;
  let headerLine = 0;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const isFirst = !seenFirst;
    seenFirst = true;

    const heading = !isFirst || section.kind !== 'header' ? headingKind(line) : null;
    const capsHeading = !isFirst && !bulletMarker.test(raw) && isAllCaps(line) && line.length <= 40 && line.split(/\s+/).length <= 5 && !/[\d@|]/.test(line);
    if (heading || capsHeading) {
      const title = line.replace(/:$/, '');
      section = add('section', ROOT, { kind: heading ?? 'other', text: titleCase(title) }, isAllCaps(title) ? { uppercase: true } : undefined);
      entry = null;
      last = null;
      continue;
    }

    if (section.kind === 'header') {
      headerLine++;
      if (headerLine === 1) last = add('name', section.id, { text: line });
      else if (headerLine === 2 && !looksLikeContact(line) && line.length < 80 && !bulletMarker.test(raw)) last = add('headline', section.id, { text: line });
      else if (looksLikeContact(line)) last = add('contact', section.id, { text: '', parts: splitParts(line) });
      else last = add('paragraph', section.id, { text: line });
      continue;
    }

    const marker = raw.match(bulletMarker);
    if (marker) {
      const glyph = marker[1];
      last = add('bullet', entry ? entry.id : section.id, { text: raw.replace(bulletMarker, '').trim() }, glyph === '•' ? undefined : { bulletGlyph: glyph });
      continue;
    }

    // Wrapped bullet text, typical of PDF extraction.
    if (last && last.type === 'bullet' && /^[a-z]/.test(line)) {
      last.text += ' ' + line;
      continue;
    }

    const parts = splitParts(line);
    const dated = /\b(19|20)\d{2}\b/.test(line) && line.length < 100 && ['experience', 'education', 'projects'].includes(section.kind ?? '');
    if (parts.length >= 2 || dated) {
      entry = add('entry', section.id, { text: '', parts: parts.length ? parts : [line] });
      last = entry;
      continue;
    }

    const type: NodeType = section.kind === 'skills' ? 'skills' : 'paragraph';
    last = add(type, entry ? entry.id : section.id, { text: line });
  }

  const content: Content = { nodes, seq };
  return { content, layout };
}
