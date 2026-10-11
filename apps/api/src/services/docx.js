import { Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType } from "docx";

export async function buildDocx(blocks, title, layoutMode = "vertical") {
  const source = blocks || [];
  const children = [];
  if (layoutMode === "horizontal") {
    // Use a two-column Word table as a stable side-by-side layout. Each source
    // block stays independent inside its own cell and rows are kept together.
    for (let i = 0; i < source.length; i += 2) {
      const pair = source.slice(i, i + 2);
      const cellWidth = Math.floor(9360 / pair.length);
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
    appendHtml(children, html, maxImageWidth, maxImageHeight);
    if (!children.length && b?.text) appendTextParagraphs(children, b.text);
    return children.length ? children : [new Paragraph({ children: [new TextRun("")] })];
  }
  if (b?.visual?.kind === "image" && b.visual.dataUrl) {
    const image = dataUrlBuffer(b.visual.dataUrl);
    if (image) children.push(new Paragraph({ keepLines: true, widowControl: true, spacing: { before: 120, after: 160 }, children: [new ImageRun({ data: image.buffer, transformation: fitImage(image.width, image.height, maxImageWidth, maxImageHeight) })] }));
    return children.length ? children : [new Paragraph({ children: [new TextRun("")] })];
  }
  const text = cleanText(b?.text);
  if (text) appendTextParagraphs(children, text);
  return children.length ? children : [new Paragraph({ children: [new TextRun("")] })];
}

function appendHtml(children, html, maxImageWidth = 560, maxImageHeight = 650) {
  const source = String(html || "");
  const tableMatches = [...source.matchAll(/<table\b[\s\S]*?<\/table>/gi)];
  let cursor = 0;
  for (const match of tableMatches) {
    appendTextParagraphs(children, htmlText(source.slice(cursor, match.index)));
    const table = parseTable(match[0]);
    if (table.length) children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: table.map((row) => new TableRow({ cantSplit: true, children: row.map((cell) => new TableCell({ children: [new Paragraph({ keepLines: true, children: [new TextRun(cleanText(cell))] })] })) })) }));
    cursor = match.index + match[0].length;
  }
  const rest = source.slice(cursor);
  const images = [...rest.matchAll(/<img\b[^>]*src=["']([^"']+)["'][^>]*>/gi)];
  let pos = 0;
  for (const match of images) {
    appendTextParagraphs(children, htmlText(rest.slice(pos, match.index)));
    const image = dataUrlBuffer(match[1]);
    if (image) children.push(new Paragraph({ keepLines: true, widowControl: true, spacing: { before: 120, after: 160 }, children: [new ImageRun({ data: image.buffer, transformation: fitImage(image.width, image.height, maxImageWidth, maxImageHeight) })] }));
    pos = match.index + match[0].length;
  }
  appendTextParagraphs(children, htmlText(rest.slice(pos)));
}

function appendTextParagraphs(children, text) {
  const clean = cleanText(text);
  if (!clean) return;
  clean.split(/\n+/).forEach((line) => {
    const value = line.replace(/^[\t ]+|[\t ]+$/g, "");
    if (value) children.push(new Paragraph({ keepLines: true, widowControl: true, spacing: { after: 100 }, children: [new TextRun(value)] }));
  });
}
function htmlText(html) { return decode(String(html || "").replace(/<br\s*\/?>/gi, "\n").replace(/<hr\b[^>]*>/gi, "\n────────────\n").replace(/<[^>]+>/g, " ")).replace(/\u00a0/g, " "); }
function parseTable(html) { return [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => [...m[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => htmlText(c[1]).trim())); }
function dataUrlBuffer(src) { const m = String(src || "").match(/^data:([^;,]+)?;base64,(.+)$/s); if (!m) return null; try { const buffer = Buffer.from(m[2], "base64"); const size = sniffImage(buffer); return { buffer, width: size.width, height: size.height }; } catch { return null; } }
function sniffImage(buffer) { if (buffer[0] === 0x89 && buffer[1] === 0x50) return pngSize(buffer); if (buffer[0] === 0xff && buffer[1] === 0xd8) return jpegSize(buffer); return { width: 800, height: 500 }; }
function pngSize(b) { return { width: b.readUInt32BE(16) || 800, height: b.readUInt32BE(20) || 500 }; }
function jpegSize(b) { let i = 2; while (i + 9 < b.length) { if (b[i] !== 0xff) { i += 1; continue; } const marker = b[i + 1]; const len = b.readUInt16BE(i + 2); if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) return { width: b.readUInt16BE(i + 7), height: b.readUInt16BE(i + 5) }; i += 2 + len; } return { width: 800, height: 500 }; }
function fitImage(width, height, maxW, maxH) { const scale = Math.min(maxW / Math.max(1, width), maxH / Math.max(1, height), 1); return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }; }
function decode(v) { return String(v).replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'"); }
function cleanText(value) { return String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/\uFFFD/g, ""); }
function safe(s) { return String(s || "").replace(/[^a-z0-9-_ ]/gi, "").trim().replace(/\s+/g, "_") || "selected_content"; }
