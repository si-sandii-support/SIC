import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { AlertCircle, FileText, GripVertical, Plus, Search, UploadCloud, X, Zap } from "lucide-react";
import { ContentBlock } from "./ContentBlock";
import { VisualDocument } from "./VisualDocument";

export const DocumentViewer = React.memo(function DocumentViewer({
  active,
  blocks,
  query,
  searchValue,
  onSearch,
  selected,
  onAdd,
  onElementSelect,
  activeSelection,
  onClearSelection,
  restoringFiles = false,
}) {
  return (
    <section className="card min-w-0 overflow-hidden">
      <div className="border-b border-slate-100 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate font-black">{active?.name || "Document viewer"}</h2>
            <p className="text-xs text-slate-400">
              {active ? `${active.blocks.length} extracted sections · visual layout preserved where supported` : "Upload and choose a document"}
            </p>
          </div>
          {active && <div className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">Select → ready to drag · source stays unchanged</div>}
        </div>

        {active?.status === "ready" && (
          <>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input value={searchValue} onChange={(e) => onSearch(e.target.value)} className="input pl-9 pr-16" placeholder="Search extracted content…" aria-label="Search extracted document content" />
              {searchValue && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">{blocks.length} matches</span>}
            </div>
            {activeSelection && (
              <SelectionActionBar block={activeSelection} onAdd={onAdd} onClear={onClearSelection} />
            )}
          </>
        )}
      </div>

      <div className="min-h-[420px] max-h-[900px] overflow-auto p-3 sm:p-4">
        {!active ? <Empty icon={<UploadCloud />} title="Your workspace is ready" text="Upload your first document or drop multiple files into the hero area." />
          : restoringFiles && !active.file && ["pdf", "html", "image"].includes(active.visual?.kind) ? <Empty icon={<Zap className="animate-pulse" />} title="Restoring document view" text="Loading the cached original file while the extracted layout stays available." />
          : active.status === "processing" ? <Empty icon={<Zap className="animate-pulse" />} title="Extracting document content" text="The file is being prepared. You can upload more files while this runs." />
          : active.status === "error" ? <Empty icon={<AlertCircle />} title="Could not extract this file" text={active.error || "Try another supported document."} />
          : !blocks.length ? <Empty icon={<Search />} title={query ? "No matching content" : "No extractable content"} text={query ? "Try another search term." : "This document has no extractable text."} />
          : ["html", "pdf", "image"].includes(active.visual?.kind) && !(active.visual?.kind === "pdf" && !active.file) ? (
            <VisualDocument visual={active.visual} file={active.file} query={query} onSelection={onElementSelect} selectedIds={selected.map((item) => item.id)} />
          ) : (
            <div className="space-y-3">{blocks.map((block) => <ContentBlock key={block.id} block={block} selected={selected.some((item) => item.sourceId === block.id || item.id === block.id)} activeSelection={activeSelection} onAdd={onAdd} onSelect={onElementSelect} query={query} />)}</div>
          )}
      </div>
    </section>
  );
});

function SelectionActionBar({ block, onAdd, onClear }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `selection-action-${block.id}`,
    data: { type: "selection", block },
  });
  const style = transform ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)` } : undefined;
  const label = block.text?.trim() || "Visual selection";
  return (
    <div ref={setNodeRef} style={style} className={`mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 shadow-sm ${isDragging ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 text-xs font-bold text-emerald-800">
          Selected: <span className="font-semibold">{label.slice(0, 110)}{label.length > 110 ? "…" : ""}</span>
          <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[9px] uppercase tracking-wide text-emerald-700">Auto-added · ready to duplicate</span>
        </span>
        <button type="button" {...listeners} {...attributes} className="btn-primary !cursor-grab !px-2.5 !py-1.5 active:!cursor-grabbing">
          <GripVertical size={14} /> Drag selected
        </button>
        <button type="button" onClick={() => onAdd(block)} className="btn-secondary !px-2.5 !py-1.5">
          <Plus size={14} /> Duplicate
        </button>
        <button type="button" onClick={onClear} className="rounded-lg p-1.5 text-emerald-700 hover:bg-emerald-100" aria-label="Clear current selection">
          <X size={15} />
        </button>
      </div>
      <p className="mt-1 text-[10px] font-semibold text-emerald-700/70">The selection is added automatically. Drag it again to create another independent copy; the extracted document always stays unchanged.</p>
    </div>
  );
}

function Empty({ icon, title, text }) { return <div className="grid min-h-[420px] sm:min-h-[540px] place-items-center rounded-2xl bg-slate-50 p-8 text-center"><div><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white shadow-sm">{icon}</div><h3 className="mt-4 font-black">{title}</h3><p className="mt-1 max-w-sm text-sm leading-6 text-slate-400">{text}</p></div></div>; }
