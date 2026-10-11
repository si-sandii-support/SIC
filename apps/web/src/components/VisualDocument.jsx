import React, { useEffect, useMemo, useRef, useState } from "react";
import { Crop, MousePointer2, Image as ImageIcon, TextSelect } from "lucide-react";
import toast from "react-hot-toast";
import { cloneElementWithStyles, cloneRangeWithStyles, selectionMetadata } from "../lib/htmlSelection";

export const VisualDocument = React.memo(function VisualDocument({ visual, file, query, onSelection, selectedIds = [] }) {
  if (!visual) return null;
  return (
    <div>
      {visual.kind === "pdf" ? <PdfVisual visual={visual} file={file} query={query} onSelection={onSelection} selectedIds={selectedIds} /> : visual.kind === "html" ? <HtmlVisual visual={visual} file={file} query={query} onSelection={onSelection} /> : visual.kind === "image" ? <ImageVisual visual={visual} file={file} onSelection={onSelection} /> : null}
    </div>
  );
});

function PdfVisual({ visual, file, query, onSelection, selectedIds }) {
  const [scale, setScale] = useState(1.25);
  const [regionMode, setRegionMode] = useState(false);
  const [selection, setSelection] = useState(null);
  const [dragRect, setDragRect] = useState(null);
  const dragRectRef = useRef(null);
  const [rendered, setRendered] = useState({});

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!file) return;
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const worker = (await import("pdfjs-dist/legacy/build/pdf.worker.mjs?url")).default;
      pdfjs.GlobalWorkerOptions.workerSrc = worker;
      const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
      for (const pageInfo of visual.pages) {
        if (cancelled) return;
        const page = await doc.getPage(pageInfo.number);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width * devicePixelRatio);
        canvas.height = Math.ceil(viewport.height * devicePixelRatio);
        const ctx = canvas.getContext("2d", { alpha: false });
        await page.render({ canvasContext: ctx, viewport, transform: devicePixelRatio !== 1 ? [devicePixelRatio, 0, 0, devicePixelRatio, 0, 0] : undefined }).promise;
        if (!cancelled) setRendered((current) => ({ ...current, [pageInfo.number]: canvas.toDataURL("image/png") }));
      }
    }
    run().catch(() => {});
    return () => { cancelled = true; };
  }, [file, visual.pages, scale]);

  async function handleMouseUp(pageInfo, event) {
    if (regionMode || !onSelection) return;
    const sel = window.getSelection();
    const text = sel?.toString() || "";
    if (!sel || !text.trim()) return;
    const layer = event.currentTarget;
    if (!layer.contains(sel.anchorNode) || !layer.contains(sel.focusNode)) return;
    const charNodes = [...layer.querySelectorAll("[data-char-id]")];
    const range = sel.rangeCount ? sel.getRangeAt(0) : null;
    const rangeRect = range?.getBoundingClientRect?.();
    const intersects = (a, b) => a && b && a.right >= b.left && a.left <= b.right && a.bottom >= b.top && a.top <= b.bottom;
    const selectedNodes = charNodes.filter((node) => {
      try {
        if (sel.containsNode(node, true)) return true;
        return Boolean(rangeRect && intersects(node.getBoundingClientRect(), rangeRect));
      } catch { return Boolean(rangeRect && intersects(node.getBoundingClientRect(), rangeRect)); }
    });
    if (!selectedNodes.length && rangeRect) {
      // Browser selection can return no intersecting nodes when the transparent
      // character layer is scaled. Fall back to the characters whose visual
      // rectangles overlap the native selection rectangle.
      charNodes.forEach((node) => {
        if (intersects(node.getBoundingClientRect(), rangeRect)) selectedNodes.push(node);
      });
    }
    if (!selectedNodes.length) return;
    const fragments = selectedNodes.map((node) => ({
      text: node.dataset.char || "",
      x: Number(node.dataset.x), y: Number(node.dataset.y), width: Number(node.dataset.w), height: Number(node.dataset.h),
      fontSize: Number(node.dataset.fontSize), fontFamily: node.dataset.fontFamily || "sans-serif", fontWeight: Number(node.dataset.fontWeight || 400),
    }));
    const bounds = boundsOf(fragments);
    const sourceId = `${file?.__siId || file?.name || "PDF"}::p${pageInfo.number}::chars::${selectedNodes.map((node) => node.dataset.charId).join(",")}`;
    const pageImage = rendered[pageInfo.number];
    // Keep the PDF selection visually faithful to the source page. The extracted
    // character model is still retained for editing/search, but the Selected
    // Content preview uses the original rendered pixels instead of reconstructing
    // glyphs with browser fonts (which can produce broken spacing/garbled text).
    let dataUrl = null;
    if (pageImage) {
      try {
        const pad = 2;
        dataUrl = await cropDataUrl(pageImage, {
          x: Math.max(0, bounds.x - pad),
          y: Math.max(0, bounds.y - pad),
          width: bounds.width + pad * 2,
          height: bounds.height + pad * 2,
        }, scale);
      } catch {
        dataUrl = null;
      }
    }
    const item = {
      id: sourceId,
      sourceId,
      sourceElementId: sourceId,
      sourceFileId: file?.__siId || "",
      sourceFileName: file?.name || "PDF",
      page: pageInfo.number,
      text,
      order: 0,
      visualKind: "pdf-selection",
      visual: {
        kind: "pdf-selection",
        pageWidth: pageInfo.width,
        pageHeight: pageInfo.height,
        fragments,
        bounds,
        dataUrl,
        width: bounds.width,
        height: bounds.height,
        aspectRatio: bounds.width / Math.max(1, bounds.height),
        renderScale: scale,
        sourceFaithful: Boolean(dataUrl),
      },
    };
    setSelection(item);
    onSelection(item);
    sel.removeAllRanges();
  }

  function beginRegion(event, pageInfo, container) {
    if (!regionMode) return;
    event.preventDefault();
    const rect = container.getBoundingClientRect();
    const start = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const move = (moveEvent) => {
      // Region coordinates are CSS pixels inside the rendered page. Clamp them
      // to the actual page so both tiny and full-page captures stay valid.
      const x = clamp(moveEvent.clientX - rect.left, 0, rect.width);
      const y = clamp(moveEvent.clientY - rect.top, 0, rect.height);
      const left = clamp(Math.min(start.x, x), 0, rect.width);
      const top = clamp(Math.min(start.y, y), 0, rect.height);
      const right = clamp(Math.max(start.x, x), 0, rect.width);
      const bottom = clamp(Math.max(start.y, y), 0, rect.height);
      const next = { x: left, y: top, w: Math.max(1, right - left), h: Math.max(1, bottom - top) };
      dragRectRef.current = next;
      setDragRect(next);
    };
    const up = async () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const r = dragRectRef.current || { x: start.x, y: start.y, w: 0, h: 0 };
      dragRectRef.current = null;
      setDragRect(null);
      if (r.w < 2 || r.h < 2 || !rendered[pageInfo.number]) return;
      const image = await cropRenderedDataUrl(rendered[pageInfo.number], r);
      const sourceId = `${file?.__siId || file?.name || "PDF"}::p${pageInfo.number}::region::${Math.round(r.x)}-${Math.round(r.y)}-${Math.round(r.w)}-${Math.round(r.h)}`;
      const item = {
        id: sourceId,
        sourceId,
        sourceElementId: sourceId,
        sourceFileId: file?.__siId || "",
        sourceFileName: file?.name || "PDF",
        page: pageInfo.number,
        text: "[Selected visual region]",
        order: 0,
        visualKind: "image-selection",
        visual: { kind: "image", dataUrl: image, width: r.w, height: r.h, aspectRatio: r.w / Math.max(1, r.h), sourcePage: pageInfo.number },
      };
      setSelection(item);
      onSelection(item);
      setRegionMode(false);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-100 p-3">
      <div className="sticky top-0 z-10 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white/95 p-2 backdrop-blur">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600"><MousePointer2 size={15} /> Select text with your mouse, then drag the selection.</div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" className={`btn-secondary !px-2.5 !py-1.5 ${regionMode ? "!border-emerald-400 !bg-emerald-50 !text-emerald-700" : ""}`} onClick={() => setRegionMode((v) => !v)}><Crop size={14} /> {regionMode ? "Exit region" : "Select image/region"}</button>
          <button type="button" className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold" onClick={() => setScale((v) => Math.max(0.75, +(v - 0.25).toFixed(2)))}>−</button>
          <span className="min-w-12 text-center text-[11px] font-bold text-slate-500">{Math.round(scale * 100)}%</span>
          <button type="button" className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold" onClick={() => setScale((v) => Math.min(2.5, +(v + 0.25).toFixed(2)))}>+</button>
        </div>
      </div>
      <div className="space-y-5 overflow-auto">
        {visual.pages.map((page) => <PdfPage key={page.number} page={page} image={rendered[page.number]} scale={scale} query={query} regionMode={regionMode} dragRect={dragRect} onMouseUp={handleMouseUp} onTouchSelection={(pageInfo, event) => { if (event.pointerType === "touch" || event.pointerType === "pen") handleMouseUp(pageInfo, event); }} onRegionStart={beginRegion} selectedIds={selectedIds} selection={selection} />)}
      </div>
      {selection && <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800"><TextSelect size={15} /> Selected content was automatically added. Drag it again to create another copy.</div>}
    </div>
  );
}

