# Eleven Downloader Pro (ScriptCat)

A [ScriptCat](https://scriptcat.org) port of [ElevenDownloaderPro](https://github.com/jdcampolargo/ElevenDownloaderPro/blob/main/script.js) for capturing and saving WebSocket audio streams from ElevenReader and ElevenLabs.

## Features & ScriptCat adaptations

- **ScriptCat early injection**: Uses `@run-at document-start`, ScriptCat's `@early-start`, `@inject-into page`, `@noframes`, and `@grant none` so `WebSocket` and `AudioContext` are hooked in the page world before site bundles load.
- **Subdomain matching**: Matches `https://*.elevenreader.io/*` and `https://*.elevenlabs.io/*`.
- **Proxy-based `WebSocket` hook**: Preserves static constants (`WebSocket.OPEN`, `CLOSED`, etc.), `instanceof`, and exact constructor arguments.
- **macOS 27 Liquid Glass UI**: Floating Shadow DOM modal (dark & light adaptive frosted glass, collapsible into a floating pill, Trusted Types safe, non-destructive drag listeners).
- **Built-in Guide & EN / VI i18n**: Includes an in-modal step-by-step Guide (default English) and a persisted `EN | VI` segmented language switcher.
- **Race-free buffer flush & clean pause**: Clears captured chunks immediately when snapshotting a download `Blob`, and only applies 16× playback acceleration while actively recording.

## Install in ScriptCat

1. Install [ScriptCat](https://scriptcat.org). In Chrome, open ScriptCat's details in `chrome://extensions` and turn on **Allow User Scripts**.
2. Build the userscript:
   ```bash
   pnpm install
   pnpm build
   ```
3. Drag `dist/eleven-downloader-pro.user.js` into ScriptCat's dashboard (or import it there) and confirm.
4. Open [ElevenReader](https://elevenreader.io) or [ElevenLabs](https://elevenlabs.io), click **Record**, and press play.

## Development

Built with Vite (library IIFE bundle with ScriptCat `==UserScript==` post-banner) and Vitest.

```bash
pnpm check      # typecheck, test, and build
pnpm typecheck  # tsc --noEmit
pnpm test       # vitest run
pnpm build      # bundle dist/eleven-downloader-pro.user.js with Vite
```
