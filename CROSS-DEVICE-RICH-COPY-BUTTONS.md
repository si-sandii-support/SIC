# SIC: Android, iOS and tablet Copy to Selected buttons

## User workflow
- Every extracted content block has a visible **Copy to Selected** button.
- When a text range, PDF text selection, image region, or supported visual element is selected, the selection action bar also provides **Copy to Selected**.
- These controls are ordinary accessible buttons and do not require drag-and-drop. They work with taps on touchscreens and clicks on desktop browsers.
- Copying creates a new SIC item in Selected Content; it does not remove or mutate the source. Supported visual, HTML, image, table and layout data is cloned by the existing selection-copy logic.
- **Copy text** is separate: it writes plain text to the device clipboard when browser security and permissions allow it.

## Device considerations
- Use a secure HTTPS origin for browser clipboard access on iOS and Android.
- Touch target sizing is at least 44 CSS pixels for coarse-pointer devices.
- Rich-content copying is internal to SIC; mobile OS clipboard APIs are not used to transfer complete image/table/layout objects.

## Verification
Run `npm install` at the repository root, then `npm run build -w apps/web`. Exercise the controls in Safari on iOS/iPadOS, Chrome on Android, and desktop browsers. Physical-device tests have not been claimed by this patch.
