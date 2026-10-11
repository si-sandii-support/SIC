import React, { memo, useEffect, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlignCenter, AlignLeft, AlignRight, Bold, GripVertical, Italic, Save, Trash2 } from "lucide-react";

export const SelectedItem = memo(function SelectedItem({ block, onRemove, onEdit, onStyleChange, layoutMode = "vertical" }) {
  const [draft, setDraft] = useState(block.text ?? "");
  const [editing, setEditing] = useState(false);
  const [fontSize, setFontSize] = useState(block.style?.fontSize || 16);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });

  useEffect(() => setDraft(block.text ?? ""), [block.text]);
  useEffect(() => setFontSize(block.style?.fontSize || 16), [block.style?.fontSize]);

  function save() {
    onEdit(block.id, draft);
    setEditing(false);
  }
  function cancel() {
    setDraft(block.text ?? "");
    setEditing(false);
  }
  function style(patch) { onStyleChange?.(block.id, patch); }

  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.65 : 1 }}
      className={`rounded-2xl border border-slate-200 bg-white p-2 shadow-sm ${layoutMode === "horizontal" ? "w-[min(78vw,440px)] min-w-[280px] max-w-[440px] flex-none" : "w-full"}`}
    >
      <div className="flex gap-2">
        <button {...listeners} {...attributes} className="mt-1 shrink-0 cursor-grab touch-none text-slate-300 hover:text-slate-500" aria-label="Reorder selected content">
          <GripVertical size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="flex shrink-0 items-center gap-1">
              {!editing && <button onClick={() => setEditing(true)} className="rounded-lg px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50">Edit</button>}
              {editing && <>
                <button onClick={cancel} className="rounded-lg px-2 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-100">Cancel</button>
                <button onClick={save} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"><Save size={12} />Save</button>
              </>}
              <button onClick={() => onRemove(block.id)} className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500" aria-label="Remove selected content"><Trash2 size={15} /></button>
            </div>
          </div>

          <StyleBar block={block} fontSize={fontSize} setFontSize={setFontSize} onStyle={style} />

          {editing ? (
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="input mt-2 min-h-28 resize-y leading-6"
              style={editableStyle(block)}
              aria-label="Edit selected content"
              autoFocus
            />
          ) : <VisualSelection block={block} />}
        </div>
      </div>
    </article>
  );
});

function StyleBar({ block, fontSize, setFontSize, onStyle }) {
  const current = block.style || {};
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50 p-1.5">
      <button type="button" onClick={() => onStyle({ textAlign: "left" })} className="tool-btn" aria-label="Align left"><AlignLeft size={14} /></button>
      <button type="button" onClick={() => onStyle({ textAlign: "center" })} className="tool-btn" aria-label="Align center"><AlignCenter size={14} /></button>
      <button type="button" onClick={() => onStyle({ textAlign: "right" })} className="tool-btn" aria-label="Align right"><AlignRight size={14} /></button>
      <button type="button" onClick={() => onStyle({ fontWeight: current.fontWeight === 700 ? 400 : 700 })} className={`tool-btn ${current.fontWeight >= 600 ? "bg-emerald-100 text-emerald-700" : ""}`} aria-label="Bold"><Bold size={14} /></button>
      <button type="button" onClick={() => onStyle({ fontStyle: current.fontStyle === "italic" ? "normal" : "italic" })} className={`tool-btn ${current.fontStyle === "italic" ? "bg-emerald-100 text-emerald-700" : ""}`} aria-label="Italic"><Italic size={14} /></button>
      <select value={current.fontFamily || "Arial, sans-serif"} onChange={(e) => onStyle({ fontFamily: e.target.value })} className="h-7 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold" aria-label="Font family">
        <option value="Arial, sans-serif">Arial</option>
        <option value="Georgia, serif">Georgia</option>
        <option value="Times New Roman, serif">Times New Roman</option>
        <option value="Verdana, sans-serif">Verdana</option>
        <option value="Courier New, monospace">Courier New</option>
      </select>
      <label className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
        Size
        <input type="number" min="6" max="96" step="1" value={fontSize} onChange={(e) => { const n = Math.max(6, Math.min(96, Number(e.target.value) || 16)); setFontSize(n); onStyle({ fontSize: n }); }} className="h-7 w-14 rounded-lg border border-slate-200 bg-white px-2 text-[11px]" />
      </label>
      <label className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
        Spacing
        <input type="number" step="0.5" value={current.letterSpacing ?? 0} onChange={(e) => onStyle({ letterSpacing: Number(e.target.value) || 0 })} className="h-7 w-14 rounded-lg border border-slate-200 bg-white px-2 text-[11px]" />
      </label>
      <label className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
        Line
        <input type="number" min="0.7" max="3" step="0.05" value={current.lineHeight ?? 1.25} onChange={(e) => onStyle({ lineHeight: Number(e.target.value) || 1.25 })} className="h-7 w-14 rounded-lg border border-slate-200 bg-white px-2 text-[11px]" />
      </label>
      {block.visual?.kind === "image" && <label className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
        Image W
        <input type="number" min="20" max="3000" step="1" value={current.width ?? block.visual.width ?? 300} onChange={(e) => onStyle({ width: Math.max(20, Number(e.target.value) || block.visual.width || 300) })} className="h-7 w-16 rounded-lg border border-slate-200 bg-white px-2 text-[11px]" />
      </label>}
    </div>
  );
}