function PdfPage({ page, image, scale, query, regionMode, dragRect, onMouseUp, onTouchSelection, onRegionStart }) {
  const chars = useMemo(() => {
    const result = [];
    for (const item of page.items) {
      const step = item.width / Math.max(1, item.text.length);
      [...item.text].forEach((char, index) => result.push({
        id: `${item.id}-c${index}`, char, x: item.x + step * index, y: item.y, w: step, h: item.height,
        fontSize: item.fontSize, fontFamily: item.fontFamily || item.fontName || "sans-serif", fontWeight: item.fontWeight || 400,
      }));
    }
    return result;
  }, [page.items]);

  const filtered = query.trim().toLowerCase();
  return (
    <div className="mx-auto w-fit max-w-full">
      <div className="mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">Page {page.number}</div>
      <div
        className={`relative overflow-hidden bg-white shadow-xl ${regionMode ? "cursor-crosshair touch-none" : ""}`}
        style={{ width: page.width * scale, height: page.height * scale }}
        onPointerDown={(e) => onRegionStart(e, page, e.currentTarget)}
      >
        {image && <img src={image} alt={`Page ${page.number}`} draggable={false} className="absolute inset-0 h-full w-full select-none" />}
        <div className="absolute inset-0 select-text" onMouseUp={(e) => onMouseUp(page, e)} onPointerUp={(e) => onTouchSelection?.(page, e)}>
          {chars.map((c) => {
            const match = filtered && c.char.toLowerCase().includes(filtered);
            return <span key={c.id} data-char-id={c.id} data-char={c.char} data-x={c.x} data-y={c.y} data-w={c.w} data-h={c.h} data-font-size={c.fontSize} data-font-family={c.fontFamily} data-font-weight={c.fontWeight || 400}
              className={match ? "bg-yellow-200/70" : ""}
              style={{ position: "absolute", left: c.x * scale, top: c.y * scale, width: Math.max(1, c.w * scale), height: Math.max(1, c.h * scale), fontSize: c.fontSize * scale, lineHeight: `${c.h * scale}px`, fontFamily: c.fontFamily, color: "transparent", whiteSpace: "pre", userSelect: "text" }}
            >{c.char}</span>;
          })}
        </div>
        {dragRect && <div className="pointer-events-none absolute border-2 border-emerald-500 bg-emerald-200/20" style={{ left: dragRect.x, top: dragRect.y, width: dragRect.w, height: dragRect.h }} />}
      </div>
    </div>
  );
}

