# Privacy Policy for SnapDrop

**Last updated:** June 2026

## Overview

SnapDrop is a Chrome extension that captures screenshots and uploads them directly to your personal Google Drive. This privacy policy explains how the extension handles your data.

## Data Collection

SnapDrop **does not collect, store, or transmit** any personal data to external servers. All operations occur locally within your browser and through Google's official APIs.

### What We Access

- **Screenshots**: Captured images are processed locally in your browser and uploaded directly to your Google Drive account. We never see or store your screenshots.
- **Google Drive**: The extension requires permission to create files and folders in your Google Drive. It only writes to the `snapdrop/` folder or folders you specify. It cannot read, modify, or delete other files.
- **Active Tab**: Used only to capture the visible portion of the current tab when you initiate a screenshot.
- **Notifications**: Used to notify you when uploads are complete.
- **Clipboard**: Used to copy public share links for your convenience.

## Data Storage

- **OAuth Tokens**: Managed entirely by Chrome's `identity` API. The extension never sees or stores your passwords or tokens.
- **Settings** (folder path, format preference, capture mode): Stored locally using `chrome.storage.sync`, synced across your Chrome browsers via your Google account.
- **Capture History** (thumbnail data URLs, filenames, timestamps, links): Stored locally using `chrome.storage.local`. This data never leaves your browser.

## Third-Party Services

The only third-party service used is **Google Drive API**, which operates under Google's privacy policy. The extension sends:
- Screenshot images you explicitly choose to upload
- Folder creation and listing requests
- Permission update requests (to make files publicly accessible when you capture)

## Data Retention

- **Uploaded images**: Remain in your Google Drive until you manually delete them.
- **Local history**: Stores the last 10 captures. You can clear this at any time via Chrome's extension data management.
- **No server-side retention**: There is no SnapDrop backend server.

## Your Control

- You can disconnect Google Drive at any time from the extension's Settings panel.
- You can revoke the extension's OAuth access via your [Google Account Permissions](https://myaccount.google.com/permissions).
- You can remove all extension data by uninstalling the extension from `chrome://extensions`.

## Changes to This Policy

If this policy changes, you will be notified via the extension's update notes on the Chrome Web Store.

## Contact

For questions or concerns, please open an issue on the extension's GitHub repository.
