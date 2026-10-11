# SIC

Professional document selection, conversion and sharing workspace branded as **SIC**.

## Recipient validation

### Email

When an email is added, SIC performs live server-side validation:

1. Email syntax check
2. DNS MX lookup for the domain
3. The recipient is added only when the domain has a mail server
4. After sending, the SMTP response is shown per recipient

An MX record cannot prove that a specific mailbox exists. The UI therefore says **valid** rather than making a false mailbox-existence claim. SMTP acceptance also does not guarantee final delivery.

### WhatsApp

SIC validates international phone-number formatting immediately. For WhatsApp itself, the Cloud API does **not** provide a trustworthy standalone "is this person on WhatsApp?" capability check that should be exposed independently. SIC therefore uses the real WhatsApp API response when a message is sent and shows the result for every number.

This avoids pretending a phone-format check is a WhatsApp-account check.

## Project structure

```text
SIC-document-studio/
├── apps/
│   ├── web/                 # React/Vite/Tailwind UI
│   └── api/                 # Express validation, conversion and sharing API
├── packages/
│   └── shared/              # Shared JavaScript models/templates
├── .env.example
├── docker-compose.yml
└── docs-ARCHITECTURE.md
```

## Run

```bash
npm install
cp .env.example .env
npm run dev
```

Frontend: http://localhost:5173
API: http://localhost:4000

## Real providers

Email requires SMTP configuration. WhatsApp requires Meta WhatsApp Cloud API credentials. Provider credentials remain server-side.

For production, add authentication, a database, persistent generated-file storage, queueing, rate limits per user, malware scanning and webhook-backed delivery tracking.

## Performance optimizations

The current build is optimized for a faster first load and smoother document work:

- Heavy document parsers (`xlsx`, `mammoth`, `jszip`, `papaparse`, and PDF.js) are loaded on demand instead of being part of the initial JavaScript path.
- Search uses React's deferred rendering so typing stays responsive while large document collections are scanned.
- Upload extraction processes multiple files with limited parallelism instead of serially waiting for every file.
- File and selected-content persistence is debounced and moved to an idle callback when the browser supports it, reducing main-thread stalls from repeated `localStorage` serialization.
- Content and selected-item rows are memoized to reduce unnecessary drag/drop rerenders.
- Email recipients are sent in parallel and WhatsApp document media is uploaded once and reused for all recipients.
- Nginx enables gzip compression and long-lived immutable caching for hashed/static assets while keeping the SPA entry point fresh.
- Vite production compression-size reporting is disabled to shorten build time; production assets remain minified.

### Verification note

The source/package/archive checks pass and the final ZIP was tested as a valid archive. A full dependency-installed JavaScript/Vite production build could not be completed in the current execution environment because `npm install --ignore-scripts --no-audit --no-fund` timed out. No claim of a completed production build is made from this environment.


## JavaScript-only structure

The frontend, API, and shared package are plain JavaScript/JSX. There are no TypeScript source files, TypeScript compiler steps, or `tsconfig.json` files required to run the project.

## UI architecture

The React frontend is intentionally componentized so each workspace area can be changed independently:

- `Header.jsx` — sticky brand, global search and upload action
- `Hero.jsx` — landing/hero upload drop zone and workflow summary
- `FileLibrary.jsx` — multi-file list, active-file selection, delete and extraction status
- `DocumentViewer.jsx` — extracted content container for the active file
- `ContentBlock.jsx` — selectable/draggable extracted content block
- `SelectedContent.jsx` — drop target and selected-content ordering container
- `SelectedItem.jsx` — sortable selected content item
- `MessageComposer.jsx` — Business, Personal and empty Custom message modes
- `Recipients.jsx` — multi-recipient live validation
- `ConvertShare.jsx` — conversion, download and sharing actions/results
- `Footer.jsx` — project footer
- `SuccessModal.jsx` — sharing success state

### Upload and selection behavior

Multiple files can be selected in one upload action or dropped into the hero area. Each file receives its own processing state and is extracted independently with a small concurrency limit so large batches do not freeze the UI. Clicking a file makes it the active extraction container. Content blocks can be added with `+` or dragged into Selected Content. Selected content can then be reordered with drag and drop and can combine blocks from different source files.

### Message modes

Business and Personal load their predefined subject/message. Custom uses the exact same fields and layout but starts with both subject and message completely empty.

## Sending modes

SIC supports two sending modes. Real provider credentials are optional.

- **Email API mode:** configure `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`. `SMTP_USER`/`SMTP_FROM` are your sender account; recipient emails are entered separately in the UI.
- **Email fallback mode:** when SMTP is not configured, SIC opens the user's default email application with the selected recipients, subject, and message. Generated files must be attached manually.
- **WhatsApp Cloud API mode:** configure `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID`. The phone-number ID identifies your WhatsApp Business sending number and is not a recipient number.
- **WhatsApp fallback mode:** when Cloud API is not configured, SIC prepares a separate `wa.me` chat with the prefilled message for each unique valid number saved in WhatsApp recipients. It attempts to open all chats in tabs; tabs blocked by the browser remain in an explicit-click queue. Recipient numbers are stored locally in the browser (`localStorage`), not sent to SIC servers by this fallback. The generated file must be attached manually in each chat, and the user still presses Send.

