// Data model for a CV.
//
// Content (what the CV says) and layout (how it looks) are stored apart and
// linked only by node ids. Content holds a flat map of nodes plus each node's
// parent. Layout holds sibling order, typography, spacing, alignment, columns
// and page breaks. Either side can change without touching the other.

export const ROOT = 'root';

export type NodeType = 'section' | 'name' | 'headline' | 'contact' | 'entry' | 'bullet' | 'paragraph' | 'skills';
export type SectionKind = 'header' | 'summary' | 'experience' | 'education' | 'skills' | 'projects' | 'other';

export interface ContentNode {
  id: string;
  type: NodeType;
  /** Id of the owning node, or ROOT for sections. */
  parent: string;
  /** Display text. Unused when `parts` is present. */
  text: string;
  /** Segments of an entry or contact line, joined by the layout separator. */
  parts?: string[];
  /** Only for sections. */
  kind?: SectionKind;
}

export interface Content {
  nodes: Record<string, ContentNode>;
  /** Counter used to mint new node ids. */
  seq: number;
}

export type Role = 'name' | 'headline' | 'contact' | 'sectionTitle' | 'entry' | 'bullet' | 'paragraph' | 'skills';

export interface TextStyle {
  font: 'sans' | 'serif';
  /** Points. */
  size: number;
  bold: boolean;
  italic: boolean;
  color: string;
  align: 'left' | 'center' | 'right' | 'justify';
  /** Points. */
  spaceBefore: number;
  spaceAfter: number;
  /** Multiplier of the font size. */
  lineHeight: number;
  /** Left indent in millimetres. */
  indent: number;
  uppercase: boolean;
  bulletGlyph: string;
  separator: string;
}

export interface NodeLayout extends Partial<TextStyle> {
  pageBreakBefore?: boolean;
  columnBreakBefore?: boolean;
  /** Hides the node from preview and export without deleting its content. */
  hidden?: boolean;
}

export interface PageSetup {
  size: 'A4' | 'Letter';
  /** Millimetres. */
  margins: { top: number; right: number; bottom: number; left: number };
  columns: 1 | 2;
  /** Millimetres. */
  columnGap: number;
}

export interface Layout {
  page: PageSetup;
  styles: Record<Role, TextStyle>;
  /** Child order keyed by parent id (ROOT for sections). */
  order: Record<string, string[]>;
  overrides: Record<string, NodeLayout>;
}

export interface Snapshot {
  content: Content;
  layout: Layout;
}

export type Change =
  | { kind: 'text'; id: string; nodeId: string; before: string; after: string; beforeParts?: string[]; afterParts?: string[]; reason: string; userSupplied?: boolean }
  | { kind: 'order'; id: string; parentId: string; before: string[]; after: string[]; reason: string }
  | { kind: 'layout'; id: string; patches: { nodeId: string; before: NodeLayout; after: NodeLayout }[]; page?: { before: PageSetup; after: PageSetup }; styles?: { role: Role; before: Partial<TextStyle>; after: Partial<TextStyle> }[]; reason: string }
  | { kind: 'add'; id: string; parentId: string; afterId?: string; text: string; glyph?: string; section?: { title: string; kind: SectionKind }; reason: string; userSupplied?: boolean }
  | { kind: 'batch'; id: string; changes: Change[]; reason: string };

export type Decision = 'accepted' | 'rejected';

export interface CvVersion {
  id: string;
  label: string;
  createdAt: number;
  parentId: string | null;
  origin: 'import' | 'fork' | 'edit' | 'accepted-changes' | 'restore';
  note: string;
  snapshot: Snapshot;
}

export interface Variant {
  id: string;
  name: string;
  /** Linked saved role, or null for the general CV. */
  roleId: string | null;
  headId: string;
  /** Version ids, oldest first. */
  history: string[];
  /** Head plus uncommitted manual edits. */
  working: Snapshot;
  staged: Record<string, { decision: Decision; change: Change }>;
}

export interface SavedRole {
  id: string;
  name: string;
  text: string;
  url?: string;
}

export interface Workspace {
  schema: 1;
  originalText: string;
  fileName: string;
  /** The untouched import. Never rewritten. */
  originalVersionId: string;
  versions: Record<string, CvVersion>;
  variants: Record<string, Variant>;
  variantOrder: string[];
  activeVariantId: string;
  roles: Record<string, SavedRole>;
  roleOrder: string[];
  seq: number;
}
