import PDFDocument from "pdfkit";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UNICODE_FONT = path.resolve(__dirname, "../../assets/fonts/NotoSans-Regular.ttf");

const PAGE_GAP = 12;
export function buildPdf(blocks, title, layoutMode = "vertical") {
  return new Promise((resolve, reject) => {
    const d = new PDFDocument({ size: "A4", margin: 48, bufferPages: false, autoFirstPage: true });
    d.font(UNICODE_FONT);
    const chunks = [];
    d.on("data", (chunk) => chunks.push(chunk));
    d.on("error", reject);
    d.on("end", () => resolve({ buffer: Buffer.concat(chunks), filename: `${safe(title)}.pdf`, mimeType: "application/pdf" }));
    if (layoutMode === "horizontal") renderHorizontal(d, blocks || []);
    else for (const block of blocks || []) renderBlock(d, block);
    d.end();
  });
}

function pageMetrics(d) {
  return { bottom: d.page.height - d.page.margins.bottom, usableWidth: d.page.width - d.page.margins.left - d.page.margins.right, usableHeight: d.page.height - d.page.margins.top - d.page.margins.bottom };
}
function ensureRoom(d, height = 24) {
  const { bottom } = pageMetrics(d);
  if (d.y + height > bottom) d.addPage();
}
function renderHorizontal(d, blocks) {
  const { usableWidth, usableHeight, bottom } = pageMetrics(d);
  const gap = 14;
  const columnWidth = (usableWidth - gap) / 2;
  for (let i = 0; i < blocks.length; i += 2) {
    const group = blocks.slice(i, i + 2);
    const estimated = group.map((block) => estimateBlockHeight(d, block, columnWidth, usableHeight));
    // A very tall block cannot safely fit beside another block on one page.
    // Fall back to the normal paginated flow for that pair rather than clipping it.
    if (estimated.some((height) => height > usableHeight * 0.92)) {
      for (const block of group) renderBlock(d, block);
      continue;
    }
    const rowHeight = Math.min(usableHeight, Math.max(estimated[0] || 36, estimated[1] || 36, 36));
    if (d.y + rowHeight > bottom && d.y > d.page.margins.top + PAGE_GAP) d.addPage();
    const top = d.y;
    const pageBottom = Math.min(pageMetrics(d).bottom, top + rowHeight);
    group.forEach((block, index) => {
      const x = d.page.margins.left + index * (columnWidth + gap);
      renderBlockColumn(d, block, x, top, columnWidth, pageBottom);
    });
    d.y = top + rowHeight + PAGE_GAP;
    if (d.y > pageMetrics(d).bottom) d.addPage();
  }
}

