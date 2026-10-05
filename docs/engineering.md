# Engineering checklist

Things a good engineer plans for, so the user does not have to know to ask.
Raise the relevant ones before building. Log each answer in
[decisions.md](decisions.md). Status: **?** open question for the user,
**default** a proposed default, **done** decided.

## Child safety and privacy

- No accounts, no network calls, no analytics, no ads, no external links,
  nothing leaves the device. (default; also CLAUDE.md rule 10)
- Fonts are hosted in the app, no third-party requests. (done)
- Paintings are the child's data. Who else uses the device, and should
  paintings be private to the app? (?)

## Accessibility

- Honor reduced motion (mockup does). (default)
- Never rely on reading, color alone, or hover. Targets large enough for small
  hands. (default)
- No special vision or motor needs known. (done)
- Screen reader support for a canvas app is limited; what is expected? (?)

## Offline and installability

- Works offline after first load and can be added to a home screen. (default)
- For now it runs as a claude.ai artifact, so keep it self-contained.
  How it is distributed later is open. (?)

## Performance

- Target cheap phones and old tablets: integer-scaled canvas, redraw only what
  changed, no per-frame allocation. (default)
- Exact devices unknown; assume cheap phones and tablets. (default)

## Audio

- Sounds are synthesized in code. One happy Sadie sound at start, sounds when
  touched, never random. (done)
- Browsers block audio until a tap. The trill is tried on load and plays on
  the first tap if blocked (`src/audio/sound.js`).
  A mute a child can find. (default)

## Saved data

- Storage is the browser's IndexedDB; it can be cleared by the browser or lost
  with the device. Size limits apply. (default: versioned, see saving.md) A failed
  save is told to the child by Sadie in one line; the browser is asked to keep the data;
  the manual backup file is the safety net. (proposed)
- Any user can save a painting out as an image file. (done)
- No parent-only area for now. (done)

## Browsers and devices

- Most popular browsers: Safari on iPhone and iPad, Chrome on Android, desktop
  Chrome, Firefox, Edge. (done)
- Touch, mouse and stylus via pointer events. Pinch or double-tap zoom must not
  hijack the canvas. (default)

## Art assets

- All art is drawn in code, no image files. (done)
- Sadie's design source is a photo of the cat the user shared; not kept in the
  repo. (default)
- One palette file, `src/art/palette.js`. (done)

## Learning content (later)

- Progress is tracked and saved per activity; painting is saved. (done)
- English. The child is just starting to read: short, simple words, never
  required. (done)
- Who defines what the child learns and at what level? (?)

## Quality and operations

- Tests, screenshot checks and smoke test: see testing.md. (default)
- Error handling: a child must never see a crash or technical message. (default)
- Licensing for fonts and any library used. Pixelify Sans is OFL (hosted);
  no runtime libraries; Playwright is dev only. (done)
