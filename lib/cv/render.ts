import type {
  ContentNode,
  Layout,
  NodeLayout,
  Role,
  Snapshot,
  TextStyle,
} from "./types.ts";
import { ROOT } from "./types.ts";

export interface RenderBlock {
  nodeId: string;
  type: ContentNode["type"];
  role: Role;
  /** Final display text with uppercase and separators applied, without bullet glyph. */
  text: string;
  /** Bullet glyph, empty for other blocks. */
  prefix: string;
  style: TextStyle;
  pageBreakBefore: boolean;
  columnBreakBefore: boolean;
}

const roleOf: Record<ContentNode["type"], Role> = {
  section: "sectionTitle",
  name: "name",
  headline: "headline",
  contact: "contact",
  entry: "entry",
  bullet: "bullet",
  paragraph: "paragraph",
  skills: "skills",
};

export function styleFor(layout: Layout, node: ContentNode): TextStyle {
  const base = layout.styles[roleOf[node.type]];
  const o = layout.overrides[node.id];
  if (!o) return base;
  const merged: TextStyle = { ...base };
  for (const key of Object.keys(base) as (keyof TextStyle)[]) {
    const v = o[key];
    if (v !== undefined)
      (merged as unknown as Record<string, unknown>)[key] = v;
  }
  return merged;
}

export function nodeText(node: ContentNode, layout: Layout): string {
  return node.parts
    ? node.parts.filter(Boolean).join(styleFor(layout, node).separator)
    : node.text;
}

export function children(snap: Snapshot, parentId: string): ContentNode[] {
  return (snap.layout.order[parentId] ?? [])
    .map((id) => snap.content.nodes[id])
    .filter(Boolean);
}

export function sections(snap: Snapshot): ContentNode[] {
  return children(snap, ROOT).filter((n) => n.type === "section");
}

/** Walks the document in reading order and resolves every style. */
export function renderBlocks(snap: Snapshot): RenderBlock[] {
  const out: RenderBlock[] = [];
  const visit = (node: ContentNode, skipTitle = false) => {
    const override: NodeLayout = snap.layout.overrides[node.id] ?? {};
    if (override.hidden && node.type !== "section") return;
    const style = styleFor(snap.layout, node);
    const showSelf = !(
      node.type === "section" &&
      (override.hidden || skipTitle)
    );
    if (showSelf) {
      let text = nodeText(node, snap.layout);
      if (style.uppercase) text = text.toUpperCase();
      out.push({
        nodeId: node.id,
        type: node.type,
        role: roleOf[node.type],
        text,
        prefix: node.type === "bullet" ? style.bulletGlyph : "",
        style,
        pageBreakBefore: !!override.pageBreakBefore,
        columnBreakBefore: !!override.columnBreakBefore,
      });
    }
    for (const child of children(snap, node.id)) visit(child);
  };
  for (const section of sections(snap)) visit(section);
  return out;
}

/** Plain text in reading order. `normalise` forces the standard bullet so analysis sees one marker. */
export function renderText(snap: Snapshot, normalise = false): string {
  const lines: string[] = [];
  for (const b of renderBlocks(snap)) {
    if (b.role === "sectionTitle" && lines.length) lines.push("");
    lines.push(b.prefix ? `${normalise ? "•" : b.prefix} ${b.text}` : b.text);
  }
  return lines.join("\n");
}

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}
