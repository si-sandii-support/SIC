import React from "react";
import {
  CheckCircle2,
  Download,
  FileOutput,
  Mail,
  MessageCircle,
  LoaderCircle,
} from "lucide-react";

export function ConvertShare({
  format,
  setFormat,
  busy,
  selectedCount,
  generated,
  shareResults = [],
  whatsAppQueue = { urls: [], nextIndex: 0 },
  onOpenNextWhatsApp = () => {},
  operation = "",
  emailCount = 0,
  phoneCount = 0,
  emails = [],
  phones = [],
  onConvert,
  onDownload,
  onShare,
}) {
  const ready = selectedCount > 0 && !busy;
  const emailReady = selectedCount > 0 && emailCount > 0 && !busy;
  const phoneReady = selectedCount > 0 && phoneCount > 0 && !busy;
  const allReady = selectedCount > 0 && (emailCount > 0 || phoneCount > 0) && !busy;
  const sendingEmail = operation.toLowerCase().includes("email");
  const sendingWhatsApp = operation.toLowerCase().includes("whatsapp");

  return (
    <section className="card p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Step 3
          </p>
          <h2 className="mt-1 text-lg font-black">Convert &amp; send</h2>
          <p className="text-sm text-slate-500">
            Only Selected Content is included. Use Send to all to process added email and WhatsApp recipients in one action. Configured providers can deliver the attachment; browser drafts/chats require manual review and attachment.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            className="input !w-auto"
            value={format}
            onChange={(event) => setFormat(event.target.value)}
            disabled={busy}
          >
            <option value="pdf">PDF</option>
            <option value="docx">DOCX</option>
            <option value="pptx">PPTX</option>
            <option value="xlsx">Excel / XLSX</option>
          </select>

          <button
            type="button"
            onClick={() => { if (typeof onConvert === "function") onConvert(); }}
            disabled={!ready}
            aria-label={busy && operation.toLowerCase().includes("converting") ? "Generating selected content file" : "Generate selected content file"}
            className="btn-primary min-h-11 touch-manipulation"
          >
            <FileOutput size={16} />
            {busy && operation.toLowerCase().includes("converting")
              ? "Converting…"
              : "Generate"}
          </button>
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-slate-950 p-4 text-white">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            {generated ? (
              <>
                <div className="flex items-center gap-2 text-sm font-bold">
                  <CheckCircle2 className="text-emerald-400" size={17} />
                  {generated.filename}
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Generated from {selectedCount} selected sections · {formatBytes(Math.max(0, Math.floor((generated.base64?.length || 0) * 3 / 4)))}
                </p>
              </>
            ) : (
              <>
                <div className="text-sm font-bold">Ready to convert</div>
                <p className="mt-1 text-xs text-slate-400">
                  Generate the selected content once, then download it or prepare a prefilled share draft.
                </p>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
            <button
              type="button"
              onClick={() => onShare("all")}
              disabled={!allReady}
              className="btn-primary min-h-11 w-full sm:w-auto"
              title="Prepare/send to every added email and WhatsApp recipient in one action"
            >
              <FileOutput size={16} />
              Send to all ({emailCount} email · {phoneCount} WhatsApp)
            </button>
            {generated && (
              <button
                type="button"
                onClick={() => { if (typeof onDownload === "function") onDownload(); }}
                disabled={busy}
                aria-label="Download generated selected content file"
                className="btn-secondary min-h-11 touch-manipulation w-full sm:w-auto"
              >
                <Download size={16} />
                Download
              </button>
            )}

            <button
              type="button"
              onClick={() => onShare("email")}
              disabled={!emailReady}
              aria-label="Prepare email for added recipients"
              className="btn-accent min-h-11 touch-manipulation w-full sm:w-auto"
            >
              <Mail size={16} />
              {sendingEmail ? (
                <>
                  <LoaderCircle size={15} className="animate-spin" />
                  Preparing…
                </>
              ) : (
                <>Send Email{emailCount > 0 ? ` (${emailCount})` : ""}</>
              )}
            </button>

            <button
              type="button"
              onClick={() => onShare("whatsapp")}
              disabled={!phoneReady}
              aria-label="Prepare WhatsApp chats for added phone numbers"
              className="btn-secondary min-h-11 touch-manipulation w-full !border-slate-700 !bg-slate-900 !text-white hover:!bg-slate-800 sm:w-auto"
            >
              <MessageCircle size={16} />
              {sendingWhatsApp ? (
                <>
                  <LoaderCircle size={15} className="animate-spin" />
                  Preparing…
                </>
              ) : (
                <>Send WhatsApp{phoneCount > 0 ? ` (${phoneCount})` : ""}</>
              )}
            </button>
          </div>
        </div>

        {busy && (
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-[#25D366]" />
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <RecipientSummary
          icon={<Mail size={15} />}
          label="Email recipients"
          items={emails}
          empty="No email recipients added yet."
        />
        <RecipientSummary
          icon={<MessageCircle size={15} />}
          label="WhatsApp recipients"
          items={phones}
          empty="No WhatsApp numbers added yet."
        />
      </div>

      {whatsAppQueue.nextIndex < whatsAppQueue.urls.length && whatsAppQueue.urls.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-semibold text-emerald-900">Some WhatsApp tabs were blocked by the browser. Open the remaining chats below; each chat has the same prefilled message. Attach the downloaded file in each chat before sending.</p>
          <button type="button" className="btn-primary" onClick={onOpenNextWhatsApp}>Open remaining chats ({whatsAppQueue.urls.length - whatsAppQueue.nextIndex} left)</button>
        </div>
      )}

      {shareResults.length > 0 && (
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {shareResults.map((result, index) => (
            <div
              key={`${result.recipient}-${index}`}
              className={`rounded-xl border p-3 text-xs ${
                result.status === "accepted"
                  ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                  : result.status === "browser"
                    ? "border-sky-100 bg-sky-50 text-sky-800"
                    : result.status === "queued"
                      ? "border-amber-100 bg-amber-50 text-amber-800"
                      : "border-red-100 bg-red-50 text-red-800"
              }`}
            >
              <div className="font-bold">
                {result.status === "accepted" ? "Accepted" : result.status === "browser" ? "Opened" : result.status === "queued" ? "Waiting for click" : "Failed"} · {result.recipient}
              </div>
              <div className="mt-1 leading-5">{result.message}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function RecipientSummary({ icon, label, items, empty }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          {icon}
          {label}
        </div>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
          {items.length} added
        </span>
      </div>

      {items.length ? (
        <div className="mt-2 flex max-h-20 flex-wrap gap-1.5 overflow-auto">
          {items.map((item) => (
            <span
              key={item}
              className="max-w-full truncate rounded-md bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-slate-400">{empty}</p>
      )}
    </div>
  );
}

function formatBytes(bytes) { if (!bytes) return "0 B"; const units = ["B", "KB", "MB", "GB"]; const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024))); return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`; }
