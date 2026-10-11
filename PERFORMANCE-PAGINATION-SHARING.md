# SIC performance, pagination, and sharing

## Performance algorithms
- Search is deferred and memoized in the React UI; document extraction uses bounded concurrency to keep large multi-file uploads responsive.
- Conversion only runs when the selected content changes or a fresh export is requested; existing UI state invalidates the generated export on edits.
- Export loops stream through blocks/rows rather than repeatedly scanning the whole collection for each emitted item.

## Export pagination
- PDF uses printable-area measurements for paragraph/table/image placement and moves intact images/table rows to a new page where possible.
- DOCX defines A4 page geometry and margins, keeps paragraph lines together, and marks table rows non-splitting where supported.
- PPTX puts each selected block on its own slide in vertical mode; horizontal mode places up to two selected blocks side-by-side on each slide.
- XLSX writes each range as a two-dimensional matrix, uses A4 print setup with fit-to-width and automatic page-height pagination, and lays blocks vertically or side-by-side to match the selected layout.

## Selected Content layout
- A persistent Vertical/Horizontal control changes the preview arrangement and is passed with the export request for PDF, DOCX, PPTX, and XLSX.
- Horizontal output uses two-column page/slide or worksheet placement where supported. Oversized PDF blocks revert to full-width paginated flow to avoid clipping.

## Prefilled sharing
- Email recipient list is placed in the selected To, CC, or BCC field; subject and message are prefilled in the user's mail app.
- WhatsApp generates one prefilled chat URL for every unique valid added number and opens chats sequentially to reduce popup blocking.
- Browser-based mailto/wa.me flows cannot attach files automatically. SIC downloads the generated attachment for manual attachment; configured API providers are required for actual automated attachment delivery.

## Validation
Syntax checks are run for the edited export and share helper files. Full dependency installation, generated-file visual regression tests, and performance benchmarks must be run in the deployment environment before release.


## Prefilled browser sharing (current behavior)

- Email sharing builds a browser `mailto:` draft using the current Email recipients list, subject, and message template. To/CC/BCC is respected; when added recipients are placed in CC or BCC, the user's own email address is used in the To field. That address is saved locally in this browser.
- WhatsApp sharing creates a prefilled `wa.me` chat for each valid number in WhatsApp recipients and opens the first chat, with a button to open the rest sequentially.
- The generated export is downloaded before opening the composer/chat. Browser `mailto:` and `wa.me` do not support automatic file attachment or automatic message delivery; users must attach the downloaded file and press Send. The message body remains exactly the template text (no auto-inserted attachment instruction).
- Sharing is deliberately prepared in the user's browser instead of calling the API send endpoint, ensuring the composer is prefilled rather than unexpectedly sending via a configured provider.


## WhatsApp recipient prefill update

SIC persists the WhatsApp recipient list in browser local storage (`si-phones`) on the user's device. When the user presses Prepare WhatsApp, the app reserves a tab for each valid, unique saved recipient during the click gesture and redirects each available tab to its own `wa.me` chat with the current message template prefilled. Popups blocked by browser policy are queued for the explicit **Open remaining chats** action. WhatsApp browser URLs support one recipient per chat, not multiple recipients in one draft, and browser links cannot automatically attach files or send messages.


## User-defined provider identifiers and sender email

The Message & Sharing form now saves `Your email address` and `Your WhatsApp Business Phone Number ID` per browser. The phone-number ID is sent with the WhatsApp share request and takes precedence over `WHATSAPP_PHONE_NUMBER_ID` in server configuration. The Meta access token is never requested from or stored in the browser; automated sending still requires `WHATSAPP_ACCESS_TOKEN` on the API. SMTP sender authentication likewise remains server-side.
