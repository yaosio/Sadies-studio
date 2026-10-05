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
- [confirmed] Painting takes the ENTIRE screen, for the most paint area, with
  the minimum of UI on top: tools are small, tucked at the edges and
  collapsible, never shrink the canvas, and the way back to the room is
  unobtrusive. (Replaces the earlier "as much as fits, framed by the easel".)
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

- [confirmed] Door, tab and tray stay the size they are now (user tried it and
  likes it).
- [confirmed] Saving a painting out: long-press (about 0.65 s) on a hung
  painting offers it as a PNG. Reason: no menu or button needed.
- [confirmed] Sadie trills when the page loads and purrs when touched. The
  trill is a rolled cat "brrrp" (the user said the first version sounded like a
  game coin).
- [proposed] Browsers (and the artifact frame) may block sound until a touch.
  The app tries to trill on load and, if blocked, trills on the first touch, key
  or click anywhere. Reason: nothing can force audio before a gesture.

## Technical (all proposed)

- [proposed] (built) Plain web tech, ES modules, canvas, no build step, minimal
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
- [proposed] The default paint grid is sized to the screen it is opened on (about 54
  cells on the short side, 11 values per cell as in the mockup), so the paper
  covers the whole screen in any shape. A painting keeps its own size
  afterwards. Reason: full-screen paper must not leave bars on phones.
- [proposed] Paper tools live in a collapsible tray along the bottom edge; a
  small tab opens it, starting to paint closes it, a faint door top-left leaves.
  Reason: least UI, usable in portrait and landscape, no handedness bias.
- [proposed] Saves are version 2: `{ version, activities: { painting: ... } }`
  under key `sadies-studio`; the mockup's v1 is migrated. See saving.md.
- [proposed] Objects, pots and tools make small sounds when touched. Nothing
  plays by itself except Sadie's one trill at the start.
- [confirmed] Paper size and zoom: zoom is pinch, double tap, wheel or keys (view
  only), and the paper is grown or shrunk by tabs on its edges in the whole-paper
  view. No paper controls in the tray (the sheet pad, hand, magnifier and plus
  icons were all confusing, user 2026-10-05). Works with touch and mouse. Old
  paintings need no care: the user is the only user.
- [proposed] Wiping the whole paper is a tray bucket you hold for about 0.9 s (no
  confirmation text). Reason: hard to do by accident; undo also brings it back.
- [confirmed] A new painting always starts at the default size (the natural grid for
  the screen). The sheet shapes (tall, wide, big, small) were dropped. Reason: they
  changed the default size.
- [confirmed] Zoom and scroll are smooth, not snapped to whole cells (the paper
  only). Reason: the user's choice. Relaxes the whole-number rule for this one case.
- [confirmed] No grid dots at all: the switch, the saved `grid` flag and the motion
  flash are removed (user 2026-10-05).
- [confirmed] Undo is multi-step (30), covers strokes, wipes and paper size changes,
  and is not saved (user likes it, 2026-10-05). Reason: a stack is no harder for a child
  than one step.
- [confirmed] Paper can be shrunk as well as grown, by pushing the edge tabs in,
  but only through bare paper (never paint). The tabs are big and act like a
  joystick (hold to keep going). Reason: swiping to the screen edge was hard on a
  phone.
- [confirmed] Hung paintings are on the wall, behind everything; the whole easel
  (frame and legs) and Sadie are in front. Reason: a tall one hung over the easel.
- [confirmed] A very tall painting hangs and then rolls up where it would reach the
  floor. Reason: the user's idea. Wide ones just hang shorter.
- [confirmed] Much more paper, with a visible wall rather than endless paper (the user's
  choice: storage is finite and an endless canvas is hard to find your way around).
  Paper stops growing at 2000 cells a side (the number is [proposed]); at the limit a
  wooden wall shows past the paper's edge and Sadie says so. No minimap for now (too small
  on a phone): zooming out shows where you are. Reason: the user's choice.
- [confirmed] While panning or zooming, ruler ticks (every 10 cells, longer every 50) show on
  all four screen edges, fixed to the paper and fading after movement stops, so scrolling over
  empty paper still looks like moving. Not dots across the screen, no fibres on the paper.
- [confirmed] Paper is stored as sparse 64x64 tiles that exist only once painted on; undo keeps
  only the touched tiles. The saved text format is unchanged, so old paintings load as before.
- [confirmed] Hung and booked paintings of a very big paper are trimmed to their paint and never
  shown at more than 8 cells to an art pixel; what is still cut off is rolled up, the bottom
  edge as before and the right edge for wide ones. The 8 is [proposed]. Reason: the user's idea
  ("they already curl up when too large"); wide pictures roll up on the edge.
- [proposed] Zoom stops at 32 canvas
  pixels per cell. A double tap within 28 art pixels and about a third of a second
  zooms instead of dabbing twice.
- [proposed] Paintings are stored in IndexedDB (one record per activity), with
  localStorage as the fallback. Reason: localStorage's roughly 5 MB limit is too
  small for big paper. The first start copies the old localStorage save over.
- [proposed] The PNG save uses a normal download link, or the host's own save
  (the artifact `downloads` capability) when running as an artifact, where
  sandboxed pages cannot start downloads.
