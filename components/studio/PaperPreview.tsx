"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Fragment } from "react";
import type { Snapshot } from "../../lib/cv/types";
import { renderBlocks } from "../../lib/cv/render";
import { diffSnapshots } from "../../lib/cv/ops";
import { exportPdf, pageSize } from "../../lib/cv/export";

const fonts = {
  sans: "Arial, Helvetica, sans-serif",
  serif: '"Times New Roman", Times, serif',
} as const;
const PX_PER_MM = 96 / 25.4;

/** The document drawn from the same resolved blocks the exports use. */
export function PaperPreview({
  snap,
  base,
  peekIds,
  onSelect,
}: {
  snap: Snapshot;
  base?: Snapshot;
  peekIds?: Set<string>;
  onSelect?: (nodeId: string) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const dims = pageSize[snap.layout.page.size];
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const update = () =>
      setScale(Math.min(1, el.clientWidth / (dims.w * PX_PER_MM)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [dims.w]);

  const blocks = useMemo(() => renderBlocks(snap), [snap]);
  const changed = useMemo(
    () =>
      base
        ? new Set(diffSnapshots(base, snap).map((d) => d.nodeId))
        : new Set<string>(),
    [base, snap],
  );
  const { page } = snap.layout;
  const paper: CSSProperties = {
    width: `${dims.w}mm`,
    minHeight: `${dims.h}mm`,
    padding: `${page.margins.top}mm ${page.margins.right}mm ${page.margins.bottom}mm ${page.margins.left}mm`,
    columnCount: page.columns,
    columnGap: `${page.columnGap}mm`,
    zoom: scale,
  };
  return (
    <div className="paper-wrap" ref={wrap}>
      <div className="paper" style={paper} aria-label="CV preview">
        {blocks.map((b) => {
          const s = b.style;
          const style: CSSProperties = {
            fontFamily: fonts[s.font],
            fontSize: `${s.size}pt`,
            fontWeight: s.bold ? 700 : 400,
            fontStyle: s.italic ? "italic" : "normal",
            color: s.color,
            textAlign: s.align,
            marginTop: `${s.spaceBefore}pt`,
            marginBottom: `${s.spaceAfter}pt`,
            lineHeight: s.lineHeight,
            paddingLeft: `${s.indent}mm`,
            textIndent: b.prefix ? "-3.5mm" : undefined,
            breakBefore: b.columnBreakBefore ? "column" : undefined,
            breakInside: "avoid",
          };
          const cls = [
            "pv-block",
            changed.has(b.nodeId) ? "changed" : "",
            peekIds?.has(b.nodeId) ? "peek" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <Fragment key={b.nodeId}>
              {b.pageBreakBefore && (
                <div className="pv-pagebreak" aria-hidden>
                  page break
                </div>
              )}
              <div
                className={cls}
                style={style}
                onClick={() => onSelect?.(b.nodeId)}
                data-node={b.nodeId}
              >
                {b.prefix ? (
                  <span className="pv-glyph">{b.prefix}&nbsp;</span>
                ) : null}
                {b.text || " "}
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

/** The real exported PDF, shown in a frame. Slower than the live preview and exact about pagination. */
export function PdfPreview({ snap }: { snap: Snapshot }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let current: string | null = null;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const blob = await exportPdf(snap);
        if (cancelled) return;
        current = URL.createObjectURL(blob);
        setUrl(current);
        setError("");
      } catch {
        if (!cancelled) setError("The PDF preview could not be built.");
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
      if (current) URL.revokeObjectURL(current);
    };
  }, [snap]);
  if (error)
    return (
      <p role="alert" className="error-text">
        {error}
      </p>
    );
  if (!url) return <p className="muted">Building the PDF…</p>;
  return (
    <div className="pdf-frame">
      <iframe title="PDF preview" src={url} />
      <a className="link" href={url} target="_blank" rel="noreferrer">
        Open in a new tab if the preview is blank
      </a>
    </div>
  );
}