function HtmlVisual({ visual, file, query, onSelection }) {
  const ref = useRef(null);
  const [regionMode, setRegionMode] = useState(false);
  const [dragRect, setDragRect] = useState(null);
  const dragRectRef = useRef(null);
  const spreadsheetDragRef = useRef(null);
  const suppressSpreadsheetClick = useRef(false);
  const [lastSpreadsheetSelection, setLastSpreadsheetSelection] = useState(null);

  function handleSpreadsheetMouseDown(event) {
    if (regionMode) return;
    const cell = event.target?.closest?.("td[data-si-cell],th[data-si-cell]");
    if (!cell || !ref.current?.contains(cell)) return;
    event.preventDefault(); // prevent browser text highlighting; spreadsheet range selection owns the gesture
    ref.current.querySelectorAll(".si-active-source").forEach((node) => node.classList.remove("si-active-source"));
    cell.classList.add("si-active-source");
    spreadsheetDragRef.current = { row: Number(cell.dataset.siRow || 0), col: Number(cell.dataset.siCol || 0), x: event.clientX, y: event.clientY, sheet: cell.dataset.siSheet || "Sheet1" };
  }

  function handleSpreadsheetMouseUp(event) {
    const start = spreadsheetDragRef.current;
    spreadsheetDragRef.current = null;
    const endCell = event.target?.closest?.("td[data-si-cell],th[data-si-cell]");
    if (!start || !endCell || !ref.current?.contains(endCell)) return;
    const endSheet = endCell.dataset.siSheet || "Sheet1";
    // A drag cannot cross worksheet boundaries; keep the selection in the
    // worksheet where the user started the gesture.
    if (start.sheet !== endSheet) return;
    const end = { row: Number(endCell.dataset.siRow || 0), col: Number(endCell.dataset.siCol || 0) };
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    const table = endCell.closest("table");
    const cells = [...(table?.querySelectorAll("td[data-si-cell],th[data-si-cell]") || [])];
    const cellByPosition = new Map(cells.map((cell) => [`${Number(cell.dataset.siRow || 0)}:${Number(cell.dataset.siCol || 0)}`, cell]));
    const selectedCells = [];
    const matrix = [];
    const formulas = [];
    const numFmts = [];
    const cellStyles = [];
    const htmlRows = [];
    const columnWidths = [];
    const rowHeights = [];

    // Excel-style inclusive rectangle selection: every cell between the
    // top-left and bottom-right endpoints is included, even for diagonal drags.
    for (let row = minRow; row <= maxRow; row += 1) {
      const values = [];
      const rowFormulas = [];
      const rowNumFmts = [];
      const rowStyles = [];
      const htmlCells = [];
      let measuredRowHeight = 24;
      for (let col = minCol; col <= maxCol; col += 1) {
        const cell = cellByPosition.get(`${row}:${col}`);
        values.push(cell?.textContent || "");
        rowFormulas.push(cell?.dataset.siFormula || "");
        rowNumFmts.push(cell?.dataset.siNumfmt || "");
        rowStyles.push(cell ? spreadsheetCellStyle(cell) : {});
        if (cell) {
          selectedCells.push(cell);
          htmlCells.push(cloneElementWithStyles(cell).html);
          measuredRowHeight = Math.max(measuredRowHeight, Math.round(cell.getBoundingClientRect().height || 24));
          if (row === minRow) columnWidths.push(Math.max(1, Math.round(cell.getBoundingClientRect().width || 120)));
        } else {
          htmlCells.push('<td style="border:1px solid #d1d5db"></td>');
          if (row === minRow) columnWidths.push(120);
        }
      }
      matrix.push(values);
      formulas.push(rowFormulas);
      numFmts.push(rowNumFmts);
      cellStyles.push(rowStyles);
      htmlRows.push(`<tr>${htmlCells.join("")}</tr>`);
      rowHeights.push(measuredRowHeight);
    }

    if (!selectedCells.length) return;
    suppressSpreadsheetClick.current = true;
    ref.current.querySelectorAll(".si-xlsx-selected").forEach((node) => node.classList.remove("si-xlsx-selected"));
    selectedCells.forEach((cell) => cell.classList.add("si-xlsx-selected"));
    const html = `<table class="si-selected-table" style="border-collapse:collapse;table-layout:auto;width:max-content;min-width:max-content"><tbody>${htmlRows.join("")}</tbody></table>`;
    const spreadsheet = {
      sheetName: start.sheet,
      row: minRow,
      col: minCol,
      matrix,
      formulas,
      numFmts,
      columnWidths,
      rowHeights,
      cellStyles,
      axis: "range",
      range: { startRow: minRow, endRow: maxRow, startCol: minCol, endCol: maxCol },
    };
    setLastSpreadsheetSelection(spreadsheet);
    const sourceId = `${file?.__siId || file?.name || "XLSX"}::xlsx-range::${start.sheet}::${minRow}-${minCol}::${maxRow}-${maxCol}`;
    onSelection({ id: sourceId, sourceId, sourceElementId: sourceId, sourceFileId: file?.__siId || "", sourceFileName: "Spreadsheet", text: matrix.map((row) => row.join("\t")).join("\n"), order: 0, visualKind: "html-selection", html, spreadsheet, visual: { kind: "html", html, sourceFaithful: true } });
  }

  async function handleClick(event) {
    if (suppressSpreadsheetClick.current) { suppressSpreadsheetClick.current = false; event.preventDefault(); return; }
    if (regionMode || !ref.current) return;
    const rowHeader = event.target?.closest?.("[data-si-row-header]");
    const colHeader = event.target?.closest?.("[data-si-col-header]");
    if (rowHeader && ref.current.contains(rowHeader)) {
      const row = Number(rowHeader.dataset.siRowHeader);
      const cell = ref.current.querySelector(`[data-si-cell][data-si-row="${row}"]`);
      if (cell) { ref.current.querySelectorAll(".si-active-source").forEach((node) => node.classList.remove("si-active-source")); cell.classList.add("si-active-source"); selectSpreadsheetAxis("horizontal", cell); }
      event.preventDefault(); return;
    }
    if (colHeader && ref.current.contains(colHeader)) {
      const col = Number(colHeader.dataset.siColHeader);
      const cell = ref.current.querySelector(`[data-si-cell][data-si-col="${col}"]`);
      if (cell) { ref.current.querySelectorAll(".si-active-source").forEach((node) => node.classList.remove("si-active-source")); cell.classList.add("si-active-source"); selectSpreadsheetAxis("vertical", cell); }
      event.preventDefault(); return;
    }
    const image = event.target?.closest?.("img, image");
    const element = event.target?.closest?.("[data-si-element]");
    const target = element || image;
    if (!target || !ref.current.contains(target)) return;
    // Source visuals are selectable as complete elements. This explicitly
    // includes HTML images and SVG <image> nodes used by PPTX slides.
    if (!element && !image) return;
    event.preventDefault();
    ref.current.querySelectorAll(".si-active-source").forEach((node) => node.classList.remove("si-active-source"));
    const isCell = target.matches("td, th") || target.hasAttribute("data-si-cell");
    if (isCell) target.classList.add("si-active-source");
    const cloned = cloneElementWithStyles(target);
    let html = cloned.html;
    const bounds = target.getBoundingClientRect();
    const isPptx = target.hasAttribute("data-si-pptx-shape") || target.hasAttribute("data-si-pptx-image");
    let pptxCrop = null;
    if (isCell) {
      html = `<table class="si-selected-table" style="border-collapse:collapse;table-layout:auto;width:max-content"><tbody><tr>${html}</tr></tbody></table>`;
    } else if (isPptx) {
      const slide = target.closest("[data-slide]");
      const slideImage = slide?.querySelector("[data-si-slide-image]");
      if (slideImage?.src) {
        const slideRect = slide.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const crop = {
          x: Math.max(0, targetRect.left - slideRect.left),
          y: Math.max(0, targetRect.top - slideRect.top),
          w: Math.max(1, Math.min(slideRect.width, targetRect.right - Math.max(targetRect.left, slideRect.left))),
          h: Math.max(1, Math.min(slideRect.height, targetRect.bottom - Math.max(targetRect.top, slideRect.top))),
        };
        try {
          pptxCrop = await cropImageToCssRect(slideImage.src, crop, slideRect.width, slideRect.height);
        } catch {}
      }
      if (pptxCrop?.dataUrl) {
        html = `<img src="${escapeHtml(pptxCrop.dataUrl)}" alt="" draggable="false" style="display:block;max-width:100%;height:auto" />`;
      } else if (target.matches("img")) {
        html = `<img src="${escapeHtml(target.getAttribute("src") || "")}" alt="" draggable="false" style="display:block;max-width:100%;height:auto" />`;
      }
    }
    const sourceKey = target.getAttribute("data-si-element") || target.getAttribute("src") || target.outerHTML.slice(0, 160);
    const sourceId = `${file?.__siId || file?.name || "Document"}::visual-element::${sourceKey}`;
    const text = target.textContent || "";
    const computed = window.getComputedStyle(target);
    const style = {
      fontFamily: computed.fontFamily,
      fontSize: parseFloat(computed.fontSize) || 16,
      fontWeight: computed.fontWeight,
      fontStyle: computed.fontStyle,
      lineHeight: computed.lineHeight === "normal" ? 1.25 : parseFloat(computed.lineHeight) || 1.25,
      letterSpacing: parseFloat(computed.letterSpacing) || 0,
      wordSpacing: parseFloat(computed.wordSpacing) || 0,
      textAlign: computed.textAlign || "left"
    };
    const pptImage = isPptx && target.matches("img");
    const spreadsheet = isCell ? spreadsheetPayload(target) : undefined;
    if (spreadsheet) setLastSpreadsheetSelection(spreadsheet);
    onSelection({
      id: sourceId, sourceId, sourceElementId: target.getAttribute("data-si-element"),
      sourceFileId: file?.__siId || "", sourceFileName: file?.name || "Document",
      text, order: 0, visualKind: pptImage ? "image-selection" : "html-selection",
      html, style, spreadsheet,
      visual: isPptx && pptxCrop?.dataUrl
        ? { kind: "image", dataUrl: pptxCrop.dataUrl, width: pptxCrop.width, height: pptxCrop.height, aspectRatio: pptxCrop.width / Math.max(1, pptxCrop.height), sourceFaithful: true, sourceType: "pptx-rendered" }
        : pptImage
          ? { kind: "image", dataUrl: target.getAttribute("src") || "", width: bounds.width, height: bounds.height, aspectRatio: bounds.width / Math.max(1, bounds.height), sourceFaithful: true, sourceType: "pptx-image" }
          : { kind: "html", html, bounds: { x: bounds.left, y: bounds.top, width: bounds.width, height: bounds.height }, sourceFaithful: true }
    });
  }

  function handleMouseUp() {
    if (regionMode) return;
    const sel = window.getSelection();
    const text = sel?.toString() || "";
    if (!text.trim() || !ref.current || !sel.anchorNode || !ref.current.contains(sel.anchorNode)) return;
    const range = sel.getRangeAt(0);
    const cloned = cloneRangeWithStyles(range);
    const safeHtml = cloned.html?.trim() ? cloned.html : `<span>${escapeHtml(text)}</span>`;
    const sourceId = `${file?.__siId || file?.name || "DOCX"}::html-range::${text}::${range.startOffset}-${range.endOffset}`;
    const bounds = selectionMetadata(range);
    const parent = range.commonAncestorContainer.nodeType === 1 ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
    const computed = parent ? window.getComputedStyle(parent) : null;
    const style = computed ? { fontFamily: computed.fontFamily, fontSize: parseFloat(computed.fontSize) || 16, fontWeight: computed.fontWeight, fontStyle: computed.fontStyle, lineHeight: computed.lineHeight === "normal" ? 1.25 : parseFloat(computed.lineHeight) || 1.25, letterSpacing: parseFloat(computed.letterSpacing) || 0, wordSpacing: parseFloat(computed.wordSpacing) || 0, textAlign: computed.textAlign || "left" } : undefined;
    const item = { id: sourceId, sourceId, sourceElementId: sourceId, sourceFileId: file?.__siId || "", sourceFileName: file?.name || "DOCX", text, order: 0, visualKind: "html-selection", html: safeHtml, style, visual: { kind: "html", html: safeHtml, bounds, sourceFaithful: true } };
    onSelection(item);
    sel.removeAllRanges();
  }

  function spreadsheetCellStyle(cell) {
    const css = window.getComputedStyle(cell);
    const color = (value) => { const m = String(value || "").match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i); return m ? { argb: `FF${[m[1], m[2], m[3]].map((v) => Number(v).toString(16).padStart(2, "0")).join("").toUpperCase()}` } : undefined; };
    const fontColor = color(css.color);
    const bgColor = css.backgroundColor !== "rgba(0, 0, 0, 0)" ? color(css.backgroundColor) : undefined;
    const borderSide = (style, borderColor) => style && style !== "none" && style !== "0px" ? { style: style.includes("dashed") ? "dashed" : "thin", color: color(borderColor) } : undefined;
    const border = { top: borderSide(css.borderTopStyle, css.borderTopColor), right: borderSide(css.borderRightStyle, css.borderRightColor), bottom: borderSide(css.borderBottomStyle, css.borderBottomColor), left: borderSide(css.borderLeftStyle, css.borderLeftColor) };
    return { font: { name: css.fontFamily?.split(",")[0]?.replace(/["']/g, ""), size: Math.max(8, parseFloat(css.fontSize) || 11), bold: css.fontWeight === "bold" || Number(css.fontWeight) >= 600, italic: css.fontStyle === "italic", ...(fontColor ? { color: fontColor } : {}) }, alignment: { horizontal: ["left", "center", "right", "justify"].includes(css.textAlign) ? css.textAlign : "left", vertical: css.verticalAlign === "middle" ? "middle" : "top", wrapText: css.whiteSpace !== "nowrap" }, ...(bgColor ? { fill: { type: "pattern", pattern: "solid", fgColor: bgColor } } : {}), border };
  }

  function spreadsheetPayload(cell) {
    const row = Number(cell.dataset.siRow ?? 0);
    const col = Number(cell.dataset.siCol ?? 0);
    const matrix = [[cell.textContent || ""]];
    const formulas = [[cell.dataset.siFormula || ""]];
    const numFmts = [[cell.dataset.siNumfmt || ""]];
    const columnWidths = [Math.max(1, Math.round(cell.getBoundingClientRect().width))];
    const rowHeights = [Math.max(1, Math.round(cell.getBoundingClientRect().height))];
    return { sheetName: cell.dataset.siSheet || "Sheet1", row, col, matrix, formulas, numFmts, columnWidths, rowHeights, cellStyles: [[spreadsheetCellStyle(cell)]], axis: "cell", range: { startRow: row, endRow: row, startCol: col, endCol: col } };
  }

  function selectSpreadsheetAxis(axis, explicitTarget = null) {
    const container = ref.current;
    const target = explicitTarget || container?.querySelector("[data-si-cell].si-active-source");
    if (!target) return;
    const table = target.closest("table");
    const cells = table ? [...table.querySelectorAll("td[data-si-cell],th[data-si-cell]")] : [target];
    const row = Number(target.dataset.siRow ?? 0), col = Number(target.dataset.siCol ?? 0);
    const chosen = axis === "horizontal" ? cells.filter((c) => Number(c.dataset.siRow) === row).sort((a,b)=>Number(a.dataset.siCol)-Number(b.dataset.siCol)) : cells.filter((c) => Number(c.dataset.siCol) === col).sort((a,b)=>Number(a.dataset.siRow)-Number(b.dataset.siRow));
    if (!chosen.length) return;
    const matrix = axis === "horizontal" ? [chosen.map((c) => c.textContent || "")] : chosen.map((c) => [c.textContent || ""]);
    const clonedCells = chosen.map((c) => cloneElementWithStyles(c).html);
    chosen.forEach((cell) => cell.classList.add("si-xlsx-selected"));
    const htmlRows = axis === "horizontal" ? `<tr>${clonedCells.join("")}</tr>` : clonedCells.map((c)=>`<tr>${c}</tr>`).join("");
    const html = `<table class="si-selected-table" style="border-collapse:collapse;table-layout:auto;width:max-content"><tbody>${htmlRows}</tbody></table>`;
    const cellStyles = axis === "horizontal" ? [chosen.map(spreadsheetCellStyle)] : chosen.map((cell) => [spreadsheetCellStyle(cell)]);
    const formulas = axis === "horizontal" ? [chosen.map((cell) => cell.dataset.siFormula || "")] : chosen.map((cell) => [cell.dataset.siFormula || ""]);
    const numFmts = axis === "horizontal" ? [chosen.map((cell) => cell.dataset.siNumfmt || "")] : chosen.map((cell) => [cell.dataset.siNumfmt || ""]);
    const columnWidths = axis === "horizontal" ? chosen.map((cell) => Math.max(1, Math.round(cell.getBoundingClientRect().width))) : [Math.max(1, Math.round(chosen[0]?.getBoundingClientRect().width || 120))];
    const rowHeights = axis === "horizontal" ? [Math.max(1, Math.round(chosen[0]?.getBoundingClientRect().height || 24))] : chosen.map((cell) => Math.max(1, Math.round(cell.getBoundingClientRect().height || 24)));
    const spreadsheet = { sheetName: target.dataset.siSheet || "Sheet1", row, col, matrix, formulas, numFmts, columnWidths, rowHeights, cellStyles, axis, range: axis === "horizontal" ? { startRow: row, endRow: row, startCol: 0, endCol: Math.max(0, chosen.length - 1) } : { startRow: 0, endRow: Math.max(0, chosen.length - 1), startCol: col, endCol: col } };
    setLastSpreadsheetSelection(spreadsheet);
    const sourceId = `${file?.__siId || file?.name || "XLSX"}::xlsx-${axis}::${row}-${col}`;
    onSelection({ id: sourceId, sourceId, sourceElementId: sourceId, sourceFileId: file?.__siId || "", sourceFileName: "Spreadsheet", text: matrix.flat().join(" "), order: 0, visualKind: "html-selection", html, spreadsheet, visual: { kind: "html", html, sourceFaithful: true } });
  }

  async function copySpreadsheetSelection() {
    const matrix = lastSpreadsheetSelection?.matrix;
    if (!matrix?.length) return;
    const tsv = matrix.map((row) => row.map((cell) => String(cell ?? "").replace(/\t/g, " ").replace(/\r?\n/g, " ")).join("\t")).join("\n");
    try { await navigator.clipboard.writeText(tsv); toast.success("Selected spreadsheet range copied."); } catch { try { const area = document.createElement("textarea"); area.value = tsv; area.style.position = "fixed"; area.style.opacity = "0"; document.body.appendChild(area); area.select(); const ok = document.execCommand("copy"); area.remove(); if (ok) toast.success("Selected spreadsheet range copied."); else toast.error("Clipboard access was blocked. Select and copy the range manually."); } catch { toast.error("Clipboard access was blocked. Select and copy the range manually."); } }
  }

  function beginRegion(event) {
    if (!regionMode) return;
    const container = ref.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    event.preventDefault();
    const start = { x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)), y: Math.max(0, Math.min(rect.height, event.clientY - rect.top)) };
    const move = (moveEvent) => {
      const x = Math.max(0, Math.min(rect.width, moveEvent.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, moveEvent.clientY - rect.top));
      const next = { x: Math.min(start.x, x), y: Math.min(start.y, y), w: Math.max(1, Math.abs(x - start.x)), h: Math.max(1, Math.abs(y - start.y)) };
      dragRectRef.current = next;
      setDragRect(next);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const r = dragRectRef.current;
      dragRectRef.current = null;
      setDragRect(null);
      if (!r || r.w < 2 || r.h < 2) return;
      const elements = [...container.querySelectorAll("img, table, pre, p, h1, h2, h3, h4, h5, h6, li, [data-si-element]")];
      const selected = elements.filter((el) => {
        const b = el.getBoundingClientRect();
        const x = b.left - rect.left, y = b.top - rect.top;
        return x < r.x + r.w && x + b.width > r.x && y < r.y + r.h && y + b.height > r.y;
      });
      const source = selected.length ? selected.map((el) => el.outerHTML).join("") : `<div style="min-width:${r.w}px;min-height:${r.h}px"></div>`;
      const sourceId = `${file?.__siId || file?.name || "Document"}::html-region::${Math.round(r.x)}-${Math.round(r.y)}-${Math.round(r.w)}-${Math.round(r.h)}`;
      onSelection({ id: sourceId, sourceId, sourceElementId: sourceId, sourceFileId: file?.__siId || "", sourceFileName: file?.name || "Document", text: selected.map((el) => el.textContent || "").join(" ").trim(), order: 0, visualKind: "html-region", visual: { kind: "html", html: source, bounds: r, sourceFaithful: true } });
      setRegionMode(false);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  }

  return <div className="relative">
    <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
      {visual.html.includes("data-si-cell") && <span className="mr-auto rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-800">Drag from a start cell to an end cell to select the inclusive rectangular range across rows and columns.</span>}
      {visual.html.includes("data-si-cell") && <>
        <button type="button" className="btn-secondary !px-2.5 !py-1.5" onClick={() => selectSpreadsheetAxis("horizontal")}>↔ Select row</button>
        <button type="button" className="btn-secondary !px-2.5 !py-1.5" onClick={() => selectSpreadsheetAxis("vertical")}>↕ Select column</button>
        <button type="button" className="btn-secondary !px-2.5 !py-1.5" disabled={!lastSpreadsheetSelection?.matrix?.length} onClick={copySpreadsheetSelection}>Copy selected range</button>
      </>}
      <button type="button" className={`btn-secondary !px-2.5 !py-1.5 ${regionMode ? "!border-emerald-400 !bg-emerald-50 !text-emerald-700" : ""}`} onClick={() => setRegionMode((v) => !v)}><Crop size={14} /> {regionMode ? "Exit region" : "Select image/region"}</button>
    </div>
    <div ref={ref} onClick={handleClick} onMouseDown={handleSpreadsheetMouseDown} onMouseUp={(event) => { handleSpreadsheetMouseUp(event); handleMouseUp(event); }} onPointerDown={(event) => { if (event.pointerType === "touch" || event.pointerType === "pen") handleSpreadsheetMouseDown(event); beginRegion(event); }} onPointerUp={(event) => { if (event.pointerType === "touch" || event.pointerType === "pen") { handleSpreadsheetMouseUp(event); handleMouseUp(event); } }} className={`docx-visual rounded-2xl bg-white p-8 shadow-xl ${regionMode ? "cursor-crosshair touch-none" : ""}`} dangerouslySetInnerHTML={{ __html: visual.html }} />
    {dragRect && <div className="pointer-events-none absolute border-2 border-emerald-500 bg-emerald-200/20" style={{ left: dragRect.x, top: dragRect.y, width: dragRect.w, height: dragRect.h }} />}
  </div>;
}

function ImageVisual({ visual, file, onSelection }) {
  const ref = useRef(null);
  const [regionMode, setRegionMode] = useState(false);
  const [dragRect, setDragRect] = useState(null);
  const dragRectRef = useRef(null);

  function selectImage() {
    if (regionMode) return;
    const sourceId = `${file?.__siId || file?.name || "image"}::image`;
    onSelection({ id: sourceId, sourceId, sourceElementId: sourceId, sourceFileId: file?.__siId || "", sourceFileName: file?.name || "", text: "", order: 0, visualKind: "image-selection", visual: { ...visual, sourceFaithful: true }, layout: { width: visual.width, height: visual.height, aspectRatio: visual.aspectRatio } });
  }

  function beginRegion(event) {
    if (!regionMode) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    event.preventDefault();
    const start = { x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)), y: Math.max(0, Math.min(rect.height, event.clientY - rect.top)) };
    const move = (moveEvent) => {
      const x = Math.max(0, Math.min(rect.width, moveEvent.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, moveEvent.clientY - rect.top));
      const next = { x: Math.min(start.x, x), y: Math.min(start.y, y), w: Math.max(1, Math.abs(x - start.x)), h: Math.max(1, Math.abs(y - start.y)) };
      dragRectRef.current = next;
      setDragRect(next);
    };
    const up = async () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const r = dragRectRef.current;
      dragRectRef.current = null;
      setDragRect(null);
      if (!r || r.w < 2 || r.h < 2) return;
      const image = await cropRenderedDataUrl(visual.dataUrl, r);
      const sourceId = `${file?.__siId || file?.name || "image"}::region::${Math.round(r.x)}-${Math.round(r.y)}-${Math.round(r.w)}-${Math.round(r.h)}`;
      const naturalScaleX = visual.width / Math.max(1, rect.width);
      const naturalScaleY = visual.height / Math.max(1, rect.height);
      const width = r.w * naturalScaleX, height = r.h * naturalScaleY;
      onSelection({ id: sourceId, sourceId, sourceElementId: sourceId, sourceFileId: file?.__siId || "", sourceFileName: file?.name || "", text: "", order: 0, visualKind: "image-selection", visual: { kind: "image", dataUrl: image, width, height, aspectRatio: width / Math.max(1, height), sourceFaithful: true } });
      setRegionMode(false);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  }

  return <div className="rounded-2xl border border-slate-200 bg-slate-100 p-3">
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-600"><span><ImageIcon size={15} className="mr-1 inline" /> Select image to add it, or capture a precise region.</span><button type="button" className={`btn-secondary !px-2.5 !py-1.5 ${regionMode ? "!border-emerald-400 !bg-emerald-50 !text-emerald-700" : ""}`} onClick={() => setRegionMode((v) => !v)}><Crop size={14} /> {regionMode ? "Exit region" : "Select image/region"}</button></div>
    <div ref={ref} onPointerDown={beginRegion} className={`relative mx-auto w-fit max-w-full overflow-hidden rounded-xl bg-white p-3 shadow-sm ${regionMode ? "cursor-crosshair touch-none" : ""}`}>
      <button type="button" onClick={selectImage} className="group block cursor-pointer rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-emerald-400">
        <img src={visual.dataUrl} alt="Uploaded document" draggable={false} className="mx-auto max-h-[720px] max-w-full object-contain transition group-hover:opacity-90" />
      </button>
      {dragRect && <div className="pointer-events-none absolute border-2 border-emerald-500 bg-emerald-200/20" style={{ left: dragRect.x, top: dragRect.y, width: dragRect.w, height: dragRect.h }} />}
    </div>
  </div>;
}