- [proposed] A tiny dependency-free bundler (`npm run build`) makes one HTML
  file for artifacts; source follows three code-style rules it checks. Reason:
  artifacts are single pages, development stays build-free.
- [proposed] Pixelify Sans (SIL Open Font License) is hosted in `assets/fonts/`,
  latin subset, inlined as base64 in the single-file build.
- [proposed] Playwright is a dev-only tool for smoke and screenshot checks (not
  shipped); everything else uses Node's built-in test runner. CI in
  `.github/workflows/check.yml`.
- [proposed] Hex colors are allowed only in art files; paint, ink and paper
  come from `src/art/palette.js`. Enforced by a test. Reason: the art code is
  full of one-off shades that would make a single palette file useless.

- [confirmed] When the clothesline is full, new paintings go into a book that is a room
  object you tap like the easel; nothing is dropped any more. Long-press on a hung
  painting offers save, delete or move to the book instead of saving at once; the book
  has the same options with hang instead of move (user, 2026-10-05).
- [proposed] The book is a big book standing on the floor left of the easel, and its
  page is a full-screen scrolling grid of small cards (door top-left to leave).
  Reason: the easel's left side was free floor; the same "an object takes the whole
  screen" rule as painting. It is a view of the painting activity, not a second one.
- [proposed] The long-press choices are three wooden picture buttons under the held
  painting with the rest of the screen dimmed (save arrow, book, trash; peg for hang).
  Reason: no words, big targets, same look as the tray.
- [proposed] Delete has no undo; instead the trash must be held about 0.9 s (red water
  rises), like the bucket. A tap only makes Sadie say to hold it. Reason: the same
  gesture the child already learned; a timed undo would need reading or noticing a toast.
- [proposed] Hang from the book while the line is full: the peg is dimmed and Sadie says
  the line is full; nothing moves. Alternative: swap with a painting on the line.
- [proposed] The book has no limit and `book` is an optional field of the painting save
  (version stays 2). Reason: no data is ever dropped; old saves load with an empty book.
  Risk: one storage record grows with it (see saving.md "Not built yet").

- [confirmed] Tapping a hung painting (examples included) opens it on the easel to paint on;
  holding it shows a big filling ring centered on the touch, wide enough that a large finger cannot cover it; the easel shows edge arrows at the
  default zoom so the child knows the paper can be resized (user, 2026-10-05).
- [proposed] Opening a painting swaps it with the one on the easel (same place on the line or
  in the book; a bare easel just gives way). Reason: nothing is ever lost. Alternative: ask,
  or always send the easel painting to the end of the line.
- [proposed] The edge arrows are small tabs on the screen edges that glide out to the table
  view when pressed (not a pull that starts at once). Reason: simplest for a child; the real
  tabs then do the pulling.
- [done] `main` is protected by a GitHub ruleset "Protect main": changes
  need a pull request, force-pushes and deletion are blocked, no required
  human reviews (one human), repo admin can bypass. No CI exists yet, so no
  status check is required; add the real check name once a workflow has run.
  Reason: stops accidental direct pushes and history rewrites. Change it at
  GitHub > Settings > Rules > Rulesets. (Sessions cannot change repo
  settings; the user applied it on 2026-10-05.)

- [confirmed] A painting taken from the line or book opens on the easel with the whole painting in view (table view), not zoomed in (user, 2026-10-05).
- [confirmed] The tray is three drawers (paints, tools, stamps) over a fixed bottom shelf of
  the drawer knobs, undo, bucket and hang it up. Reason: stamps would have made one shelf
  of 25+ things; each drawer holds about five and the tray stays small (user chose "drawers"
  from three options, 2026-10-05).
- [confirmed] Stamps cannot be moved after they are placed; undo and stamp again. Reason:
  one less thing for the child to learn (user, 2026-10-05). Two stamps to start: Sadie and
  Chooter the dog (black, a little white on the chest and front paws).
- [confirmed] The stamp preview stays centered under the finger (not shown above it), user, 2026-10-05.
- [proposed] A stamp is painted into the paint grid in its own colors when the finger lifts
  (a ghost shows where it will land), so undo, saving, the PNG and the clothesline need no
  change and the saved format stays version 2. Alternative: a separate movable stamp layer
  (needs a saved-format change). Sizes 1x, 2x, 3x the picture, starting at 1x; no flip, no rotate (user: the mirror button was unneeded, 2026-10-05).
- [proposed] Sadie's gray in the stamp is a black and white checker (the palette has no
  gray). Chooter has a blue collar. Both are first drawings; the user may want changes.

## Open questions


- Should the browser be asked to keep the data permanently
  (`navigator.storage.persist()`)? Some browsers show a prompt, which a child
  must never see, so it is not asked for yet.
- Which learning activity comes first after painting? (Not known yet;
  focus is painting.)
- How will the app be distributed later? (For now it runs as a claude.ai
  artifact.)
- Parent-only area: none for now. Revisit if one is ever needed.

- Should the book ever have a limit, pages or sorting (by date, by color)? Today it is one
  endless scrolling grid, oldest first.
- Should hanging from the book with a full line offer to swap with one on the line?
- Which stamps next, and should a drawer grow a second page after about 8?

The full checklist is in [engineering.md](engineering.md).
