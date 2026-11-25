# Chrome Web Store Listing

## Extension Name

**SnapDrop** — Screenshot to Google Drive

## Short Description (132 chars max)

Capture screenshots → auto-save to Google Drive → public share link copied instantly. Tab, area, or full screen.

## Detailed Description

**Snap screenshots. Save to Drive. Share instantly.**

SnapDrop is a premium screenshot tool that captures your browser tabs and uploads them directly to your Google Drive. No backend servers, no accounts — just your own Drive connected via OAuth.

### How It Works

1. **Choose your capture mode** — Active Tab, Rectangle Area, or Full Screen
2. **Pick your format** — PNG, JPEG, WebP, AVIF, GIF, or BMP
3. **Set your folder** — defaults to `snapdrop/photos`; custom paths supported
4. **Capture** — screenshot is taken, auto-uploaded, made public, and a shareable Google Drive link is copied to your clipboard

### Key Features

- **3 Capture Modes**: Capture the visible tab, drag-select a rectangular area, or capture the full screen with `getDisplayMedia`
- **Multiple Image Formats**: PNG (lossless), JPEG/JPG, WebP, AVIF, GIF, BMP
- **Smart Autocomplete**: Folder suggestions from your Drive as you type
- **Automatic Folder Creation**: Nested folders like `Work/Screenshots/2026` are created on the fly
- **Public Sharing**: Files are automatically set to "Anyone with the link can view"
- **One-Click Copy**: The public Drive link is instantly copied to your clipboard
- **Keyboard Shortcut**: `Ctrl+Shift+S` (Windows/Linux) or `Cmd+Shift+S` (Mac)
- **Local History**: Last 10 captures with thumbnails — re-copy links anytime
- **Premium Dark UI**: Glassmorphism design, smooth animations, intuitive controls
- **Private by Design**: Images go directly to your Drive. No backend, no tracking.

## Permission Justifications

| Permission | Why It's Needed |
|-----------|-----------------|
| `activeTab` | Capture the currently visible tab as a screenshot |
| `tabs` | Identify the active tab for area capture overlay |
| `identity` | Authenticate with Google to access your Drive |
| `storage` | Save your preferences (folder path, format) and capture history |
| `clipboardWrite` | Copy the public Google Drive link to your clipboard |
| `notifications` | Alert you when upload completes (background captures via shortcut) |
| `offscreen` | Process full-screen captures and format conversion without UI |
| `desktopCapture` | Enable full-screen/monitor capture via `getDisplayMedia` |
| `https://www.googleapis.com/*` | Communicate with Google Drive API for uploads, folder listing, and permissions |

## Screenshots Checklist

1. **Onboarding View** — Logo, 3-step feature list, "Connect Google Drive" CTA (380×520)
2. **Main Capture View** — Mode tabs (Tab/Area/Screen), folder input with autocomplete, format dropdown, Capture button
3. **Area Selection** — Crosshair overlay on a webpage with drag rectangle and dimension tooltip
4. **Success State** — Result banner showing "Link copied!" with the Drive URL
5. **History Panel** — Last 10 captures with thumbnails, format badges, and re-copy buttons
6. **Settings Panel** — Default folder, format, mode, and disconnect Drive button

## Review Notes for Google

- This extension uses OAuth 2.0 with Google Drive API
- The `drive.file` scope restricts access to only files created by this extension
- `drive.metadata.readonly` is used solely for folder autocomplete (reading folder names)
- No user data is collected, stored externally, or shared with third parties
- Full privacy policy is publicly hosted
- Screenshots are processed locally; nothing leaves the browser except the chosen upload to Drive
