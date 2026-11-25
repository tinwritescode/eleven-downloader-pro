# Eleven Downloader Pro (ScriptCat)

A [ScriptCat](https://scriptcat.org) userscript for capturing and saving WebSocket audio streams from **ElevenReader** and **ElevenLabs** as MP3 files — featuring a macOS 27 Liquid Glass floating modal, built-in Guide, and English / Vietnamese i18n.

[![Install in ScriptCat](https://img.shields.io/badge/Install%20in-ScriptCat-007AFF?style=for-the-badge&logo=googlechrome&logoColor=white)](https://github.com/tinwritescode/eleven-downloader-pro/releases/latest/download/eleven-downloader-pro.user.js)
[![Latest Release](https://img.shields.io/github/v/release/tinwritescode/eleven-downloader-pro?style=for-the-badge&color=34C759)](https://github.com/tinwritescode/eleven-downloader-pro/releases/latest)

---

## One-Click Install (ScriptCat)

1. Install the **[ScriptCat](https://scriptcat.org)** browser extension.
   - **Chrome / Edge / Brave:** Open ScriptCat's extension details in `chrome://extensions` and turn on **Allow User Scripts**.
2. Click the **[Install in ScriptCat](https://github.com/tinwritescode/eleven-downloader-pro/releases/latest/download/eleven-downloader-pro.user.js)** button above.
   - ScriptCat intercepts `.user.js` links and opens its install confirmation screen automatically (and supports auto-updates via `@updateURL` / `@downloadURL`).
   - *Fallback if your browser downloads the file instead:* open ScriptCat's dashboard and either **drag & drop** `eleven-downloader-pro.user.js` onto it, or choose **Import from URL** and paste:
     ```text
     https://github.com/tinwritescode/eleven-downloader-pro/releases/latest/download/eleven-downloader-pro.user.js
     ```
3. Open [ElevenReader](https://elevenreader.io) or [ElevenLabs](https://elevenlabs.io) and reload once so the hooks attach before the player loads.

## How to Use

1. **Click Record** — Starts capturing incoming WebSocket audio chunks and boosts playback to **16×** so long reads finish in seconds.
2. **Press Play on the page** — Captured audio accumulates in RAM (live size readout in the floating modal).
3. **Save as MP3** — Click **Download MP3** anytime, or let the configurable **Auto-save after silence** slider (10s–300s, default 60s) download automatically when playback stops.
4. **Stop anytime** — Click **Stop** to return to normal **1.0×** listening (buffered audio stays in RAM so you can **Resume** or **Download MP3**). Click **Clear RAM** to discard the buffer and start fresh.

Click **Guide** (`Hướng dẫn`) in the modal footer anytime for in-app instructions, or toggle **EN | VI** to switch languages (persisted in `localStorage`).

## Features & ScriptCat Adaptations

- **Early page-world injection**: Uses `@run-at document-start`, ScriptCat's `@early-start`, `@inject-into page`, `@noframes`, and `@grant none` so `WebSocket` and `AudioContext` are hooked before site bundles load.
- **Subdomain coverage**: Matches `https://*.elevenreader.io/*` and `https://*.elevenlabs.io/*`.
- **Proxy-based `WebSocket` hook**: Preserves static constants (`WebSocket.OPEN`, `CLOSED`, etc.), `instanceof`, and exact constructor arguments.
- **macOS 27 Liquid Glass UI**: Draggable Shadow DOM modal (adaptive dark & light frosted glass, collapsible into a compact floating pill, Trusted Types safe, non-destructive drag listeners).
- **Built-in Guide & EN / VI i18n**: Defaults to English with a persisted `EN | VI` segmented switch.
- **Race-free buffer flush & auto-updates**: Snapshots and clears chunks immediately on download (auto-flushing at 1 GiB) and stays up to date through GitHub Releases.

## Development

Built with **Vite 8** (library IIFE bundle with ScriptCat `==UserScript==` post-banner) and **Vitest**.

```bash
pnpm install
pnpm check      # typecheck, test, and build
pnpm typecheck  # tsc --noEmit
pnpm test       # vitest run
pnpm build      # outputs dist/eleven-downloader-pro.user.js
```

## Credits & Disclaimer

Ported and redesigned for ScriptCat from [jdcampolargo/ElevenDownloaderPro](https://github.com/jdcampolargo/ElevenDownloaderPro). Provided for personal/educational use; please respect ElevenLabs' Terms of Service.
