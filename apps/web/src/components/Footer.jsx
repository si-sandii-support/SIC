import React from "react";
import { Heart, ShieldCheck, UploadCloud } from "lucide-react";
import DonateCom from "../pages/DonateCom"; 

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-[1680px] px-4 py-10 md:px-6">
        <div className="grid gap-8 md:grid-cols-[1.5fr_1fr_1fr]">
          <div><div className="flex items-center gap-3"><img src="/sic-logo.jpg" alt="SIC" className="h-9 w-9 rounded-xl object-cover" /><span className="font-black">SIC</span></div><p className="mt-3 max-w-md text-sm leading-6 text-slate-500">A focused workspace for extracting, selecting, converting and sharing document content.</p></div>
          <div><p className="text-xs font-black uppercase tracking-wider text-slate-400">Workflow</p><div className="mt-3 space-y-2 text-sm text-slate-600"><div className="flex items-center gap-2"><UploadCloud size={15} />Upload multiple files</div><div className="flex items-center gap-2"><ShieldCheck size={15} />Validate recipients</div></div></div>
          <div><p className="text-xs font-black uppercase tracking-wider text-slate-400">Project</p>
          {/* <a className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-950" href={import.meta.env.VITE_DONATION_URL || "#"} target="_blank" rel="noreferrer"><Heart size={14} /> Support this project</a> */}
          <DonateCom/>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-5 text-xs text-slate-400"><span>© {new Date().getFullYear()} SIC · Secure provider credentials stay on the API.</span><span>Built for fast document workflows.</span></div>
      </div>
    </footer>
  );
}