function estimateBlockHeight(d, block, width, usableHeight) {
  try {
    if ((block?.visual?.kind === "image" || block?.visual?.kind === "pdf-selection") && block.visual.dataUrl) {
      const image = d.openImage(dataFromUrl(block.visual.dataUrl));
      return Math.max(48, width * image.height / Math.max(1, image.width) + PAGE_GAP);
    }
    const html = block?.visual?.kind === "html" ? String(block.visual.html || "") : "";
    const plain = html ? stripHtml(html) : cleanText(block?.text);
    d.fontSize(8.5);
    let height = plain ? d.heightOfString(plain, { width, lineGap: 2, paragraphGap: 2 }) : 0;
    const tables = html ? [...html.matchAll(/<table\b[\s\S]*?<\/table>/gi)] : [];
    for (const match of tables) {
      const rows = [...match[0].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
      const columnCount = Math.max(1, ...rows.map((row) => [...row[1].matchAll(/<t[dh]\b/gi)].length));
      const cellWidth = Math.max(8, width / columnCount - 6);
      d.fontSize(columnCount > 4 ? 5.8 : columnCount > 2 ? 6.5 : 7);
      const tableHeight = rows.reduce((sum, row) => {
        const cells = [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => decode(cleanText(cell[1].replace(/<[^>]+>/g, " "))).trim());
        const cellHeights = cells.map((cell) => d.heightOfString(cell, { width: cellWidth, lineGap: 0.5 }));
        return sum + Math.max(16, Math.max(0, ...cellHeights) + 6);
      }, 0);
      height += Math.max(24, tableHeight + 4);
    }
    const imgs = html ? [...html.matchAll(/<img\b[^>]*src=["']([^"']+)["'][^>]*>/gi)] : [];
    for (const imageMatch of imgs) {
      try { const image = d.openImage(dataFromUrl(imageMatch[1])); height += Math.min(usableHeight * 0.65, width * image.height / Math.max(1, image.width)); } catch {}
    }
    return Math.max(48, height + PAGE_GAP * 2);
  } catch { return Math.max(48, Math.min(usableHeight, 180)); }
}

function renderBlockColumn(d, block, x, y, width, maxBottom) {
  if ((block?.visual?.kind === "image" || block?.visual?.kind === "pdf-selection") && block.visual.dataUrl) {
    return renderImageColumn(d, block.visual.dataUrl, x, y, width, maxBottom);
  }
  const html = block?.visual?.kind === "html" ? String(block.visual.html || "") : "";
  if (!html) return renderTextColumn(d, cleanText(block?.text), x, y, width, maxBottom);
  const token = /<img\b[^>]*src=["']([^"']+)["'][^>]*>|<table\b[\s\S]*?<\/table>/gi;
  let cursor = 0;
  for (const match of html.matchAll(token)) {
    y = renderTextColumn(d, stripHtml(html.slice(cursor, match.index)), x, y, width, maxBottom);
    if (/^<img/i.test(match[0])) y = renderImageColumn(d, match[1], x, y, width, maxBottom);
    else y = renderTableColumn(d, match[0], x, y, width, maxBottom);
    if (y >= maxBottom) return maxBottom;
    cursor = match.index + match[0].length;
  }
  return renderTextColumn(d, stripHtml(html.slice(cursor)), x, y, width, maxBottom);
}

function renderTextColumn(d, text, x, y, width, maxBottom) {
  const cleaned = cleanText(String(text || "").replace(/[ \t]+/g, " ").replace(/\n[ \t]+/g, "\n")).trim();
  if (!cleaned || y >= maxBottom) return y;
  d.fontSize(8.5).fillColor("#1e293b");
  const height = Math.max(1, maxBottom - y);
  d.text(cleaned, x, y, { width, height, lineGap: 2, paragraphGap: 2, ellipsis: true, breakAt: "word" });
  return Math.min(maxBottom, y + d.heightOfString(cleaned, { width, lineGap: 2, paragraphGap: 2 }));
}

function renderImageColumn(d, src, x, y, width, maxBottom) {
  try {
    const image = d.openImage(dataFromUrl(src));
    const availableHeight = Math.max(1, maxBottom - y);
    const scale = Math.min(width / image.width, availableHeight / image.height, 1);
    const w = image.width * scale;
    const h = image.height * scale;
    d.image(image, x + (width - w) / 2, y, { width: w, height: h });
    return y + h + 4;
  } catch { return y; }
}

function renderTableColumn(d, html, x, y, width, maxBottom) {
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((row) =>
    [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => decode(cleanText(cell[1].replace(/<[^>]+>/g, " "))).trim())
  ).filter((row) => row.length);
  if (!rows.length) return y;
  const colCount = Math.max(1, ...rows.map((row) => row.length));
  const cellWidth = width / colCount;
  const pad = 3;
  const fontSize = colCount > 4 ? 5.8 : colCount > 2 ? 6.5 : 7;
  for (const row of rows) {
    if (y >= maxBottom) return maxBottom;
    d.fontSize(fontSize);
    const heights = Array.from({ length: colCount }, (_, index) => d.heightOfString(String(row[index] ?? ""), { width: Math.max(6, cellWidth - pad * 2), lineGap: 0.5 }));
    const h = Math.min(Math.max(16, Math.max(...heights) + pad * 2), maxBottom - y);
    for (let col = 0; col < colCount; col += 1) {
      const cx = x + col * cellWidth;
      d.save().lineWidth(0.4).strokeColor("#cbd5e1").rect(cx, y, cellWidth, h).stroke().restore();
      d.fontSize(fontSize).fillColor("#111827").text(String(row[col] ?? ""), cx + pad, y + pad, { width: Math.max(6, cellWidth - pad * 2), height: Math.max(1, h - pad), lineGap: 0.5, ellipsis: true });
    }
    y += h;
  }
  return y + 4;
}

function stripHtml(html) {
  return decode(cleanText(String(html || "").replace(/<table\b[\s\S]*?<\/table>/gi, " ").replace(/<img\b[^>]*>/gi, " ").replace(/<br\s*\/?>/gi, "\n").replace(/<hr\b[^>]*>/gi, "\n────────────\n").replace(/<\/(p|div|h[1-6]|li|tr|section|article)>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/[ \t]+/g, " ").replace(/\n[ \t]+/g, "\n"))).trim();
}
function dataFromUrl(src) {
  const value = String(src || "");
  const comma = value.indexOf(",");
  return Buffer.from(comma >= 0 ? value.slice(comma + 1) : value, "base64");
}

function renderBlock(d, b) {
  if ((b?.visual?.kind === "image" || b?.visual?.kind === "pdf-selection") && b.visual.dataUrl) { addImage(d, b.visual.dataUrl); return; }
  if (b?.visual?.kind === "html") { renderHtml(d, b.visual.html); return; }
  const text = cleanText(b?.text);
  if (text) {
    for (const line of text.split(/\n/)) {
      ensureRoom( d, 18);
      d.fontSize(11).fillColor("#1e293b").text(line || " ", { lineGap: 3, width: pageMetrics(d).usableWidth });
    }
    d.moveDown(0.5);
  }
}
function renderHtml(d, html) {
  const source = String(html || "");
  const token = /<img\b[^>]*src=["']([^"']+)["'][^>]*>|<table\b[\s\S]*?<\/table>/gi;
  let cursor = 0;
  for (const match of source.matchAll(token)) {
    renderPlain(d, source.slice(cursor, match.index));
    if (/^<img/i.test(match[0])) addImage(d, match[1]);
    else renderTable(d, match[0]);
    cursor = match.index + match[0].length;
  }
  renderPlain(d, source.slice(cursor));
}
function renderPlain(d, html) {
  const text = decode(cleanText(String(html)
    .replace(/<table\b[\s\S]*?<\/table>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<hr\b[^>]*>/gi, "\n────────────────────\n")
    .replace(/<\/(p|div|h[1-6]|li|tr|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")));
  if (!text.trim()) return;
  for (const paragraph of text.split(/\n+/).map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean)) {
    ensureRoom(d, 30);
    d.fontSize(11).fillColor("#1e293b").text(paragraph, { width: pageMetrics(d).usableWidth, lineGap: 3, paragraphGap: 4 });
  }
}
function renderTable(d, html) {
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((row) =>
    [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => decode(cleanText(cell[1].replace(/<[^>]+>/g, " "))).trim())
  ).filter((row) => row.length);
  if (!rows.length) return;
  const { usableWidth, bottom } = pageMetrics(d);
  const columnCount = Math.max(1, ...rows.map((row) => row.length));
  const colWidth = usableWidth / columnCount;
  const padding = 5;
  const fontSize = columnCount > 5 ? 7 : columnCount > 3 ? 8 : 9;
  for (const row of rows) {
    // Measure wrapped cells first so a row is never split across pages.
    d.fontSize(fontSize);
    const heights = Array.from({ length: columnCount }, (_, i) => d.heightOfString(String(row[i] ?? ""), { width: Math.max(12, colWidth - padding * 2), lineGap: 1 }));
    const rowHeight = Math.max(22, Math.min(Math.max(...heights) + padding * 2, pageMetrics(d).usableHeight));
    if (d.y + rowHeight > bottom) d.addPage();
    const top = d.y;
    for (let i = 0; i < columnCount; i++) {
      const x = d.page.margins.left + i * colWidth;
      d.save().lineWidth(0.5).strokeColor("#cbd5e1").rect(x, top, colWidth, rowHeight).stroke().restore();
      d.fontSize(fontSize).fillColor("#111827").text(String(row[i] ?? ""), x + padding, top + padding, {
        width: Math.max(12, colWidth - padding * 2), height: rowHeight - padding, lineGap: 1, ellipsis: true,
      });
    }
    d.y = top + rowHeight;
  }
  d.moveDown(0.5);
}
function addImage(d, src) {
  try {
    const raw = String(src || "");
    const data = Buffer.from(raw.includes(",") ? raw.slice(raw.indexOf(",") + 1) : raw, "base64");
    if (!data.length) return;
    const { usableWidth, usableHeight, bottom } = pageMetrics(d);
    // Keep each image intact on one page. If it cannot fit in the remaining space,
    // start a new page; scale tall images to the printable page area.
    const image = d.openImage(data);
    const scale = Math.min(usableWidth / image.width, usableHeight / image.height, 1);
    const width = image.width * scale;
    const height = image.height * scale;
    if (d.y + height > bottom && d.y > d.page.margins.top + PAGE_GAP) d.addPage();
    const y = d.y;
    d.image(image, d.page.margins.left + (usableWidth - width) / 2, y, { width, height });
    d.y = y + height + PAGE_GAP;
  } catch {
    // Ignore malformed/unsupported image data rather than failing the entire export.
  }
}
function decode(value) {
  return String(value).replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
function cleanText(value) { return String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/\uFFFD/g, ""); }
function safe(value) { return String(value || "selected_content").replace(/[^a-z0-9-_ ]/gi, "").trim().replace(/\s+/g, "_") || "selected_content"; }
