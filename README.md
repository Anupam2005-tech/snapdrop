# SnapDrop

A Manifest V3 Chrome extension that captures a screenshot of your active browser tab, converts it to your chosen image format, uploads it directly to your Google Drive (creating nested folders automatically), sets link sharing to *"Anyone with the link can view"*, and copies the shareable Google Drive URL straight to your clipboard.

> **Privacy first:** SnapDrop has no backend server. All image processing happens locally in your browser, and screenshots upload directly from Chrome to your own Google Drive via OAuth 2.0. See [screenshare-ext/store/PRIVACY.md](screenshare-ext/store/PRIVACY.md) for details.

---

## Features

- **Instant Tab Capture**: Capture the visible viewport of the active tab from the popup or via keyboard shortcut.
- **Google Drive Auto-Upload & Folder Creation**: Defaults to `snapdrop/photos`, supports nested paths (e.g. `Work/Screenshots/2026`), and auto-creates missing folders.
- **Folder Autocomplete**: Suggests existing folders from your Google Drive as you type.
- **Format Selection**: Supports WebP (default), PNG, and JPEG (with PNG/JPEG/WebP conversion via `OffscreenCanvas`; other listed options fall back to PNG).
- **Automatic Public Link & Clipboard Copy**: Sets Drive file permissions to public read-only (`anyone` / `reader`) and copies the `webViewLink` to your clipboard.
- **Local Capture History**: Stores the last 10 captures locally in `chrome.storage.local` with thumbnails and one-click link re-copy.
- **Synced Settings**: Saves your default folder and format in `chrome.storage.sync`.

---

## Project Structure

```text
chrome_Extension/
├── README.md
└── screenshare-ext/           # Load THIS folder as the unpacked Chrome extension
    ├── manifest.json          # Extension manifest (MV3, OAuth2 config, shortcuts)
    ├── background.js          # Service worker (capture, Drive API v3, history, shortcuts)
    ├── content.js             # Page overlay script
    ├── offscreen.html         # Offscreen document host
    ├── offscreen.js           # Offscreen clipboard & image helpers
    ├── popup/
    │   ├── popup.html         # Popup UI (onboarding, capture, history, settings)
    │   ├── popup.js           # Popup logic & Drive autocomplete
    │   └── popup.css          # Popup styling
    ├── icons/                 # Pre-generated extension icons (16, 32, 48, 128) & master_icon.png
    ├── generate-icons.js      # Node script to regenerate PNG icons from master_icon.png
    ├── package.json           # Icon generator dependencies (canvas)
    ├── key.pem                # Extension signing key matching manifest.json "key"
    └── store/
        ├── LISTING.md         # Chrome Web Store listing copy
        └── PRIVACY.md         # Privacy policy
```

---

## Prerequisites

