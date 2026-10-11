import React from "react";
import toast from "react-hot-toast";
import { useDraggable } from "@dnd-kit/core";
import { AlertCircle, Clipboard, Copy, FileText, GripVertical, Plus, Search, UploadCloud, X, Zap } from "lucide-react";
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
  onAddMobile,
  onElementSelect,
  activeSelection,
  onClearSelection,
  restoringFiles = false,
}) {
  const [showMobileCopyButton, setShowMobileCopyButton] = React.useState(false);

  React.useEffect(() => {
    // Show the explicit tap-to-copy control only on Android and Apple touch devices.
    // iPadOS can identify itself as Macintosh, so include touch-capable iPads.
    const ua = navigator.userAgent || "";
    const isAppleTouch = /iPhone|iPad|iPod/i.test(ua) ||
      (/Macintosh/i.test(ua) && Number(navigator.maxTouchPoints || 0) > 1);
    setShowMobileCopyButton(/Android/i.test(ua) || isAppleTouch);
  }, []);

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
          {active && <div className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">Tap Copy element or select a region · source stays unchanged</div>}
        </div>

        {active?.status === "ready" && (
          <>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input value={searchValue} onChange={(e) => onSearch(e.target.value)} className="input pl-9 pr-16" placeholder="Search extracted content…" aria-label="Search extracted document content" />
              {searchValue && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">{blocks.length} matches</span>}
            </div>
            {activeSelection && (
              <SelectionActionBar block={activeSelection} onAdd={onAddMobile || onAdd} onClear={onClearSelection} showMobileCopyButton={showMobileCopyButton} />
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
            <div className="space-y-3">{blocks.map((block) => <ContentBlock key={block.id} block={block} selected={selected.some((item) => item.sourceId === block.id || item.id === block.id)} activeSelection={activeSelection} onAdd={onAdd} onAddMobile={onAddMobile || onAdd} onSelect={onElementSelect} query={query} showMobileCopyButton={showMobileCopyButton} />)}</div>
          )}
      </div>
    </section>
  );
});

function SelectionActionBar({ block, onAdd, onClear, showMobileCopyButton }) {
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
          <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[9px] uppercase tracking-wide text-emerald-700">Selection ready</span>
        </span>
        <button type="button" {...listeners} {...attributes} className="btn-primary !cursor-grab !px-2.5 !py-1.5 active:!cursor-grabbing">
          <GripVertical size={14} /> Drag selected
        </button>
        <button type="button" onClick={() => copySelectionText(block)} className="btn-secondary min-h-11 !px-3 !py-2" aria-label="Copy selected content text to device clipboard">
          <Copy size={14} /> Copy text
        </button>
        {showMobileCopyButton && <button type="button" onClick={(event) => copyIntoSelected(event, block, onAdd)} className="btn-primary min-h-11 !px-3 !py-2 touch-manipulation" aria-label="Paste the selected image, text, line, table, or region into the Selected Content container" title="Adds an independent copy inside SIC with supported layout and visual data">
          <Clipboard size={14} /> Paste to Selected
        </button>}
        <button type="button" onClick={onClear} className="rounded-lg p-1.5 text-emerald-700 hover:bg-emerald-100" aria-label="Clear current selection">
          <X size={15} />
        </button>
      </div>
      {showMobileCopyButton && <p className="mt-1 text-[10px] font-semibold text-emerald-700/70">Tap Paste to Selected to add an independent copy of this selected content. Dragging is optional.</p>}
    </div>
  );
}

function copyIntoSelected(event, block, onAdd) {
  event.preventDefault();
  event.stopPropagation();
  if (!block || typeof onAdd !== "function") {
    toast.error("Could not copy this selection. Please select the content again.");
    return;
  }
  const payload = { ...block };
  if (!payload.id) payload.id = payload.sourceId || `mobile-copy-${Date.now()}`;
  if (typeof payload.text !== "string") payload.text = payload.text == null ? "" : String(payload.text);
  // Some extractors keep the faithful markup at the top level instead of visual.html.
  // Normalize it before handing it to the same app copy pipeline used on desktop.
  if (!payload.visual && typeof payload.html === "string" && payload.html.trim()) {
    payload.visual = { kind: "html", html: payload.html };
  }
  if (!payload.visual && payload.dataUrl) {
    payload.visual = { kind: "image", dataUrl: payload.dataUrl, width: payload.width, height: payload.height };
  }
  if (!payload.text.trim() && !payload.visual) {
    toast.error("This selection has no copyable content. Select text, an image, a table, or a region first.");
    return;
  }
  try {
    onAdd(payload);
    toast.success("Copied to Selected Content.");
  } catch {
    toast.error("Copy failed. Please try selecting the content again.");
  }
}

function Empty({ icon, title, text }) { return <div className="grid min-h-[420px] sm:min-h-[540px] place-items-center rounded-2xl bg-slate-50 p-8 text-center"><div><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white shadow-sm">{icon}</div><h3 className="mt-4 font-black">{title}</h3><p className="mt-1 max-w-sm text-sm leading-6 text-slate-400">{text}</p></div></div>; }

async function copySelectionText(block) {
  const text = String(block?.text || "").trim();
  if (!text) {
    toast.error("This selection has no text to copy.");
    return;
  }
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const field = document.createElement("textarea");
      field.value = text;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      const copied = document.execCommand("copy");
      field.remove();
      if (!copied) throw new Error("Clipboard access is unavailable");
    }
    toast.success("Selected text copied to clipboard.");
  } catch {
    toast.error("Clipboard access was blocked. Use your device's Copy option or Paste another copy.");
  }
}
