const STYLE_PROPS = [
  "fontFamily", "fontSize", "fontWeight", "fontStyle", "fontVariant",
  "textDecoration", "textTransform", "color", "backgroundColor", "letterSpacing",
  "wordSpacing", "lineHeight", "textAlign", "verticalAlign", "whiteSpace",
  "display", "padding", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "margin", "marginTop", "marginRight", "marginBottom", "marginLeft",
  "border", "borderTop", "borderRight", "borderBottom", "borderLeft",
  "width", "height", "maxWidth", "minWidth", "boxSizing", "listStyleType",
  "textIndent", "direction", "opacity", "transform", "objectFit"
];

export function cloneElementWithStyles(element) {
  if (!element) return { html: "", text: "" };
  const clone = element.cloneNode(true);
  const originals = [element, ...element.querySelectorAll?.("*") || []];
  const clones = [clone, ...clone.querySelectorAll?.("*") || []];
  clones.forEach((node, index) => {
    const original = originals[index];
    if (!original || original.nodeType !== 1) return;
    const computed = window.getComputedStyle(original);
    STYLE_PROPS.forEach((prop) => {
      const value = computed[prop];
      if (value) node.style[prop] = value;
    });
    node.removeAttribute("data-si-style-id");
  });
  return { html: clone.outerHTML, text: element.textContent || "" };
}

export function cloneRangeWithStyles(range) {
  const root = range.commonAncestorContainer.nodeType === 1
    ? range.commonAncestorContainer
    : range.commonAncestorContainer.parentElement;
  if (!root) return { html: "", text: range.toString() };

  const marked = [];
  const originals = [root, ...root.querySelectorAll?.("*") || []];
  originals.forEach((node, index) => {
    const id = `si-style-${index}`;
    node.setAttribute("data-si-style-id", id);
    marked.push(node);
  });

  const fragment = range.cloneContents();
  const holder = document.createElement("div");
  holder.appendChild(fragment);

  holder.querySelectorAll("[data-si-style-id]").forEach((clone) => {
    const original = marked.find((node) => node.getAttribute("data-si-style-id") === clone.getAttribute("data-si-style-id"));
    if (!original) return;
    const computed = window.getComputedStyle(original);
    STYLE_PROPS.forEach((prop) => {
      const value = computed[prop];
      if (value) clone.style[prop] = value;
    });
    clone.removeAttribute("data-si-style-id");
  });

  marked.forEach((node) => node.removeAttribute("data-si-style-id"));

  // A browser range inside a table normally clones only text nodes. Rebuild the
  // smallest useful table shell so XLS/XLSX/CSV selections remain table-shaped
  // instead of becoming a flattened string in Selected Content.
  const startCell = range.startContainer.nodeType === 1
    ? range.startContainer.closest?.("td,th")
    : range.startContainer.parentElement?.closest?.("td,th");
  const endCell = range.endContainer.nodeType === 1
    ? range.endContainer.closest?.("td,th")
    : range.endContainer.parentElement?.closest?.("td,th");
  if (startCell && endCell && startCell === endCell) {
    const cellClone = startCell.cloneNode(false);
    const computed = window.getComputedStyle(startCell);
    STYLE_PROPS.forEach((prop) => {
      const value = computed[prop];
      if (value) cellClone.style[prop] = value;
    });
    cellClone.innerHTML = holder.innerHTML;
    const row = document.createElement("tr");
    row.appendChild(cellClone);
    const tbody = document.createElement("tbody");
    tbody.appendChild(row);
    const table = document.createElement("table");
    table.style.borderCollapse = "collapse";
    table.style.tableLayout = "auto";
    table.appendChild(tbody);
    return { html: table.outerHTML, text: range.toString() };
  }

  return { html: holder.innerHTML, text: range.toString() };
}

export function selectionMetadata(range) {
  const rects = [...range.getClientRects()];
  const rect = rects.reduce((acc, r) => ({
    left: Math.min(acc.left, r.left),
    top: Math.min(acc.top, r.top),
    right: Math.max(acc.right, r.right),
    bottom: Math.max(acc.bottom, r.bottom),
  }), { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
  if (!rects.length) return null;
  return { x: rect.left, y: rect.top, width: rect.right - rect.left, height: rect.bottom - rect.top };
}
