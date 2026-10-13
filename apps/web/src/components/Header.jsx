import React, { useEffect, useRef, useState } from "react";
import { Camera, Menu, Search, UploadCloud, X } from "lucide-react";

export function Header({ query, setQuery, searchResults, onSelectResult, dropzone, onCameraFile }) {
  const [open, setOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Use the live device camera instead of a file picker, so Camera is capture-only.
  useEffect(() => {
    if (!cameraOpen) return undefined;
    let cancelled = false;
    const startCamera = async () => {
      try {
        setCameraError("");
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Live camera is not supported by this browser. Open SIC over HTTPS in a current browser.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (error) {
        if (!cancelled) setCameraError(error?.message || "Unable to open the camera. Check browser permissions and HTTPS.");
      }
    };
    void startCamera();
    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [cameraOpen]);

  const closeCamera = () => {
    setCameraOpen(false);
    setCameraError("");
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError("Camera is still starting. Please try again in a moment.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("Could not capture the image. Please try again.");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError("Could not create the captured image. Please try again.");
        return;
      }
      const photo = new File([blob], `sic-camera-${Date.now()}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
      closeCamera();
      if (typeof onCameraFile === "function") {
        void onCameraFile([photo]);
      } else {
        console.error("Camera upload is not connected: Header requires onCameraFile.");
      }
    }, "image/jpeg", 0.92);
  };
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

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setCameraError("");
              setCameraOpen(true);
            }}
            className="btn-secondary min-h-11 min-w-11 !px-3 touch-manipulation"
            aria-label="Take photo and upload"
            title="Take photo and upload"
          >
            <Camera size={18} />
            <span className="hidden sm:inline">Camera</span>
          </button>
          <button type="button" onClick={dropzone.open} className="btn-primary min-h-11 touch-manipulation">
            <UploadCloud size={17} />
            <span className="hidden sm:inline">Upload files</span>
          </button>
        </div>
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
      {cameraOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Capture image">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="font-bold text-slate-900">Capture image</div>
              <button type="button" onClick={closeCamera} className="btn-secondary min-h-11 min-w-11 !px-3" aria-label="Close camera"><X size={18} /></button>
            </div>
            <div className="bg-black">
              <video ref={videoRef} autoPlay playsInline muted className="block max-h-[65vh] min-h-48 w-full object-contain" />
            </div>
            {cameraError && <p className="px-4 pt-3 text-sm text-red-600" role="alert">{cameraError}</p>}
            <div className="flex flex-wrap justify-end gap-2 p-4">
              <button type="button" onClick={closeCamera} className="btn-secondary min-h-11">Cancel</button>
              <button type="button" onClick={capturePhoto} className="btn-primary min-h-11 touch-manipulation"><Camera size={17} /> Capture photo</button>
            </div>
            <p className="px-4 pb-4 text-xs text-slate-500">Camera access requires permission and a secure HTTPS connection (localhost is also allowed for development).</p>
          </div>
        </div>
      )}
    </header>
  );
}
