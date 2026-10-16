// Finds the achievement and duty lines of a CV without relying on bullet markers. PDF and DOCX extraction
// often loses them, and plenty of CVs never used them.

import {startsWithAction} from './verbs.ts';

const MARKER = /^\s*[•*·▪●◦-]\s+/;
const DATE_OR_PIPE = /\|/;
const WORK_SECTION = /\b(experience|employment|work history|career|projects?|volunteer\w*|achievements?|responsibilities|positions?)\b/i;
const KNOWN_HEADING = /^(?:profile|summary|personal statement|about me|objective|experience|work experience|professional experience|employment(?: history)?|education|qualifications|skills|key skills|technical skills|projects?|volunteer(?:ing)?(?: experience)?|certifications?|interests|references|languages|awards|publications|training)$/i;

export function hasMarker(line: string): boolean {
  return MARKER.test(line);
}

export function isHeading(line: string): boolean {
  const text = line.trim().replace(/:$/, '');
  if (!text || MARKER.test(line)) return false;
  if (KNOWN_HEADING.test(text)) return true;
  const words = text.split(/\s+/);
  return words.length <= 4 && /[A-Z]/.test(text) && text === text.toUpperCase() && !/[|@\d]/.test(text);
}

/**
 * For each line, true when it is an item a rewrite or reorder can safely act on. A line with a bullet marker
 * counts. A line without one counts when it sits under an experience-like heading and either starts with an
 * action verb or is a full sentence. Job title lines (with a pipe, or a short line carrying a year) do not.
 */
export function itemLines(lines: string[]): boolean[] {
  let inWork = false;
  return lines.map((line) => {
    if (!line.trim()) return false;
    if (isHeading(line)) {
      inWork = WORK_SECTION.test(line);
      return false;
    }
    if (MARKER.test(line)) return true;
    if (!inWork || DATE_OR_PIPE.test(line)) return false;
    const words = line.trim().split(/\s+/).length;
    if (words < 5) return false;
    const hasYear = /\b(19|20)\d{2}\b/.test(line);
    if (startsWithAction(line)) return true;
    return /[.!]$/.test(line.trim()) && words >= 8 && !(hasYear && words < 12);
  });
}
