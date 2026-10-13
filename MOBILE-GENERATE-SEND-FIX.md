# Mobile Generate, Download and Send Fix

## Changes
- Generated-file downloads now decode the returned base64 payload into a Blob and use an object URL instead of a large `data:` URL, which is more reliable on iOS Safari and Android Chrome.
- Download now shows a visible error if no generated file is available or the payload cannot be decoded.
- Email/phone Add buttons keep a visible label and a minimum 44px touch target on small screens.
- Generate and share buttons retain explicit button types and accessible labels.

## Important browser limitations
- Browser email (`mailto:`) and WhatsApp (`wa.me`) fallbacks cannot attach a local file automatically; the downloaded file must be attached manually.
- For automated delivery, deploy the API and configure SMTP/WhatsApp Cloud API credentials server-side.
- Verify `VITE_API_URL` points to the deployed API (including `/api` if required by this project). A frontend-only deployment with an incorrect API URL will not generate files.

## Test checklist
1. On an actual iPhone/iPad Safari and Android Chrome, select content and tap Generate.
2. Confirm a generated file is shown, then tap Download and check the browser Downloads/Files location.
3. Add email addresses and phone numbers; the Add label should remain visible.
4. Tap Send Email or Send WhatsApp and confirm a draft/chat opens; manually attach the downloaded file when using browser fallback.
5. With server providers configured, verify provider response statuses for actual delivery.

This patch is not a substitute for production testing with the deployment's real API URL and provider credentials.