function editableStyle(block) {
  const style = block.style || {};
  return {
    textAlign: style.textAlign || "left",
    fontFamily: style.fontFamily || "Arial, sans-serif",
    fontSize: `${style.fontSize || 16}px`,
    fontWeight: style.fontWeight || 400,
    fontStyle: style.fontStyle || "normal",
    lineHeight: style.lineHeight || 1.25,
    letterSpacing: `${style.letterSpacing || 0}px`,
    wordSpacing: `${style.wordSpacing || 0}px`,
  };
}

function VisualSelection({ block }) {
  const style = editableStyle(block);
  const visualLayout = block.layout || block.visual || {};
  if (block.visual?.kind === "image") {
    const width = block.style?.width || block.visual.width;
    return <div className="mt-3 overflow-auto rounded-xl border border-slate-100 bg-slate-50 p-3" style={{ textAlign: style.textAlign }}>
      <img src={block.visual.dataUrl} alt="Selected document image" className="inline-block max-w-none object-contain" style={{ width: width ? `${width}px` : undefined, height: block.style?.height ? `${block.style.height}px` : undefined }} draggable={false} />
    </div>;
  }
  if (block.visual?.kind === "pdf-selection") return <PdfSelection block={block} style={style} />;
  if (block.visual?.kind === "html" && block.spreadsheet) return <div className="si-selected-spreadsheet-viewport mt-3 rounded-xl border border-slate-100 bg-white" role="region" aria-label="Selected spreadsheet content" tabIndex={0}><div className="si-selected-spreadsheet docx-visual" dangerouslySetInnerHTML={{ __html: block.visual.html || block.html }} /></div>;
  if (block.visual?.kind === "html") return <div className="docx-visual mt-3 overflow-auto rounded-xl border border-slate-100 bg-white p-3" style={style} dangerouslySetInnerHTML={{ __html: block.visual.html }} />;
  return <div className="mt-3 overflow-auto rounded-xl border border-slate-100 bg-white p-4 whitespace-pre-wrap" style={{ ...style, margin: 0 }}>{block.text}</div>;
}

function PdfSelection({ block, style }) {
  const { fragments = [], bounds, dataUrl, renderScale = 1 } = block.visual;
  const width = Math.max(1, (bounds?.width || 1) * renderScale);
  const height = Math.max(1, (bounds?.height || 1) * renderScale);
  if (dataUrl) {
    return <div className="mt-3 overflow-auto rounded-xl border border-slate-100 bg-slate-50 p-3" style={{ textAlign: style.textAlign }}>
      <div className="inline-block align-top bg-white shadow-sm" style={{ width, minWidth: width }}>
        <img src={dataUrl} alt="Selected document content" className="block max-w-none" style={{ width, height, objectFit: "fill" }} draggable={false} />
      </div>
    </div>;
  }
  return <div className="mt-3 overflow-auto rounded-xl border border-slate-100 bg-white p-4 whitespace-pre-wrap" style={style}>
    {fragments.map((fragment, index) => <span key={index} style={{ fontFamily: fragment.fontFamily || style.fontFamily, fontSize: `${fragment.fontSize || style.fontSize || 16}px`, fontWeight: fragment.fontWeight || style.fontWeight || 400, fontStyle: fragment.italic ? "italic" : style.fontStyle, whiteSpace: "pre" }}>{fragment.text}</span>)}
  </div>;
}