Provider credentials must remain on the API server and must never be exposed through `VITE_*` variables.

## Visual document selection fidelity

The document workspace now uses a visual-first extraction path where supported:

- PDF pages are rendered from the original PDF page and overlaid with a selectable character-level text layer. This keeps page size, word positions, line positions, font sizing and spacing visually aligned with the source while still allowing precise word/letter selection.
- PDF image/graphic selection is supported through a visual-region tool. The selected region is captured from the rendered source page, so images and mixed text/graphics can be copied into Selected Content without reconstructing the layout from plain text.
- DOCX and XLSX are rendered as structured HTML for closer preservation of headings, tables, lists, images and spacing. Text selection copies the selected DOM fragment rather than flattening it immediately to plain text.
- The Selected Content panel renders PDF selections using their original page coordinates and DOCX/XLSX selections using their copied HTML. This prevents the previous plain-text-only layout loss.
- Dragging from the source is disabled until the user has an actual selection. The user can then drag the selection proxy into Selected Content or click Add selected.

A browser cannot guarantee pixel-identical rendering for every Office document because Word/PowerPoint/Excel use application-specific layout engines and embedded fonts. PDF is the strongest fidelity path because the source page itself is rasterized and used as the visual reference.

## SIC branding and selection/drag update

The product display name is **SIC** and the current SIC logo is installed at `apps/web/public/sic-logo.jpg`.

Selection and drag behavior is intentionally gated:

- Document content is not draggable by default.
- A user must first select actual text/letters/words/lines or a visual region/image.
- Only the resulting selection card exposes the **Drag selected** handle.
- Dropping that selection into **Selected Content** copies only that selection.
- Selected Content remains independently sortable through its own handles.
- Legacy text-selection handles and visual-document selection handles use the same drop path.

## High-fidelity selection and copy mode

SIC treats the uploaded document as the immutable source of truth. PDF pages are rendered from the original file and expose a character-level selection layer, so users can select a single character, word, line, paragraph-sized range, or multiple text ranges while the original page remains visually intact. A visual-region mode can copy logos, images, charts, tables, signatures, and mixed regions as an exact rendered crop.

A selection does not move content out of the source. It creates a draggable selection proxy. Dropping into Selected Content always creates a new independent instance with `instanceId`, `sourceId`, and `sourceElementId` metadata. The same source selection can therefore be copied repeatedly. Duplicate/copy mode is ON by default.

Selected PDF text stores its original page coordinates, font metadata, fragment geometry, relative bounds, and an exact rendered crop where available. This lets the Selected Content panel and PDF conversion preserve the visual appearance rather than flattening selections into ordinary paragraphs.

## Recent selection and export layout update

- In Extracted Container, drag from a start cell to an end cell to select an inclusive rectangular XLSX range across multiple rows and columns.
- In Selected Content, choose **Vertical** (stacked) or **Horizontal** (side-by-side). The setting is remembered and used for PDF, DOCX, PPTX, and XLSX generation/sharing.
- See `PAGE-BREAKS-ALL-EXPORT-FORMATS.md` and `XLSX-START-END-RANGE-SELECTION.md` for details and known fidelity limitations.


## One-click recipient sharing

See [`WHATSAPP-ONE-CLICK-BULK-SEND.md`](./WHATSAPP-ONE-CLICK-BULK-SEND.md) for setup. When configured, SIC sends the generated attachment and message to every added valid WhatsApp recipient through Meta's Cloud API; when not configured, it opens individual prefilled chats and requires manual attachment and sending. SMTP similarly enables automated email delivery with the generated attachment.


## Personal sharing settings

SIC's Message & Sharing section includes a personal email address and an optional WhatsApp Business Phone Number ID. These two settings are saved in the current browser on the user's device. Recipient email addresses and phone numbers are also retained locally.

- **WhatsApp one-press delivery:** SIC submits the same selected-file attachment and message to every valid unique WhatsApp recipient when `WHATSAPP_ACCESS_TOKEN` is configured on the API server. The Phone Number ID entered in SIC overrides the server default for that request. Keep the access token in the server `.env`; never put it in frontend code or browser storage.
- **Email one-press delivery:** SMTP must be configured with `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` on the API server. The personal email entered in SIC is used as the reply-to address and as the To address when recipients are routed to CC/BCC. The authenticated sender remains the server's configured `SMTP_FROM`.
- **Browser fallback:** Without configured providers, SIC opens prefilled email/WhatsApp drafts and downloads the selected file for manual attachment. Browser links cannot silently send messages or automatically attach a local file.
- **Meta policy:** Only message opted-in recipients and use approved templates when required by Meta's messaging rules.
