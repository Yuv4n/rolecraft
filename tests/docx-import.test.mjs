import assert from "node:assert/strict";
import { DOMParser } from "@xmldom/xmldom";
import { zipSync, strToU8 } from "fflate";
import { extractDocx } from "../lib/docx-import.ts";
import { tailor } from "../lib/engine.ts";
const ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const xml = (body) =>
  `<w:document xmlns:w="${ns}"><w:body>${body}</w:body></w:document>`;
const paragraph = (text) => `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`;
const list = (text) =>
  `<w:p><w:pPr><w:numPr><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>${text}</w:t></w:r></w:p>`;
const zip = (parts) => {
  const bytes = zipSync(
    Object.fromEntries(
      Object.entries(parts).map(([name, text]) => [name, strToU8(text)]),
    ),
  );
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
};
const parse = (source) =>
  new DOMParser().parseFromString(source, "application/xml");
const buffer = zip({
  "word/document.xml": xml(
    paragraph("EXPERIENCE") +
      list("Built Python tools") +
      list("Built SQL dashboards"),
  ),
  "word/header1.xml": xml(paragraph("José Müller")),
  "word/footer1.xml": xml(paragraph("Contact: hello@example.com")),
  "ignored.txt": "Ignored content",
});
const text = extractDocx(buffer, parse);
assert.equal(
  text,
  "José Müller\nEXPERIENCE\n• Built Python tools\n• Built SQL dashboards\nContact: hello@example.com",
);
assert(!text.includes("Ignored content"));
assert(text.includes("• Built SQL dashboards"));
const extracted = extractDocx(
  zip({
    "word/document.xml": xml(
      paragraph("EXPERIENCE") +
        list("Built Python tools") +
        list("Built SQL dashboards"),
    ),
  }),
  parse,
);
assert(
  tailor(extracted, "SQL").indexOf("Built SQL") <
    tailor(extracted, "SQL").indexOf("Built Python"),
);
assert.throws(
  () => extractDocx(zip({ "other.xml": "no document" }), parse),
  /not a readable DOCX/,
);
assert.throws(
  () =>
    extractDocx(
      zip({ "word/document.xml": xml(paragraph("a".repeat(30001))) }),
      parse,
    ),
  /30,000/,
);
assert.throws(
  () =>
    extractDocx(
      zip({ "word/document.xml": xml(paragraph("a".repeat(2000001))) }),
      parse,
    ),
  /expanded content/,
);
assert.throws(
  () =>
    extractDocx(
      zip({ "word/document.xml": "<!DOCTYPE test>" + xml("") }),
      parse,
    ),
  /XML declarations/,
);
const tracked = extractDocx(
  zip({
    "word/document.xml": xml(
      "<w:p><w:del><w:r><w:t>Deleted claim</w:t></w:r></w:del><w:r><w:t>Current claim</w:t></w:r></w:p>",
    ),
  }),
  parse,
);
assert.equal(tracked, "Current claim");
console.log(
  "PASS: DOCX lists, headers, footers, tracked deletions and expanded-content limits",
);

const { Document: WordDocument, Packer, Paragraph } = await import("docx");
const realDocument = new WordDocument({
  sections: [
    {
      children: [
        new Paragraph("EXPERIENCE"),
        new Paragraph({
          text: "Built SQL dashboards for reporting teams.",
          bullet: { level: 0 },
        }),
      ],
    },
  ],
});
const realBuffer = await Packer.toBuffer(realDocument);
const realText = extractDocx(
  realBuffer.buffer.slice(
    realBuffer.byteOffset,
    realBuffer.byteOffset + realBuffer.byteLength,
  ),
  parse,
);
assert(realText.includes("• Built SQL dashboards for reporting teams."));
console.log(
  "PASS: generated Word document round-trip retains real list numbering",
);
