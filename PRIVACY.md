# Privacy Policy — AutoApply

**Last updated: July 2026**

## Summary

AutoApply does not collect, transmit, or share any data. Everything you type
into this extension stays on your own device, inside your own browser.

## What data is stored

The extension stores whatever you choose to enter in the popup: name, email,
phone number, address details, work history, education, certifications, and
skills. This is the same kind of information you'd put on a résumé.

## Where it's stored

All data is saved using the browser's built-in `storage.local` API. This is
a local, on-device database:

- It is **not** synced to any cloud account (we deliberately do not use
  `storage.sync`, which would sync via your Google or Firefox account).
- It is **not** sent to any server. AutoApply has no backend, no API, and
  makes no network requests of any kind. You can verify this yourself —
  the full source is available in the repository, and there is no `fetch`,
  `XMLHttpRequest`, or similar call anywhere in the code.
- It never leaves your device unless you explicitly use the **Export
  backup** feature, which saves a `.json` file to your own computer under
  your control.

## What the extension can see on web pages

To offer the autofill suggestion badge, the content script reads the
name/label/placeholder text of form fields on the page you're viewing, so
it can guess which saved field (e.g. "email", "phone") to offer. It does
not read or store the content of other fields, page content unrelated to
forms, or browsing history.

## Third parties

AutoApply does not use any analytics, tracking, advertising, or third-party
services of any kind.

## Data deletion

You can delete all stored data at any time via **Erase all data** in the
extension popup, or by uninstalling the extension, which removes its local
storage automatically.

## Changes to this policy

If this policy changes, an updated version will be posted in this file in
the repository.

## Contact

Questions can be raised via the GitHub repository's Issues page.
