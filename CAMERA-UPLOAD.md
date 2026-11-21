# Camera Upload

A Camera button is shown immediately beside Upload files in the SIC header.

- On Android Chrome and other browsers that support the `capture` hint, it requests the rear camera for a photo.
- On iOS Safari, behavior is controlled by iOS; the picker may offer Take Photo, Photo Library, or both.
- Captured images enter the same `onUpload` processing pipeline as uploaded files, so they receive normal file-size validation, persistence, extraction, and search indexing.
- If camera access is denied or unsupported, use Upload files and choose a photo from the device.

Camera behavior depends on browser/device permissions. Test on HTTPS or localhost; camera capture availability may be restricted on insecure origins.
