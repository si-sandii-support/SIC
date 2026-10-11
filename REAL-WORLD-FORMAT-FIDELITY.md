# SIC format fidelity update

This build keeps supported document content structured from extraction through selection and conversion.

## Supported extraction
PDF, DOCX, XLSX/XLS, PPTX, TXT, Markdown, CSV, PNG, JPG/JPEG, WEBP, GIF, BMP and SVG.

## Selection fidelity
- Images remain image objects/data URLs.
- HTML/DOCX selections preserve source HTML, tables, images, spacing and lines where the browser representation exposes them.
- XLSX cells carry sheet/row/column metadata and a matrix for conversion.
- XLSX supports Auto horizontal and Auto vertical selection from the active cell.
- PPTX images are rendered as native positioned `<img>` elements rather than SVG `<image>` nodes.

## Generated files
- PDF renders images, tables, horizontal rules and text in source order.
- DOCX emits paragraphs, tables and embedded PNG/JPEG images instead of flattening everything to one text stream.
- XLSX writes selected matrices as real worksheet cells with borders, wrapping and alignment.
- PPTX emits selected images as PowerPoint image objects and selected tables as PowerPoint tables.
- Control characters are removed, but ordinary spaces, punctuation and phrases such as `sfafa@#$hjjh` are preserved.
- No artificial "Selected Content" watermark/title is inserted into generated content.

Office fidelity is source-aware but not guaranteed pixel-identical for unsupported proprietary features such as SmartArt, charts, complex theme fonts, grouped objects and advanced effects.

## Office rendering enhancement

PPTX extraction now requests a LibreOffice Impress render from `POST /api/render/pptx` when the API is available. The rendered slide pixels are displayed behind transparent structured text/image hit targets. Selecting a PPTX text shape or image crops the actual rendered Office slide, so the Selected Content and conversion pipeline can preserve the original visual appearance rather than reconstructing fonts or effects in HTML.

If the Office renderer is unavailable, SIC automatically falls back to the browser XML parser so the application remains usable offline.

XLSX cell/row/column selections remain structured spreadsheet matrices. Single-cell selection stores a single-cell matrix; horizontal/vertical auto-selection stores row/column matrices and cloned computed cell styles.
