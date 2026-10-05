# Saving

Everything the child makes stays on the device, in the browser's local storage.
No accounts, no server.

## Rule

Saved data carries a **version number from day one**. Any change to what is
saved adds a migration so old paintings keep loading. Never drop or reinterpret
old data without a migration and a test.

## What the mockup does (starting point)

- Key `sadies-studio-v1` holds JSON `{ p: [...], c: ... }`.
- `p` is the hung paintings (max 13), `c` the painting on the easel.
- A painting is a string of 72 x 54 characters, one per pixel, `A` (paper) to
  `K` (color 10), i.e. char code minus 65.
- Saves are debounced about 500 ms after a stroke.
- Reads and writes are wrapped in try/catch; failure means the app still runs
  without saving.

## Proposed for the real app

- An explicit `version` field in the saved object, plus one migration function
  per version step.
- Painting size (width, height) stored with each painting so the grid can
  change later.
- Every storage read or write is guarded; a corrupt or missing save falls back
  to a fresh start, never a crash.
- Tests load a saved fixture from every past version.

## Decided

- Progress is saved per activity; each activity owns its saved state.
- Any user can save a painting out as an image file. Not built yet.
