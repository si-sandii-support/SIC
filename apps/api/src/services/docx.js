import { Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType } from "docx";

export async function buildDocx(blocks, title, layoutMode = "vertical") {
  const source = blocks || [];
  const children = [];
  if (layoutMode === "horizontal") {
    // Use a two-column Word table as a stable side-by-side layout. Each source
    // block stays independent inside its own cell and rows are kept together.
    for (let i = 0; i < source.length; i += 2) {
      const pair = source.slice(i, i + 2);
      const cellWidth = Math.floor(10106 / pair.length);
      const row = new TableRow({
        cantSplit: true,
        children: pair.map((block) => new TableCell({
          width: { size: cellWidth, type: WidthType.DXA },
          margins: { top: 100, bottom: 100, left: 120, right: 120 },
          children: [...childrenForBlock(block, 260, 620), new Paragraph({ children: [new TextRun("")] })],
        })),
      });
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnWidths: pair.map(() => cellWidth),
        rows: [row],
      }));
      children.push(new Paragraph({ children: [new TextRun("")], spacing: { after: 120 } }));
    }
  } else {
    for (const block of source) children.push(...childrenForBlock(block, 560, 650));
  }
  if (!children.length) children.push(new Paragraph({ children: [new TextRun("")] }));
  const data = await Packer.toBuffer(new Document({
    creator: "SIC",
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 900, right: 900, bottom: 900, left: 900, header: 450, footer: 450 } } },
      children,
    }],
  }));
  return { buffer: data, filename: `${safe(title)}.docx`, mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
}

function childrenForBlock(b, maxImageWidth = 560, maxImageHeight = 650) {
  const children = [];
  const html = b?.visual?.kind === "html" ? b.visual.html : "";
  if (html) {
    appendHtml(children, html, maxImageWidth, maxImageHeight, b?.style || {});
    if (!children.length && b?.text) appendTextParagraphs(children, b.text, b?.style || {});
    return children.length ? children : [new Paragraph({ children: [new TextRun("")] })];
  }
  if ((b?.visual?.kind === "image" || b?.visual?.kind === "pdf-selection") && b.visual.dataUrl) {
    const image = dataUrlBuffer(b.visual.dataUrl);
    if (image) children.push(new Paragraph({ keepLines: true, widowControl: true, spacing: { before: 120, after: 160 }, children: [new ImageRun({ data: image.buffer, transformation: fitImage(image.width, image.height, maxImageWidth, maxImageHeight) })] }));
    return children.length ? children : [new Paragraph({ children: [new TextRun("")] })];
  }
  const text = cleanText(b?.text);
  if (text) appendTextParagraphs(children, text, b?.style || {});
  return children.length ? children : [new Paragraph({ children: [new TextRun("")] })];
}

function appendHtml(children, html, maxImageWidth = 560, maxImageHeight = 650, style = {}) {
  const source = String(html || "");
  // Walk tables and images in document order so inline images are not lost
  // when they appear before or between tables.
  const token = /<table\b[\s\S]*?<\/table>|<img\b[^>]*src=["']([^"']+)["'][^>]*>/gi;
  let cursor = 0;
  for (const match of source.matchAll(token)) {
    appendTextParagraphs(children, htmlText(source.slice(cursor, match.index)), style);
    if (/^<table/i.test(match[0])) {
      const rows = parseTable(match[0]);
      if (rows.length) {
        const columnCount = Math.max(1, ...rows.map((row) => row.length));
        const tableWidth = 9360; // A4 page width minus 1-inch margins, in DXA.
        const base = Math.floor(tableWidth / columnCount);
        const widths = Array.from({ length: columnCount }, (_, i) => i === columnCount - 1 ? tableWidth - base * (columnCount - 1) : base);
        children.push(new Table({
          width: { size: tableWidth, type: WidthType.DXA },
          columnWidths: widths,
          layout: "fixed",
          rows: rows.map((row) => new TableRow({
            cantSplit: true,
            children: Array.from({ length: columnCount }, (_, index) => {
              const cell = row[index] || { text: "", align: "left" };
              return new TableCell({
                width: { size: widths[index], type: WidthType.DXA },
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                children: [new Paragraph({
                  keepLines: true,
                  alignment: cell.align,
                  children: [new TextRun(cleanText(cell.text))],
                })],
              });
            }),
          })),
        }));
      }
    } else {
      const image = dataUrlBuffer(match[1]);
      if (image) children.push(new Paragraph({ keepLines: true, widowControl: true, spacing: { before: 120, after: 160 }, children: [new ImageRun({ data: image.buffer, transformation: fitImage(image.width, image.height, maxImageWidth, maxImageHeight) })] }));
    }
    cursor = match.index + match[0].length;
  }
  appendTextParagraphs(children, htmlText(source.slice(cursor)), style);
}

