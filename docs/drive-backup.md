# Automatic backup to Google Drive (research, nothing built)

Question (user, 2026-10-05): can the app save to a person's Google Drive on its own, now that
`main` is a GitHub Pages site? Answer: **a parent-triggered upload is possible; a fully
unattended one is not, without a server.** Facts below are from Google's documentation
(checked 2026-10-05) unless marked inferred.

## What works from a static page

- Google Identity Services, "token model" (`initTokenClient` / `requestAccessToken`): pure
  browser JavaScript, no backend, no stored refresh tokens
  ([guide](https://developers.google.com/identity/oauth2/web/guides/use-token-model)).
- Scope `drive.appdata` writes to a hidden folder only this app can see (the parent cannot
  browse it in Drive; restore goes through the app). Non-sensitive scope (from memory, verify
  in the consent-screen setup). Uploads are a normal `fetch` to the Drive API with the token.
- Needs a Google Cloud project, an OAuth web client whose "Authorized JavaScript origin" is
  `https://yaosio.github.io` (origin only, not the repo path), and a consent screen with an app
  name, support email and privacy policy link. Leave it "In production": in "Testing" status
  every authorization expires after 7 days and only 100 listed test users work
  ([Google](https://support.google.com/cloud/answer/15549945)).
- The user does the Google Cloud setup by hand (sessions cannot).

## What does not work

- **Unattended, silent saving.** Access tokens are short-lived (about an hour); a new one must be
  requested "from a user-driven event such as a button press", silent re-request is not
  supported, and a Google dialog (popup) is always shown. A child's painting session cannot
  upload by itself, and a Google popup must never appear in front of a child.
- **Refresh tokens without a server.** The code flow that gives refresh tokens needs a
  `client_secret` even with PKCE for web clients (reported by a Google representative; one source),
  so it needs a small backend that holds the secret. That means hosting, an account system for
  the backend and more privacy surface: well outside rule 10.
- Everything is shared per origin: any other site under `yaosio.github.io` shares this app's
  storage and could read it. Use a custom domain or keep the account's other Pages sites out of
  it if that matters (inferred).

## Shape of a version that fits the rules

1. A parent-only spot (hold a corner for a few seconds; nothing a child finds by accident) that
   loads the Google script only then, and signs in once.
2. "Back up now" there (a button press, so a token can be requested): uploads one file, the same
   `.txt` backup as today. Restore goes through the existing merge.
3. Sadie never mentions it; the child sees nothing. The app makes no network call until a parent
   opts in; the smoke test's "no outside request" check stays for the default path.
4. Costs: rule 10 becomes "no network unless a parent turns on backup" (the user's decision, to
   record in decisions.md), a privacy policy page, ongoing Google setup upkeep, and a real
   phone test (iOS Safari and popups: inferred risk).

Alternatives: today's share sheet ("Save to Drive" is one tap in it); on desktop Chrome the
File System Access API could write straight into a Drive-synced folder (not on phones).

Not built. Needs the user's decision on rule 10 and on a parent gate first.
