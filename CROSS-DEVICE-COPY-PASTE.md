# SIC cross-device element copy and paste

## Behavior
- Extracted blocks expose a **Copy element** action. It adds an independent clone to Selected Content rather than copying only the text string.
- Visual selections from the visual document viewer use **Paste to Selected** in the selection action bar. The cloned model retains supported `visual`, `html`, layout, and style data (including image data URLs, HTML tables, and spreadsheet range markup).
- Text-range capture is wired to mouse-up and touch-end so native selection can be captured on touch devices where the browser exposes a selection range.
- `Copy text` writes plain text to the operating-system clipboard when the browser permits it. It is distinct from **Paste to Selected**, which copies the rich SIC element within the app.
- Source extracted content remains unchanged; each inserted copy gets a new instance ID and independent style object.

## Device notes
- Use **Copy element** for a full extracted object (image, table, line/shape block, text block). For a smaller area, use the document's region/range selection first, then **Paste to Selected**.
- Spreadsheet ranges keep the existing HTML/cell-range data when the parser supplies it. Fidelity depends on source format and what the parser can extract.
- Browser clipboard access requires a secure context and may require user permission. Clipboard APIs transfer text here; rich objects are copied internally within SIC.

## Verification
Run `npm install` at the monorepo root, then `npm run build -w apps/web`. Test on touch-enabled Android/iOS browsers and desktop mouse/keyboard; this patch does not claim physical-device tests have been run.