function appendTextParagraphs(children, text, style = {}) {
  const clean = cleanText(text);
  if (!clean) return;
  const align = ["left", "center", "right", "justify"].includes(style.textAlign) ? style.textAlign : "left";
  const fontSize = Math.max(6, Math.min(72, style.fontSize ? Number(style.fontSize) * 0.75 : 11));
  const fontFamily = safeFont(style.fontFamily);
  const lineHeight = Math.max(0.7, Math.min(3, Number(style.lineHeight) || 1.25));
  const letterSpacing = Math.max(-2, Math.min(10, Number(style.letterSpacing) || 0));
  clean.split(/\n+/).forEach((line) => {
    const value = line.replace(/^[\t ]+|[\t ]+$/g, "");
    if (value) children.push(new Paragraph({
      keepLines: true, widowControl: true, alignment: align,
      spacing: { after: 100, line: Math.round(fontSize * 20 * lineHeight) },
      children: [new TextRun({ text: value, font: fontFamily, size: Math.round(fontSize * 2), bold: Number(style.fontWeight) >= 600, italics: style.fontStyle === "italic", characterSpacing: Math.round(letterSpacing * 20) })],
    }));
  });
}
function safeFont(value) {
  const font = String(value || "Arial").split(",")[0].replace(/[\"']/g, "").trim();
  return ["Arial", "Georgia", "Times New Roman", "Verdana", "Courier New", "Calibri", "Aptos"].includes(font) ? font : "Arial";
}
function htmlText(html) { return decode(String(html || "").replace(/<br\s*\/?>/gi, "\n").replace(/<hr\b[^>]*>/gi, "\n────────────\n").replace(/<[^>]+>/g, " ")).replace(/\u00a0/g, " "); }
function parseTable(html) {
  return [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => [...m[1].matchAll(/<(td|th)\b([^>]*)>([\s\S]*?)<\/\1>/gi)].map((c) => {
    const attr = c[2] || "";
    const style = (attr.match(/style=["']([^"']*)["']/i)?.[1] || "").toLowerCase();
    const align = (attr.match(/\balign=["']?(left|center|right|justify)/i)?.[1] || style.match(/text-align\s*:\s*(left|center|right|justify)/)?.[1] || (c[1].toLowerCase() === "th" ? "center" : "left")).toLowerCase();
    return { text: htmlText(c[3]).trim(), align };
  }));
}
function dataUrlBuffer(src) { const m = String(src || "").match(/^data:([^;,]+)?;base64,(.+)$/s); if (!m) return null; try { const buffer = Buffer.from(m[2], "base64"); const size = sniffImage(buffer); return { buffer, width: size.width, height: size.height }; } catch { return null; } }
function sniffImage(buffer) { if (buffer[0] === 0x89 && buffer[1] === 0x50) return pngSize(buffer); if (buffer[0] === 0xff && buffer[1] === 0xd8) return jpegSize(buffer); return { width: 800, height: 500 }; }
function pngSize(b) { return { width: b.readUInt32BE(16) || 800, height: b.readUInt32BE(20) || 500 }; }
function jpegSize(b) { let i = 2; while (i + 9 < b.length) { if (b[i] !== 0xff) { i += 1; continue; } const marker = b[i + 1]; const len = b.readUInt16BE(i + 2); if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) return { width: b.readUInt16BE(i + 7), height: b.readUInt16BE(i + 5) }; i += 2 + len; } return { width: 800, height: 500 }; }
function fitImage(width, height, maxW, maxH) { const scale = Math.min(maxW / Math.max(1, width), maxH / Math.max(1, height), 1); return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }; }
function decode(v) { return String(v).replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'"); }
function cleanText(value) { return String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/\uFFFD/g, ""); }
function safe(s) { return String(s || "").replace(/[^a-z0-9-_ ]/gi, "").trim().replace(/\s+/g, "_") || "selected_content"; }
