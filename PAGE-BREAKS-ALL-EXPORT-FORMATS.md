# Page breaks, rectangular spreadsheet ranges, and export layout

## Spreadsheet selection
- Drag between any two cells in the same worksheet to select an inclusive rectangle. Both endpoints and all cells within the rectangular bounds are included.
- The selected payload preserves a two-dimensional cell matrix, styles, formulas, number formats, column widths, row heights, and the start/end coordinates where available.
- Selecting a range never modifies the source workbook. Copy uses tab-separated values with rows and columns retained.

## Selected Content layout
- **Vertical** stacks selected blocks in order.
- **Horizontal** places selected blocks side-by-side in the Selected Content pane.
- The selected layout preference is persisted and passed with each generate/share conversion request.

## Export behavior
- **PDF:** vertical mode uses the page-flow renderer; horizontal mode places blocks in two columns and estimates row height from text, images, and tables before rendering. Images are scaled to the available column/page space. Blocks too tall to share a page fall back to normal full-width pagination to avoid clipping.
- **DOCX:** vertical mode keeps the document's normal flow; horizontal mode uses two-column Word table rows with non-splitting rows and scaled images.
- **PPTX:** vertical mode gives each selected block its own slide; horizontal mode places up to two blocks side-by-side on each slide.
- **XLSX:** vertical mode writes each selected matrix below the previous one; horizontal mode places matrices beside one another, preserving two-dimensional ranges and cell styling. Print setup uses fit-to-width and automatic page-height pagination.

## Limitations
Exact pagination and fidelity depend on the source content and how each Office format renders complex layouts. Extremely large tables, images, and nested layouts should be tested with the target Office/PDF viewer before production use. A full production build could not be performed in the editing environment because dependency installation timed out.
