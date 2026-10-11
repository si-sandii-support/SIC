import React, { useCallback, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Plus, ShieldCheck, X, GripVertical } from "lucide-react";
import { SortableContext, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api } from "../lib/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export function Recipients({ label, items, onChange, placeholder, type }) {
  const [value, setValue] = useState("");
  const [checking, setChecking] = useState(false);
  const [checks, setChecks] = useState({});
  const prefix = type === "email" ? "email" : "phone";

  const normalize = useCallback((raw) => {
    const trimmed = String(raw || "").trim();
    if (type === "email") return trimmed.toLowerCase();
    return trimmed.replace(/[\s().-]/g, "");
  }, [type]);

  async function add() {
    if (checking) return;
    const values = [...new Set(value.split(/[;,\n]+/).map(normalize).filter(Boolean))];
    const candidates = values.filter((item) => !items.includes(item));
    if (!candidates.length) {
      setValue("");
      return;
    }

    // Give instant feedback for obviously malformed values instead of waiting on the API.
    const locallyInvalid = candidates.filter((item) => type === "email" && !EMAIL_RE.test(item));
    const toValidate = candidates.filter((item) => !locallyInvalid.includes(item));
    setChecks((prev) => ({
      ...prev,
      ...Object.fromEntries(locallyInvalid.map((item) => [item, { status: "invalid", message: "Invalid email format." }])),
      ...Object.fromEntries(toValidate.map((item) => [item, { status: "checking", message: "Checking…" }])),
    }));

    if (locallyInvalid.length) {
      // Keep invalid values visible briefly so the user can see why they were rejected.
      setTimeout(() => setChecks((prev) => {
        const next = { ...prev };
        locallyInvalid.forEach((item) => delete next[item]);
        return next;
      }), 1800);
    }

    if (!toValidate.length) {
      setValue("");
      return;
    }

    setChecking(true);
    try {
      const results = await Promise.all(toValidate.map(async (candidate) => {
        try {
          const result = type === "email"
            ? await api.validateEmail(candidate)
            : await api.validatePhone(candidate);
          return { candidate, result };
        } catch (error) {
          return {
            candidate,
            result: {
              status: "unknown",
              message: error instanceof Error ? error.message : "Validation service unavailable.",
            },
          };
        }
      }));

      const accepted = [];
      const nextChecks = {};
      for (const { candidate, result } of results) {
        const finalValue = normalize(result.normalized || result.email || result.phone || candidate);
        nextChecks[finalValue] = { status: result.status, message: result.message };
        if (result.status === "valid" && !items.includes(finalValue)) accepted.push(finalValue);
      }

      setChecks((prev) => ({ ...prev, ...nextChecks }));
      if (accepted.length) {
        // Functional update prevents fast consecutive adds from losing recipients.
        onChange((current) => [...new Set([...current, ...accepted])]);
      }
    } finally {
      setChecking(false);
      setValue("");
    }
  }

  function remove(item) {
    onChange((current) => current.filter((currentItem) => currentItem !== item));
    setChecks((current) => {
      const next = { ...current };
      delete next[item];
      return next;
    });
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="label !mb-0">{label}</label>
        <span className="text-[10px] font-semibold text-slate-400">
          {items.length} added · drag to reorder
        </span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-2">
        {items.length > 0 && (
          <SortableContext items={items.map((item) => `${prefix}-${item}`)} strategy={horizontalListSortingStrategy}>
            <div className="flex max-h-28 flex-wrap gap-2 overflow-auto pb-1">
              {items.map((item) => (
                <RecipientChip
                  key={item}
                  id={`${prefix}-${item}`}
                  value={item}
                  status={checks[item]?.status || "valid"}
                  message={checks[item]?.message}
                  onRemove={() => remove(item)}
                />
              ))}
            </div>
          </SortableContext>
        )}

        <div className="mt-2 flex gap-2">
          <input
            className="input !border-0 !p-2 shadow-none"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                add();
              }
            }}
            placeholder={placeholder}
            aria-label={label}
            disabled={checking}
          />
          <button
            type="button"
            className="btn-secondary !px-3"
            onClick={add}
            disabled={!value.trim() || checking}
            aria-label={`Validate and add ${type}`}
          >
            {checking ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          </button>
        </div>

        {checking && <p className="mt-2 px-1 text-[10px] font-semibold text-emerald-600">Validating {type === "email" ? "email addresses" : "phone numbers"}…</p>}
        <p className="mt-2 px-1 text-[10px] leading-4 text-slate-400">
          {type === "email"
            ? "Paste multiple addresses separated by comma, semicolon or a new line. Format and MX records are checked."
            : "Paste multiple numbers separated by comma, semicolon or a new line. Numbers are normalized to international format."}
        </p>
      </div>
    </div>
  );
}

function RecipientChip({ id, value, status, message, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const icon = status === "checking"
    ? <Loader2 className="animate-spin" size={13} />
    : status === "invalid"
      ? <AlertCircle size={13} />
      : status === "valid"
        ? <CheckCircle2 size={13} />
        : <ShieldCheck size={13} />;
  const cls = status === "invalid"
    ? "bg-red-50 text-red-700 border-red-100"
    : status === "valid"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <span
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
      title={message}
      className={`inline-flex max-w-full items-center gap-1 rounded-lg border px-1.5 py-1 text-xs font-semibold ${cls}`}
    >
      <button type="button" {...listeners} {...attributes} className="cursor-grab touch-none rounded p-1 hover:bg-black/5" aria-label={`Drag ${value}`}>
        <GripVertical size={12} />
      </button>
      {icon}
      <span className="max-w-[220px] truncate px-0.5">{value}</span>
      <button type="button" onClick={onRemove} className="rounded p-1 hover:bg-black/5" aria-label={`Remove ${value}`}>
        <X size={13} />
      </button>
    </span>
  );
}
