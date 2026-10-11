# SIC responsive and export alignment update

## Responsive behavior
- Fluid workspace columns: one column on phone-sized viewports, two-column working layout on tablets, and three columns on wide desktops.
- Touch-safe action controls, horizontal scrolling for spreadsheet/table content, safe-area padding, and reduced-motion support.
- Document previews constrain images to the available viewport while retaining scrollable wide tables/sheets.

## Export alignment
- PDF, DOCX, PPTX, and XLSX generation now reads supported selected-item style properties such as text alignment, font size/family, weight, italic, and line spacing where supported by each format.
- DOCX table cells preserve basic inline text alignment.
- XLSX output estimates widths and row heights for text-only ranges, wraps cell text, and applies selected-item alignment as a fallback.
- Original HTML/CSS cannot be perfectly reproduced by every file format. Complex layouts, unsupported fonts, SmartArt, animations, formulas, and browser-specific styles may differ because the export formats have different layout models.

## Validation
Run from the repository root:

```sh
npm install
npm run build
```

The JavaScript syntax checks for API conversion services should also be run after edits. Device testing and opening generated files in Microsoft Office/LibreOffice/PDF viewers is still required before production release.
