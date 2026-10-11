import pdfWorkerSrc from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";
import { renderPptx } from "./api";

export async function parseFile(file, id) {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (["txt", "md", "csv"].includes(ext || "")) return textLike(file, id);
  if (ext === "docx") return docx(file, id);
  if (ext === "xlsx" || ext === "xls") return workbook(file, id);
  if (ext === "pdf") return pdf(file, id);
  if (ext === "pptx") return pptx(file, id);
  if (["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg"].includes(ext || "")) return imageFile(file, id);
  throw new Error("This file type is not supported for live extraction. Use PDF, DOCX, XLSX/XLS, PPTX, PNG, JPG/JPEG, WEBP, GIF, BMP, SVG, TXT, Markdown or CSV.");
}

async function textLike(file, id) {
  let text = await file.text();
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "csv") {
    const { default: Papa } = await import("papaparse");
    const p = Papa.parse(text, { skipEmptyLines: true });
    const rows = p.data;
    text = rows.map((r) => r.join(" | ")).join("\n");
    const html = `<div class="si-source-table-wrap"><table class="si-source-table"><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    return { text, blocks: make(text, id, file.name, "table").blocks, visual: { kind: "html", html } };
  }
  const html = `<pre class="si-source-pre">${escapeHtml(text)}</pre>`;
  return { text, blocks: make(text, id, file.name, "plain").blocks, visual: { kind: "html", html } };
}

async function docx(file, id) {
  const { default: mammoth } = await import("mammoth");
  const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() }, {
    styleMap: [
      "p[style-name='Title'] => h1:fresh",
      "p[style-name='Subtitle'] => h2:fresh",
      "p[style-name='Heading 1'] => h2:fresh",
      "p[style-name='Heading 2'] => h3:fresh",
      "p[style-name='Heading 3'] => h4:fresh",
    ],
  });
  const raw = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  const blocks = htmlBlocks(result.value, id, file.name);
  return { text: raw.value, blocks, visual: { kind: "html", html: result.value } };
}

async function workbook(file, id) {
  const XLSX = await import("xlsx");
  const w = XLSX.read(await file.arrayBuffer(), { type: "array", cellText: true, cellDates: true, cellStyles: true });
  const text = w.SheetNames.map((n) => `# ${n}\n${XLSX.utils.sheet_to_csv(w.Sheets[n])}`).join("\n\n");
  const html = w.SheetNames.map((n) => {
    const sheetHtml = XLSX.utils.sheet_to_html(w.Sheets[n], { editable: false });
    const tagged = tagSpreadsheetCells(sheetHtml, id, n, w.Sheets[n]);
    return `<section class="si-xlsx-sheet" data-si-sheet="${escapeHtml(n)}"><h2 class="si-xlsx-title">${escapeHtml(n)}</h2>${tagged}</section>`;
  }).join("");
  return { ...make(text, id, file.name, "table"), visual: { kind: "html", html } };
}

async function pdf(file, id) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages = [];
  const blocks = [];
  for (let n = 1; n <= doc.numPages; n += 1) {
    const page = await doc.getPage(n);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent({ includeMarkedContent: true });
    const items = content.items
      .filter((item) => typeof item.str === "string" && item.str.length)
      .map((item, index) => {
        const transform = item.transform || [1, 0, 0, 1, 0, 0];
        const fontSize = Math.max(5, Math.abs(transform[3]) || Math.abs(transform[0]) || 10);
        const x = transform[4] || 0;
        const baseline = transform[5] || 0;
        const y = viewport.height - baseline - fontSize;
        return {
          id: `${id}-p${n}-i${index}`,
          text: item.str,
          x,
          y,
          width: Math.max(1, item.width || fontSize * Math.max(1, item.str.length * 0.5)),
          height: Math.max(fontSize * 1.2, item.height || fontSize * 1.2),
          fontSize,
          fontName: item.fontName || "sans-serif",
          fontFamily: content.styles?.[item.fontName]?.fontFamily || "sans-serif",
          fontWeight: content.styles?.[item.fontName]?.fontWeight || 400,
          italic: Boolean(content.styles?.[item.fontName]?.italic),
          dir: item.dir || "ltr",
          charSpacing: item.str.length > 1 ? (item.width || 0) / item.str.length : item.width || fontSize,
          wordSpacing: 0,
          lineHeight: Math.max(fontSize * 1.1, item.height || fontSize * 1.2),
        };
      });

    const pageBlocks = groupPdfItemsIntoBlocks(items, id, file.name, n);
    blocks.push(...pageBlocks);
    const elements = buildPdfElementModel(items, pageBlocks, id, n);
    pages.push({
      number: n,
      width: viewport.width,
      height: viewport.height,
      items,
      elements,
      text: pageBlocks.map((b) => b.text).join("\n"),
    });
  }
  return { text: pages.map((p) => p.text).join("\n\n"), blocks, visual: { kind: "pdf", pages } };
}

