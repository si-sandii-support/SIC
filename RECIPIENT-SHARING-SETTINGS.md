# SIC personal recipient and sharing settings

## User settings

- **Your email address** is saved in this browser. For browser-created drafts it is used as the To address when added recipients are placed in CC/BCC. For configured SMTP delivery it is set as Reply-To. The authenticated From address is `SMTP_FROM` on the API server.
- **Your WhatsApp Business Phone Number ID** is saved in this browser and sent with the WhatsApp API request. It must be the numeric ID provided by Meta Business/WhatsApp Cloud API setup, not one of your contacts' phone numbers. If blank, the API uses `WHATSAPP_PHONE_NUMBER_ID` from its server environment.
- Added Email and WhatsApp recipient lists are persisted in this browser. A channel's Send button processes all valid unique recipients in that list on one click. The combined **Send to all** button prepares the selected file once and then processes both recipient lists.

## Server configuration

For WhatsApp automated send with attachment, set `WHATSAPP_ACCESS_TOKEN` on the API server. Configure `WHATSAPP_PHONE_NUMBER_ID` as an optional default. The user-entered ID can override that default, but the token must have permission for the chosen business phone-number ID.

For email automated send with attachment, configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` server-side. `Your email address` is not an SMTP password and does not authenticate a mailbox. Never ask users to put SMTP passwords or Meta access tokens in local storage or frontend JavaScript.

If the corresponding provider is not configured, SIC opens browser-prepared drafts/chats and downloads the selected file for manual attachment. Browser links cannot automate attaching a local file or guarantee message delivery. Follow provider consent/opt-in and messaging-template rules.
