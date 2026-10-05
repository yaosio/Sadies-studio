# Decision log

One line per choice, with the reason. Newest at the bottom. Delete a line when
it is superseded; do not keep history. Status is **confirmed** (the user said
so) or **proposed** (a default picked, awaiting the user).

## Product and look

- [confirmed] Browser-based. The user is building it for their own 6 year old.
- [confirmed] Not office-software, not babyish. The user dislikes both.
- [confirmed] 90s 2D activity-center look, modernized. 2D interface.
- [confirmed] The place is Sadie's studio, owned by Sadie the cat. Kids are
  in a place, not going through a menu.
- [confirmed] The activity (painting canvas) must not be a tiny part of the
  screen. It gets as much as fits.
- [confirmed] Only painting is real for now; learning activities come later.
- [confirmed] Mockup look approved: flat side-on cutaway room wider than the
  screen, draggable, doorways to other rooms, tools as objects on shelf edges,
  "hang it up" to a clothesline. See [mockup.md](mockup.md).
- [confirmed] Rich, bright, dithered pixel art, higher res than the 90s but
  not smoothed.
- [confirmed] Must work in portrait and landscape, mouse and touch.

## Process and docs

- [confirmed] Only Claude sessions touch the code; no human edits it.
  Reason: docs must serve a cold session.
- [confirmed] Docs stay small: a short index (CLAUDE.md), one topic per file,
  docs next to code, decisions not history, docs updated with every behavior
  change, rules as checks where possible. Reason: docs bloated in an earlier
  project and made sessions read unrelated text.

## Working style

- [confirmed] Claude acts like the software engineer: raises risks and
  missing questions itself and records answers here. Reason: the user does
  not know what to ask.

## Technical (all proposed)

- [proposed] Plain web tech, ES modules, canvas, no build step, minimal
  dependencies. Reason: no session fights tooling; works in any browser.
- [proposed] Rooms are data files; activities are self-contained modules with
  a tiny open/close/save interface. Reason: adding a room or activity means
  adding files, not editing painting code.
- [proposed] Saved data versioned from day one, with migrations. Reason: old
  paintings must keep loading as the app changes.
- [proposed] One palette file; art assets in one place with a naming rule.
  Reason: every room matches.
- [proposed] Logic tests plus screenshot checks at phone portrait, phone
  landscape and desktop, plus a smoke test every session runs. Reason: no
  human eyes on the result.
- [proposed] Small PRs; CI runs the tests and screenshots. Reason: easy review
  by the next session.
- [proposed] Keep the mockup's data format as the starting point for saves
  (72 x 54 grid, 11 values). Reason: user already likes how it behaves.

## Open questions

- Procedural art in code (as in the mockup) or image files for new art?
- Sound and voice for Sadie?
- Which learning activity comes first after painting?
- Self-host the font, or accept the Google Fonts request?
- Which devices and browsers must work?
- Home-screen install and hosting: where does it live?
- Backup/export of paintings for a parent, and any parent-only area?
- Language(s) for content, and progress tracking or none?
- Accessibility needs of the child (vision, motor)?

The full checklist is in [engineering.md](engineering.md).
