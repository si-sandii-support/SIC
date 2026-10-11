# Mobile and tablet copy/paste selection

The extracted-content selection action bar now includes:

- **Copy text**: copies selected text to the device clipboard using the Clipboard API, with a legacy browser fallback. Clipboard permissions may require HTTPS or localhost.
- **Paste another copy**: adds a new independent copy of the selected source block to Selected Content. The existing automatic selection-add behavior is preserved; this button intentionally creates an additional copy.
- **Drag selected** remains optional. Touch users can use the buttons instead of dragging.

This provides a touch-friendly alternative for phones and tablets. Browser/device testing is still required for clipboard permission behavior and each supported document type.
