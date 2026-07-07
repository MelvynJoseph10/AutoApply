# Job Application Autofill (local-only extension)

A simple Chrome extension that saves your info **only on your own device**
and offers to fill it into job application form fields as you focus them.

## Where your data lives — the safety part

- All data is stored using `chrome.storage.local`. This is a local browser
  database on your machine only.
- It is **not** `chrome.storage.sync` (which would upload it to your Google
  account) — that was deliberately avoided.
- There is **no server, no API, no `fetch()`, no `XMLHttpRequest`** anywhere
  in this codebase. You can check `content.js` and `popup.js` yourself —
  neither file makes a network call.
- `host_permissions: ["<all_urls>"]` in `manifest.json` is only there so the
  content script (the little "fill" badge) can run on any site you're
  filling out a form on — it is not used to send data out.
- Uninstalling the extension or clicking "Erase all data" in the popup
  permanently deletes everything.

## Installing it — Firefox

Firefox uses the same underlying WebExtensions APIs, so no code changes were
needed — just the way you load it differs from Chrome. Two options:

**Option A — quick testing (temporary, removed when Firefox closes)**
1. Go to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…**
3. Select the `manifest.json` file inside the `autofill-extension` folder.
4. It's active immediately — but Firefox unloads it when you close the
   browser, so you'd redo this each session. Good for trying it out.

**Option B — permanent install (recommended for actual daily use)**
Regular Firefox only permanently loads *signed* extensions. Since this is
just for you, the easiest path is:
1. Zip the `autofill-extension` folder's contents (not the folder itself,
   the files inside it) into a `.xpi`-ready zip.
2. Go to https://addons.mozilla.org/developers/ → sign in (free Mozilla
   account) → **Submit a New Add-on** → choose **On your own** (unlisted,
   not published publicly) → upload the zip.
3. Mozilla signs it automatically and gives you back a signed `.xpi` file.
4. Open that `.xpi` in Firefox (drag it into a Firefox window, or
   File → Open) and it installs permanently, just like any add-on.

Alternatively, if you use **Firefox Developer Edition** or **Nightly**, you
can set `xpinstall.signatures.required` to `false` in `about:config` and
load the unpacked folder permanently without signing — but that setting
isn't available on regular release Firefox.

## Installing it — Chrome / Chromium / Brave / Edge

1. Unzip this folder somewhere permanent (don't delete it after — Chrome
   loads the extension directly from these files).
2. Go to `chrome://extensions`.
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the `autofill-extension` folder.
5. Pin the extension (puzzle-piece icon in the toolbar → pin it) so it's
   easy to reach.

## Setting up your profile

1. Click the extension icon → the popup opens.
2. Fill in the **Basics** tab (name, email, phone, etc).
3. Go to **Experience** and add each job (title, company, dates, bullet
   points).
4. Go to **Certs / Skills** for certifications, skills, and education.
5. Click **Save**.

### Fast option: import your resume data in one click
I've pre-filled `my-profile-starter.json` with the work history you gave
me. Open the popup → **Import backup** → select that file. Then just fill
in the blank fields (name, email, phone, LinkedIn, education) and hit Save.

## Using it on a job application

1. Click into any text field on a form (name, email, phone, "tell us about
   yourself", etc).
2. A small blue **⚡** badge appears at the field.
3. Click it — the field fills instantly with the best-matching saved info.
4. It works on any site, since it just looks at the field's name/label
   text (e.g. "email", "phone", "linkedin") to decide what to offer.

## Backing up / moving to another computer

Use **Export backup** in the popup to save a `.json` file, and **Import
backup** on another install to load it back in. This file is just your
data — treat it like you would a resume file (don't upload it anywhere
you wouldn't upload your resume).

## Notes / limitations

- Field-matching is heuristic (keyword-based), so occasionally you'll need
  to type a field manually if the site uses unusual labels — that's
  expected and safer than guessing wrong.
- It doesn't currently handle dropdowns/select menus or file uploads
  (resume PDF upload), just text/email/tel/textarea fields.
