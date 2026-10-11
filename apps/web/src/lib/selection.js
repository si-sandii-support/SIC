export function makeSelectionSourceId(block) {
  return block?.sourceId || block?.sourceElementId || block?.id || crypto.randomUUID();
}

export function cloneSelectionInstance(block, insertAt = 0) {
  const sourceId = makeSelectionSourceId(block);
  const instanceId = crypto.randomUUID();
  return {
    ...block,
    id: instanceId,
    instanceId,
    sourceId,
    sourceElementId: sourceId,
    order: insertAt,
    copied: true,
    duplicatedFrom: sourceId,
    createdAt: new Date().toISOString(),
    // Keep the source layout immutable; copies can be edited independently.
    layout: block.layout ? structuredCloneSafe(block.layout) : block.layout,
    style: block.style ? structuredCloneSafe(block.style) : deriveStyle(block),
    visual: block.visual ? structuredCloneSafe(block.visual) : block.visual,
  };
}

export function structuredCloneSafe(value) {
  if (value == null) return value;
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value));
  }
}


function deriveStyle(block) {
  const layout = block?.layout || {};
  const visual = block?.visual || {};
  const fragments = visual.fragments || [];
  const first = fragments[0] || {};
  return {
    fontFamily: first.fontFamily || layout.fontFamily || "Arial, sans-serif",
    fontSize: first.fontSize || layout.fontSize || 16,
    fontWeight: first.fontWeight || layout.fontWeight || 400,
    fontStyle: first.italic || layout.italic ? "italic" : "normal",
    lineHeight: first.lineHeight || layout.lineHeight || 1.25,
    letterSpacing: layout.letterSpacing || 0,
    wordSpacing: layout.wordSpacing || 0,
    textAlign: layout.textAlign || "left",
    width: layout.width || visual.width || undefined,
    height: layout.height || visual.height || undefined,
  };
}
