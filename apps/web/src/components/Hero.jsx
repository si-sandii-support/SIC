import React from "react";
import { ArrowDown, FileText, Layers3, Sparkles, UploadCloud } from "lucide-react";

export function Hero({ dropzone, fileCount, selectedCount }) {
  return (
    <section id="top" className="relative overflow-hidden border-b border-slate-200 bg-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,.12),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,.06),transparent_32%)]" />
      <div className="relative mx-auto grid max-w-[1680px] gap-8 px-4 py-12 md:px-6 md:py-16 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
            <Sparkles size={14} /> Extract · Select · Convert · Share
          </div>
          <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-[-.04em] text-slate-950 md:text-6xl">
            Turn multiple documents into exactly what you need to share.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-500 md:text-lg">
            Upload several files, extract their readable content, select only the useful sections, reorder them with drag and drop, then convert and share one clean document.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#workspace" className="btn-primary"><ArrowDown size={17} /> Open workspace</a>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm">
              <FileText size={16} /> {fileCount} files
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm">
              <Layers3 size={16} /> {selectedCount} selected
            </div>
          </div>
        </div>

        <div {...dropzone.getRootProps()} onClick={dropzone.open}
          className="group cursor-pointer rounded-[28px] border-2 border-dashed border-slate-300 bg-slate-50/80 p-5 transition hover:border-emerald-400 hover:bg-emerald-50/50">
          <input {...dropzone.getInputProps()} />
          <div className="rounded-[22px] border border-white bg-white p-7 text-center shadow-soft">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#075E54] text-white transition group-hover:scale-105">
              <UploadCloud size={28} />
            </div>
            <h2 className="mt-5 text-xl font-black">Drop multiple files here</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">PDF, DOCX, XLSX/XLS, PPTX, TXT, Markdown and CSV. Files are extracted separately and stay selectable.</p>
            <div className="mt-5 inline-flex rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-[#064e3b]">Choose files</div>
          </div>
        </div>
      </div>
    </section>
  );
}
