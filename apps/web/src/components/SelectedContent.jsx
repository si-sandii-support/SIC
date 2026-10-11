import React from "react";
import { FileOutput, Search, X, LayoutGrid, LayoutList } from "lucide-react";
import { SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { SelectedItem } from "./SelectedItem";

export const SelectedContent = React.memo(function SelectedContent({ selected, totalSelected, selectedQuery, onSearch, selectedWords, selectedChars, isOver, setNodeRef, onRemove, onClear, onEdit, onStyleChange, selectedLayout = "vertical", onLayoutChange = () => {} }) {
  return (
    <section id="selected-content" ref={setNodeRef} className={`card min-w-0 overflow-hidden transition ${isOver ? "ring-2 ring-emerald-400" : ""}`}>
      <div className="border-b border-slate-100 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0"><h2 className="font-black">Selected Content</h2><p className="text-xs text-slate-400">{totalSelected} copies · {selectedWords} words · {selectedChars} chars · source remains unchanged</p></div>
          <div className="flex items-center gap-2">
            {totalSelected > 0 && <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1" aria-label="Selected content layout">
              <button type="button" onClick={() => onLayoutChange("vertical")} aria-pressed={selectedLayout === "vertical"} className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold ${selectedLayout === "vertical" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-white"}`}><LayoutList size={14} /> Vertical</button>
              <button type="button" onClick={() => onLayoutChange("horizontal")} aria-pressed={selectedLayout === "horizontal"} className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold ${selectedLayout === "horizontal" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-white"}`}><LayoutGrid size={14} /> Horizontal</button>
            </div>}
            {totalSelected > 0 && <button onClick={onClear} className="shrink-0 text-xs font-bold text-red-500 hover:text-red-600">Clear all</button>}
          </div>
        </div>
        {totalSelected > 0 && <div className="relative mt-3"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} /><input value={selectedQuery} onChange={(e) => onSearch(e.target.value)} className="input pl-9 pr-8" placeholder="Search selected content…" aria-label="Search selected content" />{selectedQuery && <button onClick={() => onSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Clear selected content search"><X size={14} /></button>}</div>}
      </div>
      <div className={`min-h-[420px] max-h-[760px] overscroll-contain p-3 pr-2 sm:min-h-[575px] sm:max-h-[820px] sm:p-4 sm:pr-3 ${selectedLayout === "horizontal" ? "overflow-auto" : "overflow-y-auto overflow-x-hidden"}`}>
        <div className="mb-3 flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-800">
          <span>Auto-add on selection · drag to duplicate · layout applies to exports</span><span className="rounded-full bg-emerald-600 px-2 py-0.5 text-white">AUTO · COPY</span>
        </div>
        {!totalSelected ? <DropEmpty isOver={isOver} /> : !selected.length ? <div className="grid min-h-[300px] place-items-center rounded-2xl bg-slate-50 p-6 text-center"><div><Search className="mx-auto text-slate-400" /><p className="mt-3 text-sm font-black">No selected content matches</p><p className="mt-1 text-xs text-slate-400">Try a different search term.</p></div></div> : (
          <SortableContext items={selected.map((item) => item.id)} strategy={selectedLayout === "horizontal" ? horizontalListSortingStrategy : verticalListSortingStrategy}>
            <div className={selectedLayout === "horizontal" ? "flex min-w-max items-start gap-3 pb-2" : "space-y-3"}>{selected.map((block) => <SelectedItem key={block.id} block={block} layoutMode={selectedLayout} onRemove={onRemove} onEdit={onEdit} onStyleChange={onStyleChange} />)}</div>
          </SortableContext>
        )}
      </div>
    </section>
  );
});
function DropEmpty({ isOver }) { return <div className={`grid min-h-[390px] sm:min-h-[540px] place-items-center rounded-2xl border-2 border-dashed p-6 text-center transition ${isOver ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}><div><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white shadow-sm"><FileOutput className="text-slate-400" /></div><p className="mt-3 text-sm font-black">Drop content here</p><p className="mt-1 max-w-xs text-xs leading-5 text-slate-400">Selecting content automatically adds one editable copy here. Drag the selected source again to duplicate it. Images, text and original layout are preserved from the source; each copy can be styled independently.</p></div></div>; }
