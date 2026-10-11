import React from "react";
import { FileText, Trash2, UploadCloud, CheckCircle2, LoaderCircle, AlertCircle } from "lucide-react";

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 ** 2).toFixed(1)} MB`;
}

export const FileLibrary = React.memo(function FileLibrary({ files, activeId, onSelect, onDelete, dropzone }) {
  return (
    <aside className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 p-4">
        <div><h2 className="font-black">Uploaded files</h2><p className="text-xs text-slate-400">{files.length} {files.length === 1 ? "file" : "files"}</p></div>
        <button type="button" onClick={dropzone.open} className="btn-secondary !px-3" aria-label="Upload more files"><UploadCloud size={16} /></button>
      </div>
      <div className="max-h-[650px] overflow-auto p-2">
        {!files.length ? (
          <div className="p-7 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100"><FileText className="text-slate-400" /></div>
            <p className="mt-3 text-sm font-bold">No files yet</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">Upload one or many documents to begin.</p>
            <button type="button" onClick={dropzone.open} className="btn-primary mt-4 w-full">Start uploading</button>
          </div>
        ) : files.map((file) => (
          <div key={file.id} className={`group flex gap-2 rounded-xl p-3 ${file.id === activeId ? "bg-slate-950 text-white" : "hover:bg-slate-50"}`}>
            <button onClick={() => onSelect(file.id)} className="min-w-0 flex-1 text-left">
              <div className="flex items-center gap-2"><FileText size={16} /><span className="truncate text-sm font-bold">{file.name}</span></div>
              <div className={`mt-1 flex items-center gap-1.5 text-[10px] ${file.id === activeId ? "text-slate-300" : "text-slate-400"}`}>
                {file.status === "processing" ? <><LoaderCircle size={12} className="animate-spin" /> Extracting…</> : file.status === "error" ? <><AlertCircle size={12} /> {file.error || "Extraction failed"}</> : <><CheckCircle2 size={12} className="text-emerald-500" /> {formatBytes(file.size)} · {file.blocks.length} sections</>}
              </div>
            </button>
            <button onClick={() => onDelete(file.id)} className={`self-start rounded-lg p-1.5 opacity-0 group-hover:opacity-100 ${file.id === activeId ? "text-slate-300 hover:text-white" : "text-slate-300 hover:text-red-500"}`} aria-label={`Delete ${file.name}`}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </aside>
  );
});