function boundsOf(items) {
  const x = Math.min(...items.map((i) => i.x)); const y = Math.min(...items.map((i) => i.y));
  const right = Math.max(...items.map((i) => i.x + i.width)); const bottom = Math.max(...items.map((i) => i.y + i.height));
  return { x, y, width: right - x, height: bottom - y };
}

async function cropImageToCssRect(dataUrl, rect, cssWidth, cssHeight) {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  const scaleX = image.naturalWidth / Math.max(1, cssWidth);
  const scaleY = image.naturalHeight / Math.max(1, cssHeight);
  const sx = Math.max(0, Math.round(rect.x * scaleX));
  const sy = Math.max(0, Math.round(rect.y * scaleY));
  const sw = Math.max(1, Math.min(image.naturalWidth - sx, Math.round(rect.w * scaleX)));
  const sh = Math.max(1, Math.min(image.naturalHeight - sy, Math.round(rect.h * scaleY)));
  const canvas = document.createElement("canvas");
  canvas.width = sw; canvas.height = sh;
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, sw, sh);
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
  return { dataUrl: canvas.toDataURL("image/png"), width: sw, height: sh };
}

async function cropRenderedDataUrl(dataUrl, rect, pixelRatio = window.devicePixelRatio || 1) {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  const sx = Math.max(0, Math.round((rect.x || 0) * pixelRatio));
  const sy = Math.max(0, Math.round((rect.y || 0) * pixelRatio));
  const sw = Math.max(1, Math.round((rect.w ?? rect.width ?? 1) * pixelRatio));
  const sh = Math.max(1, Math.round((rect.h ?? rect.height ?? 1) * pixelRatio));
  const safeW = Math.max(1, Math.min(sw, image.naturalWidth - sx));
  const safeH = Math.max(1, Math.min(sh, image.naturalHeight - sy));
  const canvas = document.createElement("canvas");
  canvas.width = safeW; canvas.height = safeH;
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, safeW, safeH);
  ctx.drawImage(image, sx, sy, safeW, safeH, 0, 0, safeW, safeH);
  return canvas.toDataURL("image/png");
}

async function cropDataUrl(dataUrl, rect, scale, pixelRatio = window.devicePixelRatio || 1) {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  const sx = Math.max(0, Math.round((rect.x || 0) * scale * pixelRatio));
  const sy = Math.max(0, Math.round((rect.y || 0) * scale * pixelRatio));
  const sw = Math.max(1, Math.round((rect.width || rect.w || 1) * scale * pixelRatio));
  const sh = Math.max(1, Math.round((rect.height || rect.h || 1) * scale * pixelRatio));
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, sw, sh);
  ctx.drawImage(image, sx, sy, Math.min(sw, image.naturalWidth - sx), Math.min(sh, image.naturalHeight - sy), 0, 0, sw, sh);
  return canvas.toDataURL("image/png");
}

function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c])); }

function highlightHtml(html, query) {
  if (!query.trim()) return html;
  const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.replace(new RegExp(`(${safe})`, "ig"), '<mark class="rounded bg-yellow-200/70">$1</mark>');
}
