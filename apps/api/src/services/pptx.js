import pptxgen from "pptxgenjs";

export async function buildPptx(blocks, title, layoutMode = "vertical") {
  const p = new pptxgen();
  p.layout = "LAYOUT_WIDE";
  p.author = "SIC";
  const items = blocks?.length ? blocks : [{ text: "" }];
  const horizontal = layoutMode === "horizontal";
  const groupSize = horizontal ? 2 : 1;
  for (let i = 0; i < items.length; i += groupSize) {
    const group = items.slice(i, i + groupSize);
    const slide = p.addSlide();
    group.forEach((block, index) => {
      const margin = 0.55;
      const gap = horizontal ? 0.28 : 0;
      const colWidth = horizontal ? (13.333 - margin * 2 - gap) / 2 : 11.9;
      const left = horizontal ? margin + index * (colWidth + gap) : 0.7;
      renderPptBlock(slide, block, left, colWidth, horizontal);
    });
  }
  const data = await p.write({ outputType: "nodebuffer" });
  return { buffer: Buffer.from(data), filename: `${safe(title)}.pptx`, mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation" };
}

function renderPptBlock(slide, block, left, width, horizontal) {
  const html = block?.visual?.kind === "html" ? block.visual.html : "";
  const top = 0.55;
  if (html) {
    const images = [...html.matchAll(/<img\b[^>]*src=["']([^"']+)["'][^>]*>/gi)];
    const tables = parseTables(html);
    const text = htmlText(html);
    let y = top;
    if (images.length) {
      const bandH = tables.length || text ? (horizontal ? 1.45 : 2.7) : (horizontal ? 5.9 : 6.1);
      for (const match of images) {
        try { slide.addImage({ data: match[1], x: left, y, w: width, h: bandH, sizingContain: true }); } catch {}
      }
      y += bandH + 0.15;
    }
    if (tables.length && y < 6.7) {
      const tableH = Math.max(0.55, Math.min(horizontal ? 2.25 : 3.1, 6.95 - y));
      for (const table of tables) {
        try { slide.addTable(table, { x: left, y, w: width, h: tableH, border: { type: "solid", color: "B8C2CC", pt: 1 }, fontSize: horizontal ? 7 : 10, color: "1E293B", margin: 0.035, valign: "mid", autoFit: true, rowH: 0.22 }); } catch {}
        y += Math.min(tableH, Math.max(0.6, table.length * (horizontal ? 0.22 : 0.28))) + 0.1;
      }
    }
    if (text && y < 7.1) {
      const availableH = Math.max(0.4, 7.05 - y);
      slide.addText(text, { x: left, y, w: width, h: availableH, fontSize: horizontal ? 8 : 11, margin: 0.04, fit: "shrink", valign: "top", breakLine: false });
    }
    return;
  }
  if (block?.visual?.kind === "image" && block.visual.dataUrl) {
    try { slide.addImage({ data: block.visual.dataUrl, x: left, y: top, w: width, h: horizontal ? 5.9 : 5.9, sizingContain: true }); } catch {}
    return;
  }
  const text = cleanText(block?.text);
  if (text) slide.addText(text, { x: left, y: top, w: width, h: 5.9, fontSize: horizontal ? 10 : 16, margin: 0.08, breakLine: false, valign: "top", fit: "shrink" });
}

function parseTables(html) { return [...String(html).matchAll(/<table\b[\s\S]*?<\/table>/gi)].map((m) => [...m[0].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((r) => [...r[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => ({ text: decode(cleanText(c[1].replace(/<[^>]+>/g," "))), options:{} })))); }
function htmlText(html) { return decode(cleanText(String(html).replace(/<img\b[^>]*>/gi," ").replace(/<table\b[\s\S]*?<\/table>/gi," ").replace(/<br\s*\/?>/gi,"\n").replace(/<hr\b[^>]*>/gi,"\n────────────\n").replace(/<[^>]+>/g," ").replace(/ {2,}/g," "))); }
function decode(v) { return String(v).replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'"); }
function cleanText(value) { return String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/\uFFFD/g, ""); }
function safe(s) { return String(s || "").replace(/[^a-z0-9-_ ]/gi, "").trim().replace(/\s+/g, "_") || "selected_content"; }
