# Browser auto-select compatibility

- Desktop browser mouse-based text selection is preserved: releasing the mouse after selecting PDF text or a supported HTML/DOCX text range still triggers SIC's existing auto-selection flow.
- The new **Copy to Selected** buttons are an additional touch-friendly option for Android, iOS/iPadOS, and tablets; they do not replace browser auto-select.
- Pointer events are retained for image/region capture and touch interactions. Spreadsheet range/row/column interactions use the legacy mouse handlers for desktop and pointer handling for touch/pen input to avoid duplicate selection events.
- A selected text/region continues to follow SIC's existing `onSelection` behavior, which automatically adds it to Selected Content. The action-bar button can be used to add another copy.

## Verification
Run `npm install` and `npm run build -w apps/web`, then test mouse auto-select in desktop Chrome/Firefox/Safari and tap/region selection in Android Chrome and iOS Safari. Physical device tests are not claimed by this patch.
