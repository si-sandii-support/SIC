# Architecture

## Frontend
`apps/web` owns all UI state and client-side extraction. It never receives SMTP or WhatsApp secrets.

## Domain boundary
`packages/shared` contains data contracts used by the web and API packages.

## API
`apps/api` owns conversion and provider integration. The conversion endpoint receives the selected blocks only.

## Conversion
- PDF: PDFKit
- DOCX: docx
- PPTX: PptxGenJS
- XLSX: ExcelJS

## Sharing
- Email: SMTP/Nodemailer with generated document attachment.
- WhatsApp: Meta Cloud API. Generated files are uploaded as WhatsApp media and sent as a document; the message text is used as the document caption.

## State lifecycle
1. User uploads documents.
2. Browser extracts content and creates stable block IDs.
3. Selected blocks are maintained independently from active file.
4. Only selected blocks are submitted for conversion.
5. Generated base64 is held in browser memory until download/share.
6. Provider secrets remain on the API server.

## Scaling path
For large teams, add authentication, PostgreSQL, S3-compatible object storage, Redis/BullMQ, antivirus scanning and a background conversion worker. Keep the existing conversion/provider service interfaces so those additions do not require rewriting the UI.
