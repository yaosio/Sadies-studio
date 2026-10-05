# Testing

No human looks at this app between changes, so tests and screenshots are the
eyes. Proposed, not yet built. Fill in the real commands here and in
CLAUDE.md when they exist.

## Layers

1. **Logic tests.** Saving and loading (including old versions), room data
   validity, activity interface, painting tools. Fast, no browser.
2. **Smoke test.** Load the app in a headless browser, tap the easel, paint a
   stroke, hang it up, reload, confirm it is still there, and confirm no
   console errors. Every session runs this before finishing.
3. **Screenshot checks** at three sizes: phone portrait, phone landscape,
   desktop. A visual regression fails the check.

A headless Chromium and Playwright are available in the Claude cloud
environment. Prefer them over adding tooling.

## Rules that should be tests, not prose

- Every room file validates against the room schema.
- Every activity exports the required interface.
- Every saved-data version loads.
- Colors come from the palette file only.
- The canvas never fills the whole screen (leaves room for shelves and room).
- Pixel scale is always an integer.

## CI

Proposed: one workflow that runs logic tests, the smoke test and screenshot
checks on every PR.
