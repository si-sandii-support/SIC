const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function uniqueEmails(values) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map((value) => String(value || "").trim().toLowerCase())
    .filter((value) => EMAIL_RE.test(value)))];
}

function uniquePhones(values) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map((value) => String(value || "").replace(/\D/g, ""))
    .filter((value) => value.length >= 7 && value.length <= 15))];
}

export function openBrowserEmail({ to = [], cc = [], bcc = [], subject = "Shared document", message = "" } = {}) {
  const normalizedTo = uniqueEmails(to);
  const normalizedCc = uniqueEmails(cc);
  const normalizedBcc = uniqueEmails(bcc);
  const params = new URLSearchParams();
  if (normalizedCc.length) params.set("cc", normalizedCc.join(","));
  if (normalizedBcc.length) params.set("bcc", normalizedBcc.join(","));
  params.set("subject", subject || "Shared document");
  // Keep the user-authored template untouched; attachment guidance is shown in SIC's UI.
  params.set("body", String(message || ""));
  const recipientPath = normalizedTo.join(",");
  const url = `mailto:${recipientPath}?${params.toString()}`;
  window.location.href = url;
  return { url, to: normalizedTo, cc: normalizedCc, bcc: normalizedBcc };
}

/**
 * Reserve one browser tab per recipient while the original click still has user
 * activation. Browsers may block some tabs; those recipients are returned in
 * queuedUrls so the UI can open them individually from an explicit click.
 */
export function reserveWhatsAppWindows(count = 0) {
  const total = Math.max(0, Math.min(100, Number(count) || 0));
  return Array.from({ length: total }, () => {
    try { return window.open("about:blank", "_blank"); }
    catch { return null; }
  });
}

export function closeReservedWindows(windows = []) {
  for (const popup of windows) {
    try { if (popup && !popup.closed) popup.close(); } catch { /* ignore blocked/closed tabs */ }
  }
}

export function openBrowserWhatsApp({ phones = [], message = "", reservedWindows = [], firstWindow = null } = {}) {
  const body = String(message || "");
  const urls = uniquePhones(phones).map((phone) => `https://wa.me/${phone}?text=${encodeURIComponent(body)}`);
  const windows = firstWindow ? [firstWindow, ...reservedWindows] : reservedWindows;
  const openedUrls = [];
  const queuedUrls = [];

  urls.forEach((url, index) => {
    const popup = windows[index];
    if (popup && !popup.closed) {
      try {
        popup.location.href = url;
        try { popup.opener = null; } catch { /* optional hardening */ }
        openedUrls.push(url);
      } catch {
        queuedUrls.push(url);
      }
    } else {
      // Do not spawn surprise popups after asynchronous conversion. The user
      // can open this one explicitly with the queue control.
      queuedUrls.push(url);
    }
  });

  // Close unused reserved tabs, for example if phone numbers were deduplicated.
  windows.slice(urls.length).forEach((popup) => {
    try { if (popup && !popup.closed) popup.close(); } catch { /* ignore */ }
  });
  return { urls, openedUrls, queuedUrls };
}

// Backwards-compatible helper for any older call sites.
export function openBrowserShare(channel, recipient, options = {}) {
  if (channel === "email") return openBrowserEmail({ ...options, to: [recipient] });
  return openBrowserWhatsApp({ ...options, phones: [recipient] });
}
