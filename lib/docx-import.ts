import { strFromU8, unzipSync } from "fflate";
const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const MAX_XML = 2_000_000;
const MAX_TEXT = 30_000;
export function extractDocx(
  buffer: ArrayBuffer,
  parseXml: (source: string) => Document = (source) =>
    new DOMParser().parseFromString(source, "application/xml"),
): string {
  let total = 0;
  const parts = unzipSync(new Uint8Array(buffer), {
    filter: (file) => {
      if (!/^word\/(?:document|header\d+|footer\d+)\.xml$/.test(file.name))
        return false;
      total += file.originalSize;
      if (total > MAX_XML)
        throw Error(
          "This document contains too much expanded content. Paste a shorter CV instead.",
        );
      return true;
    },
  });
  if (!parts["word/document.xml"])
    throw Error(
      "This file is not a readable DOCX document. Paste your CV text instead.",
    );
  const names = Object.keys(parts).sort((a, b) => {
    const order = (s: string) =>
      s.includes("/header") ? 0 : s.includes("/document") ? 1 : 2;
    return order(a) - order(b) || a.localeCompare(b);
  });
  const output: string[] = [];
  let length = 0;
  function textOf(node: Node): string {
    if (node.nodeType !== 1) return "";
    const element = node as Element;
    if (element.namespaceURI === WORD_NS) {
      if (element.localName === "del" || element.localName === "instrText")
        return "";
      if (element.localName === "t") return element.textContent ?? "";
      if (element.localName === "tab") return "\t";
      if (element.localName === "br" || element.localName === "cr") return "\n";
    }
    return Array.from(node.childNodes).map(textOf).join("");
  }
  for (const name of names) {
    const source = strFromU8(parts[name]);
    if (/<!DOCTYPE|<!ENTITY/i.test(source))
      throw Error(
        "This DOCX contains unsupported XML declarations. Paste the CV text instead.",
      );
    const xml = parseXml(source);
    if (xml.getElementsByTagName("parsererror").length)
      throw Error("The DOCX text is damaged. Paste the CV text instead.");
    for (const p of Array.from(xml.getElementsByTagNameNS(WORD_NS, "p"))) {
      let text = textOf(p).trim();
      if (!text) continue;
      // Word numbering is stored as paragraph properties, not literal characters.
      if (
        p.getElementsByTagNameNS(WORD_NS, "numPr").length &&
        !/^[•*\-–▪◦]\s/.test(text)
      )
        text = "• " + text;
      length += text.length + 1;
      if (length > MAX_TEXT)
        throw Error(
          "This CV exceeds 30,000 characters. Paste a shorter version instead.",
        );
      output.push(text);
    }
  }
  return output.join("\n");
}
