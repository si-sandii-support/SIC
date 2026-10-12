import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { closestCenter, DndContext, MouseSensor, TouchSensor, KeyboardSensor, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useDropzone } from "react-dropzone";
import { FileOutput, Search, UploadCloud, Zap } from "lucide-react";
import toast from "react-hot-toast";
import { templates, wordCount } from "@si-doc/shared";
import { parseFile } from "./lib/parser";
import { loadLocal, saveLocalIdle, persistFileBlob, removePersistedFile, restoreFileBlobs, persistJson, restoreJson } from "./lib/storage";
import { api } from "./lib/api";
import { openBrowserEmail, openBrowserWhatsApp, reserveWhatsAppWindows, closeReservedWindows } from "./lib/shareFallback";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { FileLibrary } from "./components/FileLibrary";
import { DocumentViewer } from "./components/DocumentViewer";
import { SelectedContent } from "./components/SelectedContent";
import { MessageComposer } from "./components/MessageComposer";
import { ConvertShare } from "./components/ConvertShare";
import { Footer } from "./components/Footer";
import { SuccessModal } from "./components/SuccessModal";
import { cloneSelectionInstance } from "./lib/selection";

const MAX_MB = 30;
const MAX_CUSTOM = 250;

export default function App() {
  const [files, setFiles] = useState(() => loadLocal("si-files", []));
  const [restoringFiles, setRestoringFiles] = useState(true);
  const [stateHydrated, setStateHydrated] = useState(false);
  const [activeId, setActiveId] = useState(() => files[0]?.id);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [extractedQuery, setExtractedQuery] = useState("");
  const deferredExtractedQuery = useDeferredValue(extractedQuery);
  const [selectedQuery, setSelectedQuery] = useState("");
  const deferredSelectedQuery = useDeferredValue(selectedQuery);
  const [operation, setOperation] = useState("");
  const [selected, setSelected] = useState(() => loadLocal("si-selected", []));
  const [selectedLayout, setSelectedLayout] = useState(() => loadLocal("si-selected-layout", "vertical") === "horizontal" ? "horizontal" : "vertical");
  const [mode, setMode] = useState("business");
  const [emails, setEmails] = useState(() => loadLocal("si-emails", []));
  const [phones, setPhones] = useState(() => loadLocal("si-phones", []));
  const [senderEmail, setSenderEmail] = useState(() => loadLocal("si-sender-email", ""));
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState(() => loadLocal("si-whatsapp-phone-number-id", ""));
  const [emailRecipientMode, setEmailRecipientMode] = useState(() => loadLocal("si-email-recipient-mode", "to"));
  const [subject, setSubject] = useState(templates.business.subject);
  const [message, setMessage] = useState(templates.business.message);
  const [format, setFormat] = useState("pdf");
  const [busy, setBusy] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [shareResults, setShareResults] = useState([]);
  const [whatsAppQueue, setWhatsAppQueue] = useState({ urls: [], nextIndex: 0 });
  const [activeSelection, setActiveSelection] = useState(null);
  // Separate mouse and touch sensors prevent touch scrolling from being mistaken
  // for a drag. Keyboard sensor keeps sortable interactions accessible.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const active = files.find((file) => file.id === activeId) || files[0];
  const { isOver, setNodeRef } = useDroppable({ id: "selected-drop" });

  useEffect(() => {
    if (!activeId && files[0]) setActiveId(files[0].id);
    if (activeId && !files.some((file) => file.id === activeId)) setActiveId(files[0]?.id);
  }, [files, activeId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // IndexedDB stores full extracted metadata and visual payloads; localStorage is
      // retained as a lightweight compatibility fallback for older sessions.
      const [savedFiles, savedSelected, savedLayout] = await Promise.all([
        restoreJson("si-files-full", null),
        restoreJson("si-selected-full", null),
        restoreJson("si-selected-layout", null),
      ]);
      if (cancelled) return;
      const restoredMetadata = Array.isArray(savedFiles) ? savedFiles : files;
      if (Array.isArray(savedFiles)) setFiles(savedFiles);
      if (Array.isArray(savedSelected)) setSelected(savedSelected);
      if (savedLayout === "horizontal" || savedLayout === "vertical") setSelectedLayout(savedLayout);
      const cached = await restoreFileBlobs(restoredMetadata.map((file) => file.id));
      if (cancelled) return;
      if (Object.keys(cached).length) {
        setFiles((current) => current.map((file) => {
          const restored = cached[file.id];
          if (!restored) return file;
          try { Object.defineProperty(restored, "__siId", { value: file.id, enumerable: false }); } catch {}
          return { ...file, file: restored };
        }));
      }
      setRestoringFiles(false);
      setStateHydrated(true);
    })();
    return () => { cancelled = true; };
    // Restore once during startup; subsequent state changes are persisted below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!stateHydrated) return;
    const metadata = files.map(({ file, ...rest }) => rest);
    void persistJson("si-files-full", metadata);
    // Small fallback omits heavy visual payloads if localStorage is quota-limited.
    saveLocalIdle("si-files", metadata.map((item) => ({ ...item, visual: undefined })));
  }, [files, stateHydrated]);
  useEffect(() => { if (stateHydrated) void persistJson("si-selected-layout", selectedLayout); }, [selectedLayout, stateHydrated]);
  useEffect(() => { if (stateHydrated) void persistJson("si-selected-full", selected); }, [selected, stateHydrated]);
  useEffect(() => saveLocalIdle("si-emails", emails), [emails]);
  useEffect(() => saveLocalIdle("si-phones", phones), [phones]);
  useEffect(() => saveLocalIdle("si-sender-email", senderEmail), [senderEmail]);
  useEffect(() => saveLocalIdle("si-whatsapp-phone-number-id", whatsappPhoneNumberId), [whatsappPhoneNumberId]);
  useEffect(() => saveLocalIdle("si-email-recipient-mode", emailRecipientMode), [emailRecipientMode]);

  const blocks = useMemo(() => {
    if (!active) return [];
    const q = deferredExtractedQuery.trim().toLowerCase();
    if (!q) return active.blocks;
    return active.blocks.filter((block) => {
      const indexed = block.searchText || `${String(block.text || "")} ${String(block.sourceFileName || "")}`.toLowerCase();
      return indexed.includes(q);
    });
  }, [active, deferredExtractedQuery]);

  const searchResults = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return [];
    return files.flatMap((file) =>
      file.blocks
        .filter((block) => {
          const indexed = block.searchText || `${String(block.text || "")} ${String(block.sourceFileName || "")}`.toLowerCase();
          return indexed.includes(q);
        })
        .slice(0, 4)
        .map((block) => ({ file, block }))
    ).slice(0, 10);
  }, [files, deferredQuery]);

  const selectedFiltered = useMemo(() => {
    const q = deferredSelectedQuery.trim().toLowerCase();
    if (!q) return selected;
    return selected.filter((block) => {
      const indexed = block.searchText || `${String(block.text || "")} ${String(block.sourceFileName || "")}`.toLowerCase();
      return indexed.includes(q);
    });
  }, [selected, deferredSelectedQuery]);

  const selectedWords = useMemo(() => selected.reduce((sum, block) => sum + wordCount(block.text), 0), [selected]);
  const selectedChars = useMemo(() => selected.reduce((sum, block) => sum + block.text.length, 0), [selected]);

  const onUpload = useCallback(async (incoming) => {
    const accepted = incoming.filter((file) => {
      if (file.size > MAX_MB * 1024 * 1024) {
        toast.error(`${file.name} is larger than ${MAX_MB} MB.`);
        return false;
      }
      return true;
    });
    if (!accepted.length) return;

    const jobs = accepted.map((file) => { const id = crypto.randomUUID(); try { Object.defineProperty(file, "__siId", { value: id, enumerable: false }); } catch {} return { file, id }; });
    const pending = jobs.map(({ file, id }) => ({
      id,
      name: file.name,
      mimeType: file.type,
      size: file.size,
      status: "processing",
      blocks: [],
      uploadedAt: new Date().toISOString(),
      file,
    }));

    setFiles((current) => [...current, ...pending]);
    jobs.forEach(({ file, id }) => { void persistFileBlob(id, file); });
    setActiveId(jobs[0].id);

    // Two concurrent extraction jobs keep multi-file upload fast without freezing the browser.
    let cursor = 0;
    const worker = async () => {
      while (true) {
        const job = jobs[cursor++];
        if (!job) return;
        try {
          const parsed = await parseFile(job.file, job.id);
          setFiles((current) => current.map((file) =>
            file.id === job.id ? { ...file, status: "ready", blocks: parsed.blocks.map((block) => ({ ...block, searchText: `${String(block.text || "")} ${String(block.sourceFileName || job.file.name)}`.toLowerCase() })), text: parsed.text, visual: parsed.visual } : file
          ));
          toast.success(`${job.file.name} extracted`);
        } catch (error) {
          const messageText = error instanceof Error ? error.message : "Could not read this file.";
          setFiles((current) => current.map((file) =>
            file.id === job.id ? { ...file, status: "error", error: messageText } : file
          ));
          toast.error(`${job.file.name}: ${messageText}`);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(2, jobs.length) }, worker));
  }, []);

  const dropzone = useDropzone({ onDrop: onUpload, multiple: true, noClick: true });

  const addBlock = useCallback((block, insertAt = null) => {
    if (!block?.id || (!block?.text && !block?.visual)) return;
    setGenerated(null);
    setSelected((current) => {
      const index = Number.isInteger(insertAt)
        ? Math.max(0, Math.min(insertAt, current.length))
        : current.length;
      // Extracted content is immutable. Every add/drag creates a fresh instance,
      // so the same source element can be copied unlimited times.
      const nextItem = cloneSelectionInstance(block, index);
      const next = [...current];
      next.splice(index, 0, nextItem);
      return next.map((item, order) => ({ ...item, order }));
    });
  }, []);

  const addBlockFromMobileCopy = useCallback((block) => {
    // Ensure a newly copied item is visible even when Selected Content had an old search filter.
    setSelectedQuery("");
    addBlock(block);
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        document.getElementById("selected-content")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  }, [addBlock]);

  const selectElement = useCallback((block) => {
    if (!block?.id || (!block?.text && !block?.visual)) return;
    // Selecting an exact source element immediately creates one editable copy
    // in Selected Content. The source itself is never moved or modified.
    // Dragging the armed source later creates additional independent copies.
    setActiveSelection(block);
    addBlock(block);
  }, [addBlock]);

  const editBlock = useCallback((id, text) => {
    const nextText = String(text ?? "");
    if (!nextText.trim()) return toast.error("Selected content cannot be empty.");
    setGenerated(null);
    setSelected((current) => current.map((item) => item.id === id ? { ...item, text: nextText } : item));
  }, []);

  const updateBlockStyle = useCallback((id, patch) => {
    setGenerated(null);
    setSelected((current) => current.map((item) => item.id === id
      ? { ...item, style: { ...(item.style || {}), ...patch } }
      : item
    ));
  }, []);

  const removeBlock = useCallback((id) => {
    setGenerated(null);
    setSelected((current) => current.filter((item) => item.id !== id).map((item, index) => ({ ...item, order: index })));
  }, []);

  const removeFile = useCallback((id) => {
    setGenerated(null);
    setFiles((current) => current.filter((file) => file.id !== id));
    void removePersistedFile(id);
    setSelected((current) => current.filter((block) => block.sourceFileId !== id));
    setActiveId((current) => current === id ? undefined : current);
    setActiveSelection(null);
  }, []);

  function handleModeChange(nextMode) {
    setMode(nextMode);
    if (nextMode === "custom") {
      setSubject("");
      setMessage("");
      return;
    }
    setSubject(templates[nextMode].subject);
    setMessage(templates[nextMode].message);
  }

  function handleDragEnd(event) {
    const { active: dragged, over } = event;
    if (!over) return;

    const draggedId = String(dragged.id);

    // Source selections are draggable only after the user has made a real
    // text/image selection. Support both the visual viewer and legacy text
    // block selection handles so every selection follows the same path.
    if (draggedId.startsWith("selection-") || draggedId.startsWith("text-selection-") || draggedId.startsWith("selection-action-")) {
      const block = dragged.data.current?.block;
      const overId = String(over.id);
      const isSelectedDrop = overId === "selected-drop" || selected.some((item) => item.id === overId);
      if (!block || !isSelectedDrop) return;
      const targetIndex = selected.findIndex((item) => item.id === overId);
      const insertAt = overId === "selected-drop" || targetIndex < 0 ? selected.length : targetIndex;
      addBlock(block, insertAt);
      return;
    }

    if (draggedId.startsWith("email-") || draggedId.startsWith("phone-")) {
      const kind = draggedId.startsWith("email-") ? "email" : "phone";
      const values = kind === "email" ? emails : phones;
      const fromValue = draggedId.slice(kind.length + 1);
      const overId = String(over.id);
      const toValue = overId.startsWith(`${kind}-`) ? overId.slice(kind.length + 1) : null;
      if (toValue && fromValue !== toValue) {
        const from = values.indexOf(fromValue);
        const to = values.indexOf(toValue);
        if (from >= 0 && to >= 0) {
          const reordered = arrayMove(values, from, to);
          if (kind === "email") setEmails(reordered);
          else setPhones(reordered);
        }
      }
      return;
    }

    if (over.id === "selected-drop") return;
    setGenerated(null);
    setSelected((current) => {
      const from = current.findIndex((item) => item.id === dragged.id);
      const to = current.findIndex((item) => item.id === over.id);
      return from >= 0 && to >= 0
        ? arrayMove(current, from, to).map((item, index) => ({ ...item, order: index }))
        : current;
    });
  }

  async function convert() {
    if (!selected.length) {
      toast.error("Select content first.");
      return null;
    }
    setBusy(true);
    setOperation("Converting selected content…");
    try {
      const result = await api.convert({ title: "Selected Content", format, blocks: selected, layout: selectedLayout });
      setGenerated(result);
      toast.success("Document generated");
      return result;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Conversion failed");
      return null;
    } finally {
      setBusy(false);
      setOperation("");
    }
  }

  function downloadAttachment(file) {
    if (!file?.base64) {
      toast.error("No generated file is available to download. Generate the file again.");
      return false;
    }
    try {
      // Blob URLs are more reliable than large data: URLs on iOS Safari and Android Chrome.
      const binary = atob(file.base64.replace(/^data:[^,]*,/, ""));
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      const blob = new Blob([bytes], { type: file.mimeType || "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.filename || "Selected_Content";
      anchor.rel = "noopener";
      anchor.style.position = "fixed";
      anchor.style.left = "-9999px";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      // Keep the object URL alive long enough for mobile browsers to start the download.
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return true;
    } catch (error) {
      console.error("Download failed", error);
      toast.error("The file could not be downloaded. Please generate it again.");
      return false;
    }
  }
  function download() { if (!generated) { toast.error("Generate the file before downloading."); return; } downloadAttachment(generated); }

  async function share(channel) {
    if (channel !== "all") return shareChannel(channel);

    const emailList = [...new Set(emails.map((value) => String(value || "").trim().toLowerCase()).filter((value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)))];
    const phoneList = [...new Set(phones.map((value) => String(value || "").replace(/\D/g, "")).filter((value) => value.length >= 7 && value.length <= 15))];
    if (!emailList.length && !phoneList.length) return toast.error("Add at least one valid email recipient or WhatsApp number.");
    if (!selected.length) return toast.error("Select content first.");
    if (!message.trim()) return toast.error("Write a message before sharing.");
    if (mode === "custom" && wordCount(message) > MAX_CUSTOM) {
      return toast.error(`Custom message is limited to ${MAX_CUSTOM} words.`);
    }

    const configuredPhoneId = String(whatsappPhoneNumberId || "").trim();
    if (phoneList.length && configuredPhoneId && !/^\d{5,30}$/.test(configuredPhoneId)) {
      return toast.error("WhatsApp Business Phone Number ID must contain only digits from Meta's WhatsApp API setup.");
    }

    const ownEmail = String(senderEmail || "").trim().toLowerCase();
    if (emailList.length && emailRecipientMode !== "to" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(ownEmail)) {
      return toast.error("Enter your valid email address when sending added recipients as CC or BCC.");
    }

    // Reserve WhatsApp windows during the original click for browsers that need
    // a manual-chat fallback. The API path closes these if automatic delivery works.
    const pendingWhatsAppWindows = phoneList.length ? reserveWhatsAppWindows(phoneList.length) : [];
    let attachment = generated;
    if (!attachment) attachment = await convert();
    if (!attachment) {
      closeReservedWindows(pendingWhatsAppWindows);
      return;
    }

    setShareResults([]);
    const channelOutcomes = [];
    if (emailList.length) {
      channelOutcomes.push(await shareChannel("email", {
        attachmentOverride: attachment,
        downloadFile: false,
        appendResults: true,
        quiet: true,
      }));
    }
    if (phoneList.length) {
      channelOutcomes.push(await shareChannel("whatsapp", {
        attachmentOverride: attachment,
        preReservedWindows: pendingWhatsAppWindows,
        downloadFile: false,
        appendResults: true,
        quiet: true,
      }));
    }

    downloadAttachment(attachment);
    const allSucceeded = channelOutcomes.every((outcome) => outcome?.ok !== false);
    const summary = `Prepared sharing for ${emailList.length} email recipient(s) and ${phoneList.length} WhatsApp recipient(s) with one action. The selected file was downloaded; check recipient statuses below. Browser drafts still need your confirmation and manual attachment.`;
    toast[allSucceeded ? "success" : "error"](summary);
  }

  async function shareChannel(channel, options = {}) {
    const emailList = [...new Set(emails.map((value) => String(value || "").trim().toLowerCase()).filter((value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)))];
    const phoneList = [...new Set(phones.map((value) => String(value || "").replace(/\D/g, "")).filter((value) => value.length >= 7 && value.length <= 15))];
    const recipients = channel === "email" ? emailList : phoneList;
    const quiet = options.quiet === true;
    if (!recipients.length) {
      if (!quiet) toast.error(`Add at least one valid ${channel} recipient.`);
      return { ok: false, mode: "none" };
    }
    if (!selected.length) {
      if (!quiet) toast.error("Select content first.");
      return { ok: false, mode: "none" };
    }
    if (!message.trim()) {
      if (!quiet) toast.error("Write a message before sharing.");
      return { ok: false, mode: "none" };
    }
    if (mode === "custom" && wordCount(message) > MAX_CUSTOM) {
      if (!quiet) toast.error(`Custom message is limited to ${MAX_CUSTOM} words.`);
      return { ok: false, mode: "none" };
    }

    const configuredPhoneId = String(whatsappPhoneNumberId || "").trim();
    if (channel === "whatsapp" && configuredPhoneId && !/^\d{5,30}$/.test(configuredPhoneId)) {
      if (!quiet) toast.error("WhatsApp Business Phone Number ID must contain only digits from Meta's WhatsApp API setup.");
      return { ok: false, mode: "none" };
    }

    const ownEmail = String(senderEmail || "").trim().toLowerCase();
    if (channel === "email" && emailRecipientMode !== "to" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(ownEmail)) {
      if (!quiet) toast.error("Enter your valid email address when sending added recipients as CC or BCC.");
      return { ok: false, mode: "none" };
    }

    const pendingWhatsAppWindows = channel === "whatsapp"
      ? (options.preReservedWindows || reserveWhatsAppWindows(phoneList.length))
      : [];
    let attachment = options.attachmentOverride || generated;
    if (!attachment) attachment = await convert();
    if (!attachment) {
      closeReservedWindows(pendingWhatsAppWindows);
      return { ok: false, mode: "conversion" };
    }

    setBusy(true);
    setOperation(channel === "email" ? "Sending email…" : "Sending WhatsApp…");
    try {
      let providerResult = null;
      try {
        providerResult = await api.share({
          channel,
          recipients,
          message,
          subject,
          emailRecipientMode,
          senderEmail: ownEmail,
          whatsappPhoneNumberId: String(whatsappPhoneNumberId || "").trim(),
          attachment: {
            filename: attachment.filename,
            mimeType: attachment.mimeType,
            base64: attachment.base64,
          },
        });
      } catch (providerError) {
        closeReservedWindows(pendingWhatsAppWindows);
        throw providerError;
      }

      if (providerResult?.mode === "api" && providerResult.providerConfigured) {
        closeReservedWindows(pendingWhatsAppWindows);
        if (options.downloadFile !== false) downloadAttachment(attachment);
        const results = Array.isArray(providerResult.results) ? providerResult.results : [];
        setShareResults((current) => options.appendResults ? [...current, ...results] : results);
        const accepted = results.filter((item) => item.status === "accepted").length;
        const failed = results.length - accepted;
        if (!quiet) {
          toast[failed ? "error" : "success"](
            `${accepted} of ${results.length} ${channel === "whatsapp" ? "WhatsApp recipients" : "email recipients"} accepted by the provider. ${options.downloadFile === false ? "" : "The generated file was also downloaded. "}Check recipient results below.`
          );
        }
        if (channel === "whatsapp") setWhatsAppQueue({ urls: [], nextIndex: 0 });
        return { ok: results.length > 0 && failed === 0, mode: "api", results };
      }

      if (options.downloadFile !== false) downloadAttachment(attachment);
      if (channel === "email") {
        const grouped = emailRecipientMode === "cc"
          ? { to: [ownEmail], cc: emailList, bcc: [] }
          : emailRecipientMode === "bcc"
            ? { to: [ownEmail], cc: [], bcc: emailList }
            : { to: emailList, cc: [], bcc: [] };
        openBrowserEmail({ ...grouped, subject, message });
        const results = emailList.map((recipient) => ({
          recipient,
          status: "browser",
          message: `Prefilled in the ${emailRecipientMode.toUpperCase()} field. Review the draft and attach ${attachment.filename} before sending.`,
        }));
        setShareResults((current) => options.appendResults ? [...current, ...results] : results);
        if (!quiet) toast.success(`Email draft prepared for ${emailList.length} recipient${emailList.length === 1 ? "" : "s"}. The file was downloaded for manual attachment.`);
        return { ok: true, mode: "browser", results };
      }

      const { urls, openedUrls, queuedUrls } = openBrowserWhatsApp({
        phones: phoneList,
        message,
        reservedWindows: pendingWhatsAppWindows,
      });
      setWhatsAppQueue({ urls: queuedUrls, nextIndex: 0 });
      const results = phoneList.map((recipient, index) => {
        const url = urls[index];
        const opened = openedUrls.includes(url);
        return {
          recipient: phones.find((raw) => String(raw || "").replace(/\D/g, "") === recipient) || recipient,
          status: opened ? "browser" : "queued",
          message: opened
            ? `Chat opened with the prefilled message. Attach ${attachment.filename} before sending.`
            : "Your browser blocked this tab. Use Open remaining chats to prepare it; attach the downloaded file before sending.",
        };
      });
      setShareResults((current) => options.appendResults ? [...current, ...results] : results);
      if (urls.length) {
        const note = queuedUrls.length
          ? `Opened ${openedUrls.length} of ${urls.length} WhatsApp chats. ${queuedUrls.length} remaining chat(s) need a click because the browser blocked popups.`
          : `Opened all ${urls.length} WhatsApp chats with your prefilled message.`;
        if (!quiet) toast.success(`${note} ${options.downloadFile === false ? "" : "The generated file was downloaded; attach it in each chat before sending."}`);
      } else {
        closeReservedWindows(pendingWhatsAppWindows);
        if (!quiet) toast.error("No valid WhatsApp phone numbers were found.");
      }
      return { ok: urls.length > 0, mode: "browser", results };
    } catch (error) {
      closeReservedWindows(pendingWhatsAppWindows);
      const reason = error instanceof Error ? error.message : "Could not prepare sharing.";
      const failedResults = recipients.map((recipient) => ({ recipient, status: "failed", message: reason }));
      setShareResults((current) => options.appendResults ? [...current, ...failedResults] : failedResults);
      if (!quiet) toast.error(reason);
      return { ok: false, mode: "error", error };
    } finally {
      setBusy(false);
      setOperation("");
    }
  }

  function openNextWhatsAppChat() {
    const url = whatsAppQueue.urls[whatsAppQueue.nextIndex];
    if (!url) return;
    const popup = window.open(url, "_blank");
    if (!popup) {
      toast.error("The browser blocked this chat. Allow popups for SIC, then click Open remaining chats again.");
      return;
    }
    try { popup.opener = null; } catch { /* optional hardening */ }
    const openedPhone = new URL(url).pathname.replace(/\D/g, "");
    setShareResults((current) => current.map((result) => (
      String(result.recipient || "").replace(/\D/g, "") === openedPhone
        ? { ...result, status: "browser", message: "Chat opened with the prefilled message. Attach the downloaded file before sending." }
        : result
    )));
    setWhatsAppQueue((current) => ({ ...current, nextIndex: Math.min(current.nextIndex + 1, current.urls.length) }));
  }

  return (
    <div className="min-h-dvh min-w-dvh overflow-x-hidden bg-[#f5faf8] text-slate-950">
      <Header
        query={query}
        setQuery={setQuery}
        searchResults={searchResults}
        onSelectResult={(fileId) => { setActiveId(fileId); setActiveSelection(null); setQuery(""); }}
        dropzone={dropzone}
      />

      <main>
        <Hero dropzone={dropzone} fileCount={files.length} selectedCount={selected.length} />

        <div className="mx-auto w-full max-w-[1680px] space-y-6 px-3 pb-10 sm:px-4 md:px-6">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <section id="workspace" className="grid min-w-0 gap-5 xl:grid-cols-[260px_minmax(0,1fr)_360px] 2xl:grid-cols-[280px_minmax(0,1fr)_390px]">
              <FileLibrary
                files={files}
                activeId={active?.id}
                onSelect={(id) => { setActiveId(id); setActiveSelection(null); }}
                onDelete={removeFile}
                dropzone={dropzone}
              />

              <DocumentViewer
                active={active}
                blocks={blocks}
                query={deferredExtractedQuery}
                searchValue={extractedQuery}
                onSearch={setExtractedQuery}
                selected={selected}
                onAdd={addBlock}
                onAddMobile={addBlockFromMobileCopy}
                onElementSelect={selectElement}
                activeSelection={activeSelection}
                onClearSelection={() => setActiveSelection(null)}
                restoringFiles={restoringFiles}
              />

              <SelectedContent
                selected={selectedFiltered}
                totalSelected={selected.length}
                selectedQuery={selectedQuery}
                onSearch={setSelectedQuery}
                selectedWords={selectedWords}
                selectedChars={selectedChars}
                isOver={isOver}
                setNodeRef={setNodeRef}
                onRemove={removeBlock}
                onEdit={editBlock}
                onStyleChange={updateBlockStyle}
                selectedLayout={selectedLayout}
                onLayoutChange={(value) => { setSelectedLayout(value); setGenerated(null); }}
                onClear={() => { setGenerated(null); setSelected([]); }}
              />
            </section>
          </DndContext>

          <MessageComposer
            mode={mode}
            onModeChange={handleModeChange}
            emails={emails}
            setEmails={setEmails}
            phones={phones}
            setPhones={setPhones}
            senderEmail={senderEmail}
            setSenderEmail={setSenderEmail}
            whatsappPhoneNumberId={whatsappPhoneNumberId}
            setWhatsappPhoneNumberId={setWhatsappPhoneNumberId}
            emailRecipientMode={emailRecipientMode}
            setEmailRecipientMode={setEmailRecipientMode}
            subject={subject}
            setSubject={setSubject}
            message={message}
            setMessage={setMessage}
            maxCustom={MAX_CUSTOM}
          />

          <ConvertShare
            format={format}
            setFormat={(value) => { setFormat(value); setGenerated(null); }}
            busy={busy}
            selectedCount={selected.length}
            generated={generated}
            shareResults={shareResults}
            whatsAppQueue={whatsAppQueue}
            onOpenNextWhatsApp={openNextWhatsAppChat}
            operation={operation}
            emailCount={emails.length}
            phoneCount={phones.length}
            emails={emails}
            phones={phones}
            onConvert={convert}
            onDownload={download}
            onShare={share}
          />
        </div>
      </main>

      <Footer />
      {showSuccess && <SuccessModal onClose={() => setShowSuccess(false)} />}
    </div>
  );
}
