# SIC implementation notes

This update adds Excel-style worksheet headers (column letters and row numbers), row/column header selection, a Copy Selected Row/Column action (TSV clipboard), a persisted WhatsApp recipient checklist with Select All/Deselect All, and an explicit download-and-attach fallback for browser email/WhatsApp workflows.

The browser mailto fallback cannot attach files automatically. SIC downloads the generated file before opening the email composer and tells the user to attach it manually. WhatsApp web links likewise cannot attach files or create one multi-recipient group automatically; each chat is opened with the message prepared, and the downloaded file must be attached before sending. Automatic attachments require the configured SMTP and WhatsApp Business Platform API routes.

Excel styling fidelity depends on the source workbook metadata available through SheetJS. Formulas are represented by their displayed cell values in the selected HTML/matrix; full formula preservation and every Excel feature (e.g. advanced conditional formatting, drawings, macros) are not guaranteed by browser-side extraction.
