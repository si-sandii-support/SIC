# SIC WhatsApp one-click multi-recipient send

## Configured Cloud API (automated send + attachment)

When `WHATSAPP_ACCESS_TOKEN` is configured on the API server, users can enter their Meta WhatsApp Business Phone Number ID in SIC’s **Your WhatsApp Business Phone Number ID** field, then press **Send WhatsApp** or the combined **Send to all** button. If the field is blank, SIC uses `WHATSAPP_PHONE_NUMBER_ID` from the API server environment. The frontend sends the current edited message, generated export, the entered Business Phone Number ID, and all unique valid numbers from **WhatsApp recipients** to `/api/share`. The entered ID is saved in that browser; the API access token remains server-only. The API uploads the attachment once to WhatsApp media storage and submits a document message for each recipient. Each recipient is an individual one-to-one message, not a WhatsApp group or a multi-person chat. SIC also downloads a local copy of the generated file.

Configure these in the API server environment (never in frontend/Vite variables):

```env
WHATSAPP_ACCESS_TOKEN=your_meta_cloud_api_access_token
WHATSAPP_PHONE_NUMBER_ID=your_meta_business_phone_number_id
WHATSAPP_GRAPH_VERSION=v23.0
MAX_BODY_MB=50
```

Restart the API after changing environment variables. Keep credentials secret; do not commit real tokens into source control. Only message recipients who have opted in. Meta's WhatsApp Business rules may require an approved message template when initiating a conversation outside the customer-service window. Provider acceptance is not the same as delivery; delivery status should be tracked with webhooks.

## Browser fallback (no Cloud API credentials)

SIC opens a prefilled `wa.me` chat per number, where browser popup policy permits, and shows an **Open remaining chats** control for blocked tabs. The generated export is downloaded, but it must be attached manually in each chat and the user must press Send. WhatsApp browser links cannot place multiple saved numbers into one recipient field, attach a local file automatically, or send without user action.

## Email

With SMTP configured, SIC sends the generated attachment using the selected To/CC/BCC mode. The user’s personal email saved in SIC is used as Reply-To for SMTP delivery and as the To address for CC/BCC mode; the authenticated From address remains the server’s `SMTP_FROM`. Without SMTP, SIC prepares a `mailto:` draft and downloads the file for manual attachment.


## Combined one-click sharing

Use **Send to all** to prepare the selected-content file once, process all valid email recipients and all valid WhatsApp recipients, and download one local copy. With both server providers configured this dispatches through both APIs; if either provider is unconfigured, that channel opens browser drafts/chats and still requires a person to review, attach if needed, and send.
