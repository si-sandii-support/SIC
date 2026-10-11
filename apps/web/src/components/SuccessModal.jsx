import React from "react";
import { CheckCircle2, X } from "lucide-react";

export function SuccessModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close"><X size={18} /></button>
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50"><CheckCircle2 className="text-emerald-600" size={30} /></div>
        <h2 className="mt-5 text-center text-xl font-black">Share request accepted</h2>
        <p className="mt-2 text-center text-sm leading-6 text-slate-500">The provider accepted at least one recipient. Final delivery status may arrive later from the provider.</p>
        <button onClick={onClose} className="btn-primary mt-6 w-full">Done</button>
      </div>
    </div>
  );
}