1. **Google Chrome** (recommended over unbranded Chromium/Brave/Edge, because this extension uses `chrome.identity.getAuthToken()`, which relies on Chrome's built-in Google account sign-in).
2. **A Google Account** signed into your Chrome profile (with Chrome Sync / account sign-in enabled for `chrome.identity`).
3. **Git** (or download the repository as a ZIP).
4. **Google Cloud Project OAuth Client ID** (see [Step 2: Configure Google Drive OAuth](#step-2-configure-google-drive-oauth) if the bundled client ID is restricted to the original author's test users).
5. **Node.js (Optional)**: Only needed if you plan to modify `screenshare-ext/icons/master_icon.png` and regenerate icons. Pre-built icons are already included.

---

## Quick Start (All Platforms)

### Step 1: Clone the Repository

#### macOS / Linux (Terminal)
```bash
git clone https://github.com/Anupam2005-tech/snapdrop.git
cd snapdrop
```

#### Windows (PowerShell or Command Prompt)
```powershell
git clone https://github.com/Anupam2005-tech/snapdrop.git
cd snapdrop
```

*(Alternatively, download the ZIP from GitHub and extract it.)*

---

### Step 2: Configure Google Drive OAuth

`screenshare-ext/manifest.json` includes the original author's `oauth2.client_id` and a pinned `"key"`. If your Google account is not authorized on the author's OAuth consent screen (e.g., if the app is in **Testing** mode in Google Cloud), connecting Drive will fail with an OAuth access/verification error.

To use your own Google Cloud OAuth Client ID:

1. **Load the extension first** (see Step 3 below) and copy its **Extension ID** from `chrome://extensions` (for example, `abcdefghijklmnopqrstuvwxyzabcdef`).
   - *Tip:* Because `screenshare-ext/manifest.json` contains a `"key"` field, Chrome assigns the same Extension ID on every machine. If you want a fresh Extension ID, remove `"key"` from `screenshare-ext/manifest.json` and reload the extension first.
2. Open the [Google Cloud Console](https://console.cloud.google.com/) and create or select a project.
3. Enable the **Google Drive API**:
   - Go to **APIs & Services → Library**
   - Search for **Google Drive API** and click **Enable**.
4. Configure the **OAuth consent screen**:
   - Go to **APIs & Services → OAuth consent screen** (or **Google Auth Platform**).
   - Choose **External** (or Internal for Google Workspace).
   - Fill in app name (`SnapDrop`), support email, and developer contact email.
   - Add the two scopes used in `screenshare-ext/manifest.json`:
     - `https://www.googleapis.com/auth/drive.file`
     - `https://www.googleapis.com/auth/drive.metadata.readonly`
   - Under **Audience / Test users**, add the Google email address(es) you will sign in with.
5. Create the **OAuth 2.0 Client ID**:
   - Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
   - Set **Application type** to **Chrome Extension**.
   - Paste your **Extension ID** into the **Item ID** field and click **Create**.
6. Copy the generated **Client ID** and replace `oauth2.client_id` in `screenshare-ext/manifest.json`:
   ```json
   "oauth2": {
     "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
     "scopes": [
       "https://www.googleapis.com/auth/drive.file",
       "https://www.googleapis.com/auth/drive.metadata.readonly"
     ]
   }
   ```
7. Go back to `chrome://extensions` and click the **Reload** icon on the SnapDrop card.

---

### Step 3: Load the Unpacked Extension in Chrome

Follow the instructions for your operating system below. **Always select the `screenshare-ext` subfolder**, not the root repository folder.

#### macOS

1. Open **Google Chrome** and make sure you are signed into a Chrome profile with your Google account.
2. Navigate to `chrome://extensions` in the address bar.
3. Toggle **Developer mode** ON in the top-right corner.
4. Click **Load unpacked**.
5. In the Finder dialog, navigate to your cloned folder and select `snapdrop/screenshare-ext` (where `manifest.json` lives), then click **Select**.
6. Click the **Extensions** puzzle icon in Chrome's toolbar and pin **SnapDrop** for quick access.
7. **macOS Permissions & Notifications**:
   - To see upload notifications from keyboard-shortcut captures, open **System Settings → Notifications → Google Chrome** and allow notifications.
   - Default capture shortcut on macOS: **`Cmd + Shift + S`**. You can customize this at `chrome://extensions/shortcuts`.

#### Windows

1. Open **Google Chrome** and sign into a Chrome profile with your Google account.
2. Navigate to `chrome://extensions` in the address bar.
3. Toggle **Developer mode** ON in the top-right corner.
4. Click **Load unpacked**.
5. Browse to `<your-clone-location>\snapdrop\screenshare-ext` and click **Select Folder**.
6. Click the **Extensions** puzzle icon in Chrome's toolbar and pin **SnapDrop**.
7. **Windows Notes & Shortcuts**:
   - Default capture shortcut on Windows: **`Ctrl + Shift + S`**. If another app or browser feature intercepts `Ctrl+Shift+S`, rebind it at `chrome://extensions/shortcuts`.
   - Ensure notifications for **Google Chrome** are enabled under **Windows Settings → System → Notifications** (and not blocked by Do Not Disturb / Focus Assist).

#### Linux

1. Open **Google Chrome** (note: `chrome.identity.getAuthToken()` requires official Google Chrome; open-source Chromium builds without Google API keys or browsers like Brave/Vivaldi generally cannot complete `getAuthToken()` OAuth flows).
2. Ensure you are signed into a Chrome profile with your Google account.
3. Navigate to `chrome://extensions` in the address bar.
4. Toggle **Developer mode** ON in the top-right corner.
5. Click **Load unpacked**.
6. Select `<your-clone-location>/snapdrop/screenshare-ext` and click **Open**.
7. Click the **Extensions** puzzle icon in Chrome's toolbar and pin **SnapDrop**.
8. **Linux Notes & Shortcuts**:
   - Default capture shortcut on Linux: **`Ctrl + Shift + S`**. Customize it at `chrome://extensions/shortcuts` if it conflicts with your desktop environment or window manager.
   - Desktop notifications depend on your DE notification daemon (`libnotify` / GNOME / KDE notifications).

---

### Step 4: Connect Google Drive & Capture

1. Click the pinned **SnapDrop** icon in the Chrome toolbar.
2. Click **Connect Google Drive** and approve the requested Drive permissions in the Google account picker.
3. Choose a destination folder (default: `snapdrop/photos`) and image format (default: `WebP`).
4. Click **Capture Screenshot** (or press `Enter` inside the popup, or use the global shortcut `Ctrl+Shift+S` / `Cmd+Shift+S`).
5. SnapDrop captures the active tab, uploads it to Google Drive, enables public link sharing, and copies the link to your clipboard.

---

## Optional: Regenerating Extension Icons (Development)

The repository already includes pre-generated icons in `screenshare-ext/icons/` (`icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`). You only need Node.js if you want to regenerate icons from `screenshare-ext/icons/master_icon.png`.

Because `screenshare-ext/package.json` uses the native `canvas` (`^3.2.3`) package, installing dependencies from scratch may require native graphics libraries if prebuilt binaries are unavailable for your OS/Node version.

### macOS
```bash
# Install native dependencies (via Homebrew) if canvas needs to compile from source
brew install pkg-config cairo pango libpng jpeg giflib librsvg pixman

cd screenshare-ext
npm install
npm run icons
```

### Windows
1. Install [Node.js LTS](https://nodejs.org/).
2. If `npm install` cannot download a prebuilt `canvas` binary for your Node version, install **Visual Studio Build Tools** (with *"Desktop development with C++"*) and GTK/Cairo prerequisites per the [`node-canvas` Windows guide](https://github.com/Automattic/node-canvas/wiki/Installation:-Windows).
3. Run:
   ```powershell
   cd screenshare-ext
   npm install
   npm run icons
   ```

### Linux (Debian / Ubuntu)
```bash
# Install native build dependencies if canvas needs to compile from source
sudo apt-get update
sudo apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

cd screenshare-ext
npm install
npm run icons
```

*(For Fedora/RHEL: `sudo dnf install gcc-c++ cairo-devel pango-devel libjpeg-turbo-devel giflib-devel`.)*

---

## Troubleshooting

| Issue | Cause & Fix |
| :--- | :--- |
| **"OAuth2 not granted or revoked" / `bad client id` / Access blocked** | You are likely not listed as a Test User on the bundled OAuth Client ID, or you changed the Extension ID. Follow [Step 2](#step-2-configure-google-drive-oauth) to create your own Chrome Extension OAuth Client ID and update `screenshare-ext/manifest.json`. |
| **`getAuthToken` fails on Linux or non-Chrome browsers** | `chrome.identity.getAuthToken` requires official **Google Chrome** signed into a Chrome profile. It will not work in unbranded Chromium or most Chrome forks. |
| **Manifest error when loading unpacked** | Make sure you select the `screenshare-ext/` directory (which contains `manifest.json`), not the outer `snapdrop/` repository root. |
| **Keyboard shortcut (`Ctrl+Shift+S` / `Cmd+Shift+S`) does nothing** | Check `chrome://extensions/shortcuts` to confirm no OS or extension shortcut conflict exists, and ensure the active tab is a normal webpage (Chrome blocks extensions from capturing restricted pages like `chrome://*` or the Chrome Web Store). |
| **Capture fails on `chrome://` or blank pages** | Chrome's security model prevents `captureVisibleTab` on internal `chrome://` pages, `chrome-extension://` pages, and the Chrome Web Store. Test on any regular `https://` webpage. |

