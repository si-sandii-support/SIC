import React, { Fragment, memo } from "react";
import { Check, GripVertical, Plus } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { cloneRangeWithStyles } from "../lib/htmlSelection";

export const ContentBlock = memo(function ContentBlock({ block, selected, activeSelection, onAdd, onSelect, query }) {
  function captureSelection(event) {
    const sel = window.getSelection();
    const text = sel?.toString() || "";
    if (!text.trim() || !event.currentTarget.contains(sel.anchorNode)) return;
    const range = sel.getRangeAt(0);
    const cloned = cloneRangeWithStyles(range);
    const safeHtml = cloned.html?.trim() ? cloned.html : `<span>${escapeHtml(text)}</span>`;
    const sourceId = `${block.id}::range::${text}::${range.startOffset}-${range.endOffset}`;
    const item = {
      id: sourceId,
      sourceId,
      sourceElementId: sourceId,
      sourceFileId: block.sourceFileId,
      sourceFileName: block.sourceFileName,
      page: block.page,
      text,
      order: 0,
      visualKind: "html-selection",
      html: safeHtml,
      layout: block.layout ? { ...block.layout } : undefined,
      style: block.style ? { ...block.style } : undefined,
      visual: { kind: "html", html: safeHtml, sourceBounds: undefined },
    };
    onSelect?.(item);
    sel.removeAllRanges();
  }

  const hasCopies = selected;
  const isActiveSelection = Boolean(activeSelection?.sourceFileId === block.sourceFileId && activeSelection?.sourceId?.startsWith(`${block.id}::`));
  const draggableBlock = isActiveSelection ? activeSelection : null;
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `text-selection-${block.id}`,
    disabled: !isActiveSelection,
    data: { type: "selection", block: draggableBlock },
  });
  const dragStyle = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <article ref={setNodeRef} style={dragStyle} className={`rounded-2xl border p-4 transition ${hasCopies ? "border-emerald-300 bg-emerald-50/60" : "border-slate-200 bg-white hover:border-slate-300"}`}>
      <div className="flex gap-3">
        <div className="min-w-0 flex-1" onMouseUp={captureSelection}>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {block.page && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Page {block.page}</span>}
            <span className="text-[10px] font-semibold text-slate-400">Select a text range to make it draggable</span>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{highlight(block.text, query)}</p>
        </div>
        {isActiveSelection && <button {...listeners} {...attributes} type="button" className="mt-1 shrink-0 cursor-grab touch-none rounded-lg bg-emerald-50 p-2 text-emerald-600 hover:bg-emerald-100 active:cursor-grabbing" aria-label="Drag selected content as a copy"><GripVertical size={16} /></button>}
        <button onClick={() => onAdd(block)} className={hasCopies ? "btn-secondary !rounded-lg !px-2.5 !py-2 text-emerald-600" : "btn-secondary !rounded-lg !px-2.5 !py-2"} aria-label={hasCopies ? "Copy this content again" : "Copy content to selected"}>
          {hasCopies ? <Check size={16} /> : <Plus size={16} />}
        </button>
      </div>
    </article>
  );
});
function highlight(text, query) { if (!query) return text; const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, "ig")); return <Fragment>{parts.map((part, index) => part.toLowerCase() === query.toLowerCase() ? <mark key={index} className="rounded bg-emerald-200 px-0.5">{part}</mark> : part)}</Fragment>; }
function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c])); }
