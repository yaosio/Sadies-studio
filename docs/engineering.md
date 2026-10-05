# Engineering checklist

Things a good engineer plans for, so the user does not have to know to ask.
Raise the relevant ones before building. Log each answer in
[decisions.md](decisions.md). Status: **?** open question for the user,
**default** a proposed default, **done** decided.

## Child safety and privacy

- No accounts, no network calls, no analytics, no ads, no external links,
  nothing leaves the device. (default; also CLAUDE.md rule 10)
- No third-party scripts or fonts at runtime if avoidable. The mockup loads
  Pixelify Sans from Google Fonts, which contacts a third party. (? self-host
  the font, or accept it)
- Paintings are the child's data. Who else uses the device, and should
  paintings be private to the app? (?)

## Accessibility

- Honor reduced motion (mockup does). (default)
- Never rely on reading, color alone, or hover. Targets large enough for small
  hands. (default)
- Is the child's color vision or motor control a factor? (?)
- Screen reader support for a canvas app is limited; what is expected? (?)

## Offline and installability

- Works offline after first load (service worker) and can be added to a home
  screen. (default; ? is home-screen install wanted)
- Where will it be hosted, and how does the child's device get updates? (?)

## Performance

- Target cheap phones and old tablets: integer-scaled canvas, redraw only what
  changed, no per-frame allocation. (default)
- Which devices does the child actually use? (?)

## Audio

- Sound effects, music, Sadie's voice: none yet. Decide before building.
  Browsers block audio until a tap. Volume and a mute that a child can find.
  (?)

## Saved data

- Storage is browser local storage; it can be cleared by the browser or lost
  with the device. Size limits apply. (default: versioned, see saving.md)
- Backup and export: should the parent be able to save paintings out (image
  file, print) or move them to another device? (?)
- Is there any parent-only area, and if so how is it kept out of a child's
  reach? (?)

## Browsers and devices

- Which browsers and devices must work? Proposed: current Safari on iPhone and
  iPad, Chrome on Android, desktop Chrome, Firefox, Edge. (? confirm)
- Touch, mouse and stylus via pointer events. Pinch or double-tap zoom must not
  hijack the canvas. (default)

## Art assets

- How Sadie's art is made and stored: drawn in code (mockup) versus image
  files made by an artist or tool. (?) Affects tooling, tests and file size.
- Sadie's design source: the user's photo of the cat. Should a source image be
  kept in the repo? (?)
- Naming convention and one palette file once art exists. (default)

## Learning content (later)

- Who defines what the child learns and at what level? Progress tracking, or
  none? (?)
- Content that is language-specific: which language(s)? (?)

## Quality and operations

- Tests, screenshot checks and smoke test: see testing.md. (default)
- Error handling: a child must never see a crash or technical message. (default)
- Licensing for fonts, art and any library used. (default: record in decisions)
