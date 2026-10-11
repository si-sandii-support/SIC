# Android / iOS Copy to Selected fix

- The explicit **Copy to Selected** button is rendered only on Android and Apple touch devices (iPhone, iPad, iPod, and touch-capable iPadOS).
- Desktop browser behavior is preserved: selecting text continues to use the existing auto-select flow; the mobile-only button is not shown on desktop.
- Mobile copy normalizes extracted markup/image data into the rich selection model before calling the same `addBlock` state pipeline.
- Copying clears an old Selected Content search filter and scrolls the view to the Selected Content panel so the newly inserted item is visible.
- Button clicks stop propagation and show success/error feedback. The original extracted source is not modified.

The ZIP archive is checked for integrity. Physical Android/iOS device testing and the production build still need to be run in the project's normal development environment.
