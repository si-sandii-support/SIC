import React, { useState } from "react";
import { Menu, Search, UploadCloud, X } from "lucide-react";

export function Header({ query, setQuery, searchResults, onSelectResult, dropzone }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-emerald-100 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] w-full max-w-[1680px] items-center gap-2 px-3 sm:gap-3 sm:px-4 md:px-6">
        <a href="#top" className="flex shrink-0 items-center gap-3" aria-label="SIC home">
          <img src="/sic-logo.jpg" alt="SIC logo" className="h-10 w-10 rounded-xl object-cover shadow-sm" />
          <div className="hidden min-[420px]:block">
            <div className="font-black tracking-tight">SIC</div>
            <div className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-600">Document Studio</div>
          </div>
        </a>

        <div className="relative mx-auto hidden max-w-2xl flex-1 md:block">
          <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={17} />
          <input className="input pl-9 pr-16" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search files and extracted content…" />
          <kbd className="absolute right-3 top-2.5 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-1 text-[10px] text-slate-400">⌘ K</kbd>
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              {searchResults.map(({ file, block }) => (
                <button key={block.id} onClick={() => onSelectResult(file.id)} className="block w-full border-b border-slate-100 p-3 text-left last:border-0 hover:bg-slate-50">
                  <div className="text-xs font-bold text-slate-700">{file.name}</div>
                  <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">{block.text}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button type="button" onClick={dropzone.open} className="btn-primary ml-auto">
          <UploadCloud size={17} />
          <span className="hidden sm:inline">Upload files</span>
        </button>
        <button onClick={() => setOpen((v) => !v)} className="btn-secondary !px-3 md:hidden" aria-label="Open menu">
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
      {open && (
        <div className="border-t border-slate-100 bg-white p-4 md:hidden">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={17} />
            <input className="input pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search files and content…" />
          </div>
        </div>
      )}
    </header>
  );
}