async function imageFile(file, id) {
  const dataUrl = await fileToDataUrl(file);
  const image = await loadImage(dataUrl);
  const block = {
    id: `${id}-image`,
    sourceFileId: id,
    sourceFileName: file.name,
    text: "",
    order: 0,
    visualKind: "image",
    visual: {
      kind: "image",
      dataUrl,
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
      aspectRatio: (image.naturalWidth || image.width) / Math.max(1, image.naturalHeight || image.height),
    },
    layout: {
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
    },
  };
  return { text: "[Image]", blocks: [block], visual: { kind: "image", dataUrl, width: block.visual.width, height: block.visual.height } };
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error("Could not read image."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not decode image."));
    image.src = src;
  });
}

async function pptx(file, id) {
  const JSZip = await import("jszip");
  const z = await JSZip.default.loadAsync(await file.arrayBuffer());
  const names = Object.keys(z.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/slide(\d+)/)?.[1]) - Number(b.match(/slide(\d+)/)?.[1]));

  // PowerPoint uses EMUs for geometry. Render on a stable 960×540 CSS canvas
  // so the same relative coordinates survive resizing and selection/copying.
  const presentationXml = z.files["ppt/presentation.xml"] ? await z.file("ppt/presentation.xml").async("text") : "";
  const sizeMatch = presentationXml.match(/<p:sldSz[^>]*cx="(\d+)"[^>]*cy="(\d+)"/);
  const slideWidth = Number(sizeMatch?.[1] || 9144000);
  const slideHeight = Number(sizeMatch?.[2] || 5143500);
  const CSS_W = 960;
  const CSS_H = Math.max(1, slideHeight * CSS_W / slideWidth);
  const EMU_TO_PX = CSS_W / slideWidth;
  const slides = [];

  for (const name of names) {
    const slideNumber = Number(name.match(/slide(\d+)/)?.[1] || slides.length + 1);
    const xml = await z.file(name).async("text");
    const relsName = `ppt/slides/_rels/slide${slideNumber}.xml.rels`;
    const rels = z.files[relsName] ? await z.file(relsName).async("text") : "";
    const relMap = {};
    for (const m of rels.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
      const target = m[2].replace(/^\.\.\//, "ppt/");
      relMap[m[1]] = target.startsWith("ppt/") ? target : `ppt/slides/${target}`;
    }

    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const shapes = [];
    const ns = "http://schemas.openxmlformats.org/presentationml/2006/main";
    const aNs = "http://schemas.openxmlformats.org/drawingml/2006/main";
    const rNs = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
    const get = (root, local, namespace = aNs) => root?.getElementsByTagNameNS(namespace, local)?.[0] || null;
    const attr = (node, name, fallback = "") => node?.getAttribute(name) ?? fallback;

    [...doc.getElementsByTagNameNS(ns, "sp")].forEach((shape, index) => {
      const txBody = get(shape, "txBody", ns);
      const paragraphs = txBody ? [...txBody.getElementsByTagNameNS(aNs, "p")] : [];
      const text = paragraphs.map((p) => [...p.getElementsByTagNameNS(aNs, "t")].map((t) => t.textContent || "").join("" )).join("\n");
      if (!text.trim()) return;
      const xfrm = get(shape, "xfrm", aNs) || get(shape, "xfrm", ns);
      const off = get(xfrm, "off");
      const ext = get(xfrm, "ext");
      const x = Number(attr(off, "x", 0)) * EMU_TO_PX;
      const y = Number(attr(off, "y", 0)) * EMU_TO_PX;
      const w = Math.max(1, Number(attr(ext, "cx", 1200000)) * EMU_TO_PX);
      const h = Math.max(1, Number(attr(ext, "cy", 500000)) * EMU_TO_PX);
      const firstRun = paragraphs[0]?.getElementsByTagNameNS(aNs, "rPr")?.[0];
      const latin = firstRun ? get(firstRun, "latin") : null;
      const sz = Number(attr(firstRun, "sz", 1800));
      const fontSize = Math.max(6, sz / 100 * 96 / 72);
      const fontWeight = attr(firstRun, "b", "0") === "1" ? 700 : 400;
      const fontStyle = attr(firstRun, "i", "0") === "1" ? "italic" : "normal";
      const fontFamily = attr(latin, "typeface", "Aptos") || "Aptos, Arial, sans-serif";
      const paragraphsStyle = paragraphs.map((p) => {
        const pPr = p.getElementsByTagNameNS(aNs, "pPr")?.[0];
        const algn = attr(pPr, "algn", "l");
        return algn === "ctr" ? "center" : algn === "r" ? "right" : "left";
      });
      shapes.push({ id: `${id}-slide${slideNumber}-shape${index}`, type: "text", text, x, y, w, h, fontSize, fontFamily, fontWeight, fontStyle, textAlign: paragraphsStyle[0] || "left" });
    });

    const imageNodes = [...doc.getElementsByTagNameNS(ns, "pic")];
    for (let index = 0; index < imageNodes.length; index += 1) {
      const pic = imageNodes[index];
      const blip = get(pic, "blip");
      const embed = blip?.getAttributeNS(rNs, "embed") || attr(blip, "r:embed");
      const target = embed ? relMap[embed] : null;
      if (!target || !z.files[target]) continue;
      const xfrm = get(pic, "xfrm", aNs) || get(pic, "xfrm", ns);
      const off = get(xfrm, "off");
      const ext = get(xfrm, "ext");
      const x = Number(attr(off, "x", 0)) * EMU_TO_PX;
      const y = Number(attr(off, "y", 0)) * EMU_TO_PX;
      const w = Math.max(1, Number(attr(ext, "cx", 1200000)) * EMU_TO_PX);
      const h = Math.max(1, Number(attr(ext, "cy", 800000)) * EMU_TO_PX);
      const data = await z.file(target).async("base64");
      shapes.push({ id: `${id}-slide${slideNumber}-image${index}`, type: "image", text: "", x, y, w, h, dataUrl: `data:${mimeFromName(target)};base64,${data}` });
    }

    // Preserve the original XML/PowerPoint stacking order. Sorting by x/y can
    // move background images behind/over text and makes the browser preview
    // differ from the uploaded presentation.
    slides.push({ width: CSS_W, height: CSS_H, shapes, text: shapes.filter((s) => s.type === "text").map((s) => s.text).join("\n") });
  }

  // Ask the API/LibreOffice renderer for the real Office slide pixels. This is
  // the fidelity source for Selected Content and generated files; XML parsing
  // remains the structured/selectable fallback.
  try {
    const rendered = await renderPptx(file);
    if (Array.isArray(rendered?.slides)) {
      rendered.slides.forEach((item, index) => {
        if (slides[index]) slides[index].renderedImage = item.dataUrl;
      });
    }
  } catch {
    // Local/offline builds continue with the structured XML renderer.
  }

  const blocks = slides.flatMap((slide, i) => slide.shapes.map((shape, j) => ({
    id: shape.id,
    sourceFileId: id,
    sourceFileName: file.name,
    page: i + 1,
    text: shape.text || "",
    order: j,
    visualKind: shape.type === "image" ? "image" : "pptx-text",
    visual: shape.type === "image" ? { kind: "image", dataUrl: shape.dataUrl, width: shape.w, height: shape.h, aspectRatio: shape.w / Math.max(1, shape.h), sourceFaithful: true } : undefined,
    style: shape.type === "text" ? { fontFamily: shape.fontFamily, fontSize: shape.fontSize, fontWeight: shape.fontWeight, fontStyle: shape.fontStyle, lineHeight: 1.15, textAlign: shape.textAlign, whiteSpace: "pre-wrap" } : undefined,
    layout: { x: shape.x, y: shape.y, width: shape.w, height: shape.h },
  })));

  const html = slides.map((slide, i) => `<section class="si-ppt-slide" data-slide="${i + 1}" data-slide-width="${CSS_W}" data-slide-height="${CSS_H}" style="position:relative;width:100%;max-width:${CSS_W}px;height:auto;aspect-ratio:${CSS_W}/${CSS_H};margin:0 auto 24px;background:#fff;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,.08)">${slide.renderedImage ? `<img class="si-ppt-rendered-slide" data-si-slide-image="true" src="${escapeHtml(slide.renderedImage)}" alt="" draggable="false" style="position:absolute;inset:0;width:100%;height:100%;object-fit:fill;display:block;max-width:none;z-index:0;pointer-events:none" />` : ""}${slide.shapes.map((shape) => shape.type === "image"
    ? `<img data-si-element="${shape.id}" data-si-pptx-image="true" src="${escapeHtml(shape.dataUrl)}" alt="" draggable="false" style="position:absolute;left:${shape.x}px;top:${shape.y}px;width:${shape.w}px;height:${shape.h}px;object-fit:fill;display:block;max-width:none;z-index:2" />`
    : `<div data-si-element="${shape.id}" data-si-pptx-shape="true" style="position:absolute;left:${shape.x}px;top:${shape.y}px;width:${shape.w}px;height:${shape.h}px;box-sizing:border-box;overflow:hidden;padding:2px 4px;white-space:pre-wrap;font-family:${escapeHtml(shape.fontFamily)};font-size:${shape.fontSize}px;font-weight:${shape.fontWeight};font-style:${shape.fontStyle};line-height:1.15;text-align:${shape.textAlign};color:${slide.renderedImage ? "transparent" : "#0f172a"};user-select:text;z-index:2">${escapeHtml(shape.text)}</div>`).join("")}</section>`).join("");
  return { text: slides.map((s) => s.text).join("\n\n"), blocks, visual: { kind: "html", html } };
}

function tagSpreadsheetCells(html, fileId, sheetName, sheet = {}) {
  const cols = sheet["!cols"] || [];
  const rows = sheet["!rows"] || [];
  const ref = sheet["!ref"] || "A1:A1";
  const endCell = ref.split(":").pop();
  const colLetters = endCell.match(/[A-Z]+/i)?.[0] || "A";
  const maxCol = colLetters.toUpperCase().split("").reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
  const columnName = (n) => { let out = ""; while (n > 0) { const r = (n - 1) % 26; out = String.fromCharCode(65 + r) + out; n = Math.floor((n - 1) / 26); } return out; };
  let rowIndex = -1;
  let output = String(html).replace(/<tr\b([^>]*)>([\s\S]*?)<\/tr>/gi, (_match, attrs, inner) => {
    rowIndex += 1;
    let colIndex = 0;
    const h = rows[rowIndex]?.hpx || (rows[rowIndex]?.hpt ? rows[rowIndex].hpt * 96 / 72 : 0);
    const rowStyle = h ? ` style="height:${Math.round(h)}px"` : "";
    const cells = inner.replace(/<td(\s[^>]*)?>([\s\S]*?)<\/td>/gi, (_cellMatch, cellAttrs = "", content) => {
      const cellId = `${fileId}::xlsx::${encodeURIComponent(sheetName)}::cell-${rowIndex}-${colIndex}`;
      const address = `${columnName(colIndex + 1)}${rowIndex + 1}`;
      const sourceCell = sheet[address] || {};
      const formulaAttr = sourceCell.f ? ` data-si-formula="${escapeHtml(sourceCell.f)}"` : "";
      const numFmtAttr = sourceCell.z ? ` data-si-numfmt="${escapeHtml(sourceCell.z)}"` : "";
      const column = cols[colIndex] || {};
      const width = Math.round(column.wpx || (column.wch ? column.wch * 7 + 5 : 0));
      let safeAttrs = cellAttrs || "";
      if (width) {
        if (/\sstyle\s*=\s*(["']).*?\1/i.test(safeAttrs)) safeAttrs = safeAttrs.replace(/\sstyle\s*=\s*(["'])(.*?)\1/i, (_m, q, css) => ` style=${q}${css};width:${width}px;min-width:${width}px${q}`);
        else safeAttrs += ` style="width:${width}px;min-width:${width}px"`;
      }
      const out = `<td data-si-element="${cellId}" data-si-cell="true" data-si-sheet="${escapeHtml(sheetName)}" data-si-row="${rowIndex}" data-si-col="${colIndex}"${formulaAttr}${numFmtAttr}${safeAttrs}>${content}</td>`;
      colIndex += 1;
      return out;
    });
    return `<tr${attrs || ""}${rowStyle}><th class="si-xlsx-row-header" data-si-row-header="${rowIndex}" scope="row">${rowIndex + 1}</th>${cells}</tr>`;
  });
  const columnHeaders = `<tr class="si-xlsx-column-headers"><th class="si-xlsx-corner" aria-hidden="true"></th>${Array.from({ length: maxCol }, (_, i) => `<th data-si-col-header="${i}" scope="col">${columnName(i + 1)}</th>`).join("")}</tr>`;
  return output.replace(/(<table\b[^>]*>)/i, `$1${columnHeaders}`);
}

function mimeFromName(name) {
  const ext = name.split(".").pop()?.toLowerCase();
  return ({ png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", bmp: "image/bmp", svg: "image/svg+xml" })[ext] || "application/octet-stream";
}

function decodeXml(value) {
  return String(value).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

function make(text, id, name, kind) {
  const blocks = split(text).map((x, i) => ({ id: crypto.randomUUID(), sourceFileId: id, sourceFileName: name, text: x, order: i, visualKind: kind }));
  return { text, blocks, visual: { kind } };
}

function htmlBlocks(html, id, name) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const nodes = [...doc.body.firstElementChild.children];
  return nodes.map((node, i) => ({
    id: crypto.randomUUID(), sourceFileId: id, sourceFileName: name, text: node.textContent?.trim() || "", order: i,
    html: node.outerHTML, visualKind: "html",
  })).filter((b) => b.text);
}

function groupPdfItemsIntoBlocks(items, id, name, page) {
  const lines = [];
  const tolerance = 4;
  items.forEach((item) => {
    let line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= tolerance);
    if (!line) {
      line = { y: item.y, items: [] };
      lines.push(line);
    }
    line.items.push(item);
  });
  lines.sort((a, b) => a.y - b.y);
  return lines.map((line, index) => {
    const ordered = [...line.items].sort((a, b) => a.x - b.x);
    const text = ordered.map((item) => item.text).join(" ").replace(/\s+([,.!?;:])/g, "$1").trim();
    return {
      id: `${id}-p${page}-line${index}`,
      sourceFileId: id,
      sourceFileName: name,
      page,
      text,
      order: index,
      visualKind: "pdf-line",
      pageItems: ordered.map((item) => item.id),
      layout: {
        x: Math.min(...ordered.map((item) => item.x)),
        y: Math.min(...ordered.map((item) => item.y)),
        width: Math.max(...ordered.map((item) => item.x + item.width)) - Math.min(...ordered.map((item) => item.x)),
        height: Math.max(...ordered.map((item) => item.y + item.height)) - Math.min(...ordered.map((item) => item.y)),
      },
    };
  });
}

function buildPdfElementModel(items, lines, fileId, page) {
  const elements = [{ id: `${fileId}-p${page}`, type: "page", page }];
  lines.forEach((line) => {
    const lineId = line.id;
    elements.push({ id: lineId, type: "line", page, text: line.text, ...line.layout });
    const lineItems = items.filter((item) => line.pageItems?.includes(item.id)).sort((a, b) => a.x - b.x);
    lineItems.forEach((item) => {
      const wordId = item.id;
      elements.push({ id: wordId, type: "word", page, text: item.text, x: item.x, y: item.y, width: item.width, height: item.height, fontFamily: item.fontFamily, fontSize: item.fontSize, fontWeight: item.fontWeight, italic: item.italic, lineHeight: item.lineHeight });
      const step = item.width / Math.max(1, item.text.length);
      [...item.text].forEach((char, index) => elements.push({
        id: `${item.id}-c${index}`,
        type: char === " " ? "space" : "character",
        page,
        text: char,
        x: item.x + step * index,
        y: item.y,
        width: step,
        height: item.height,
        fontFamily: item.fontFamily,
        fontSize: item.fontSize,
        fontWeight: item.fontWeight,
        italic: item.italic,
        lineHeight: item.lineHeight,
      }));
    });
  });
  return elements;
}

function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "\'": "&#39;" }[c])); }

function split(text) {
  return text.replace(/\r/g, "").split(/\n\s*\n|\n(?=# )/).map((x) => x.trim()).filter(Boolean).flatMap((x) => x.length > 2200 ? (x.match(/.{1,2200}(?:\s|$)/g) || [x]) : [x]);
}
