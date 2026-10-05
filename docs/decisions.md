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

- [confirmed] All art is drawn in code, as in the mockup. No image files.
  Reason: the user's choice; keeps assets, tooling and tests simple.
- [confirmed] Sound is also made in code (synthesized, no audio files). Sadie
  makes one happy sound when the child starts, and sounds when touched. She
  never makes noise at random.
- [confirmed] Fonts are hosted in the app, not loaded from a third party.
  Reason: nothing may contact outside servers.
- [confirmed] Should work in most popular browsers.
- [confirmed] For now the app runs as a claude.ai artifact; distribution is
  decided later. Reason: the user's choice. Implication: keep the app
  self-contained so it can run as a single page.
- [confirmed] Any user can save paintings out; no parent-only area for now.
- [confirmed] Content is English. Progress is tracked and saved per activity;
  painting is saved. The child is just starting to read, so text is short and
  simple but never required.
- [confirmed] No special accessibility needs known.

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

- Which learning activity comes first after painting? (Not known yet;
  focus is painting.)
- How will the app be distributed later? (For now it runs as a claude.ai
  artifact.)
- Parent-only area: none for now. Revisit if one is ever needed.

The full checklist is in [engineering.md](engineering.md).
