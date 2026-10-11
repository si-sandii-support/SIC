const pending = new Map();
const DB_NAME = "sic-document-studio";
const DB_VERSION = 2;
const STATE_STORE = "state";
const FILE_STORE = "files";

export function loadLocal(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "") || fallback;
  } catch {
    return fallback;
  }
}

export function saveLocalIdle(key, value, delay = 450) {
  const previous = pending.get(key);
  if (previous) window.clearTimeout(previous);
  const timer = window.setTimeout(() => {
    pending.delete(key);
    const write = () => {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota is non-fatal */ }
    };
    if ("requestIdleCallback" in window) window.requestIdleCallback(write);
    else window.setTimeout(write, 0);
  }, delay);
  pending.set(key, timer);
}

function openFileDb() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) return resolve(null);
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(FILE_STORE)) db.createObjectStore(FILE_STORE);
      if (!db.objectStoreNames.contains(STATE_STORE)) db.createObjectStore(STATE_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB unavailable"));
  });
}


export async function persistJson(key, value) {
  if (!key) return;
  try {
    const db = await openFileDb();
    if (!db) { saveLocalIdle(key, value, 0); return; }
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STATE_STORE, "readwrite");
      tx.objectStore(STATE_STORE).put(value, key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Keep a small localStorage fallback for browsers where IndexedDB is unavailable.
    try { saveLocalIdle(key, value, 0); } catch {}
  }
}

export async function restoreJson(key, fallback = null) {
  if (!key) return fallback;
  try {
    const db = await openFileDb();
    if (!db) return loadLocal(key, fallback);
    const value = await new Promise((resolve, reject) => {
      const tx = db.transaction(STATE_STORE, "readonly");
      const request = tx.objectStore(STATE_STORE).get(key);
      request.onsuccess = () => resolve(request.result ?? fallback);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return value;
  } catch { return loadLocal(key, fallback); }
}

export async function persistFileBlob(id, file) {
  if (!id || !file) return;
  try {
    const db = await openFileDb();
    if (!db) return;
    await new Promise((resolve, reject) => {
      const tx = db.transaction(FILE_STORE, "readwrite");
      tx.objectStore(FILE_STORE).put({
        blob: file,
        name: file.name,
        type: file.type,
        lastModified: file.lastModified,
      }, id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch { /* cached files are an enhancement; local metadata remains usable */ }
}

export async function restoreFileBlobs(ids = []) {
  if (!ids.length) return {};
  try {
    const db = await openFileDb();
    if (!db) return {};
    const result = await new Promise((resolve, reject) => {
      const output = {};
      const tx = db.transaction(FILE_STORE, "readonly");
      const store = tx.objectStore(FILE_STORE);
      ids.forEach((id) => {
        const request = store.get(id);
        request.onsuccess = () => {
          const value = request.result;
          if (value?.blob) {
            try {
              output[id] = new File([value.blob], value.name || "document", {
                type: value.type || value.blob.type || "application/octet-stream",
                lastModified: value.lastModified || Date.now(),
              });
            } catch {
              output[id] = value.blob;
            }
          }
        };
      });
      tx.oncomplete = () => resolve(output);
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    return result;
  } catch {
    return {};
  }
}

export async function removePersistedFile(id) {
  if (!id) return;
  try {
    const db = await openFileDb();
    if (!db) return;
    await new Promise((resolve, reject) => {
      const tx = db.transaction(FILE_STORE, "readwrite");
      tx.objectStore(FILE_STORE).delete(id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch { /* non-fatal */ }
}
