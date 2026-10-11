import React from "react";
import { Mail, MessageCircle } from "lucide-react";
import { Recipients } from "./Recipients";
import { wordCount } from "@si-doc/shared";

export function MessageComposer({ mode, onModeChange, emails, setEmails, phones, setPhones, senderEmail, setSenderEmail, whatsappPhoneNumberId, setWhatsappPhoneNumberId, subject, setSubject, message, setMessage, maxCustom, emailRecipientMode, setEmailRecipientMode }) {
  const count = wordCount(message);
  return (
    <section className="card p-5 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Step 2</p><h2 className="mt-1 text-lg font-black">Message & sharing</h2><p className="text-sm text-slate-500">Add email and/or WhatsApp recipients. Either channel can be used independently.</p></div>
        <div className="flex max-w-full flex-wrap rounded-xl bg-slate-100 p-1">{["business", "personal", "custom"].map((item) => <button type="button" key={item} onClick={() => onModeChange(item)} className={`min-h-11 rounded-lg px-3 sm:px-4 py-2 text-sm font-bold capitalize ${mode === item ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>{item}</button>)}</div>
      </div>

      <div className="mt-6 grid min-w-0 gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <Recipients label="Email recipients" items={emails} onChange={setEmails} placeholder="name@company.com · Enter to validate" type="email" />
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-700">Open email recipients as</label>
              <select className="input !w-auto !py-1.5 !text-xs" value={emailRecipientMode} onChange={(e) => setEmailRecipientMode(e.target.value)}>
                <option value="to">To</option>
                <option value="cc">CC</option>
                <option value="bcc">BCC</option>
              </select>
            </div>
            <p className="mt-1.5 text-[10px] leading-4 text-slate-400">Choose To to put added recipients directly in To. For CC or BCC, enter your own email below so the prepared draft has a To address.</p>
            <div className="mt-3">
              <label className="label">Your email address</label>
              <input
                className="input"
                type="email"
                autoComplete="email"
                value={senderEmail}
                onChange={(event) => setSenderEmail(event.target.value)}
                placeholder="you@company.com"
                aria-label="Your email address"
              />
              <p className="mt-1 text-[10px] leading-4 text-slate-400">
                Saved on this device. Used as To for CC/BCC drafts and as Reply-To for configured SMTP delivery. SMTP's authenticated From address stays on the SIC server; browser drafts use the account selected in your mail app.
              </p>
            </div>
          </div>
          <Recipients label="WhatsApp recipients" items={phones} onChange={setPhones} placeholder="+91 9876543210 · Enter to validate" type="phone" />
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
            <label className="label">Your WhatsApp Business Phone Number ID</label>
            <input
              className="input"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              spellCheck={false}
              value={whatsappPhoneNumberId || ""}
              onChange={(event) => setWhatsappPhoneNumberId(event.target.value.replace(/\D/g, ""))}
              placeholder="e.g. 123456789012345"
              aria-label="Your WhatsApp Business Phone Number ID"
            />
            <p className="mt-1.5 text-[10px] leading-4 text-slate-500">
              Saved on this device. This is the numeric Meta Business phone-number ID, not one of the recipient phone numbers. For automatic one-press sending, the SIC API server must also have WHATSAPP_ACCESS_TOKEN configured. Leave blank to use the server's default ID.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><Mail size={17} className="text-slate-500" /><p className="mt-2 text-xs font-bold">Email</p><p className="mt-1 text-[11px] leading-5 text-slate-400">Syntax + mail-domain checks before a recipient is added.</p></div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><MessageCircle size={17} className="text-slate-500" /><p className="mt-2 text-xs font-bold">WhatsApp</p><p className="mt-1 text-[11px] leading-5 text-slate-400">International phone format is checked; WhatsApp confirms account availability when each chat opens.</p></div>
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <div><label className="label">Subject</label><input className="input min-h-11" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={mode === "custom" ? "" : "Email subject"} /></div>
          <div>
            <div className="flex items-center justify-between"><label className="label !mb-0">{mode === "custom" ? "Custom message" : `${mode} message`}</label><span className={`text-xs ${mode === "custom" && count > maxCustom ? "font-bold text-red-500" : "text-slate-400"}`}>{count} / {mode === "custom" ? maxCustom : 125} words</span></div>
            <textarea className="input mt-1.5 min-h-44 resize-y leading-6" autoCapitalize="sentences" value={message} onChange={(e) => setMessage(e.target.value)} placeholder={mode === "custom" ? "" : "Write your message…"} />
            {mode === "custom" && <p className="mt-1.5 text-[11px] text-slate-400">Custom uses the same layout as Business and Personal, but starts completely empty.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
