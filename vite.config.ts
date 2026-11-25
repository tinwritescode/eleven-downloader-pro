import { defineConfig } from "vitest/config";
import pkg from "./package.json" with { type: "json" };

const REPO_URL = "https://github.com/tinwritescode/eleven-downloader-pro";
const RELEASE_SCRIPT_URL = `${REPO_URL}/releases/latest/download/eleven-downloader-pro.user.js`;

function buildUserscriptHeader({
  name,
  namespace,
  version,
  description,
  author,
  homepageURL,
  supportURL,
  downloadURL,
  updateURL,
  match,
  runAt,
  earlyStart = false,
  injectInto,
  noframes = false,
  grant,
}: {
  name: string;
  namespace: string;
  version: string;
  description: string;
  author: string;
  homepageURL?: string;
  supportURL?: string;
  downloadURL?: string;
  updateURL?: string;
  match: string[];
  runAt: string;
  earlyStart?: boolean;
  injectInto?: string;
  noframes?: boolean;
  grant: string[];
}): string {
  const lines: Array<[string, string?]> = [
    ["name", name],
    ["namespace", namespace],
    ["version", version],
    ["description", description],
    ["author", author],
    ...(homepageURL ? ([["homepageURL", homepageURL]] as Array<[string, string]>) : []),
    ...(supportURL ? ([["supportURL", supportURL]] as Array<[string, string]>) : []),
    ...(downloadURL ? ([["downloadURL", downloadURL]] as Array<[string, string]>) : []),
    ...(updateURL ? ([["updateURL", updateURL]] as Array<[string, string]>) : []),
    ...match.map((pattern): [string, string] => ["match", pattern]),
    ["run-at", runAt],
    ...(earlyStart ? ([["early-start"]] as Array<[string]>) : []),
    ...(injectInto ? ([["inject-into", injectInto]] as Array<[string, string]>) : []),
    ...(noframes ? ([["noframes"]] as Array<[string]>) : []),
    ...grant.map((fn): [string, string] => ["grant", fn]),
  ];

  const body = lines.map(([key, value]) =>
    `// @${key.padEnd(12)}${value === undefined ? "" : ` ${value}`}`.trimEnd(),
  );
  return ["// ==UserScript==", ...body, "// ==/UserScript==", ""].join("\n");
}

export default defineConfig({
  build: {
    minify: false,
    lib: {
      entry: "src/userscript.ts",
      formats: ["iife"],
      name: "elevenDownloaderPro",
      fileName: () => "eleven-downloader-pro.user.js",
    },
    rolldownOptions: {
      output: {
        // Post-banner ensures the ==UserScript== metadata stays intact even if minification is enabled.
        postBanner: buildUserscriptHeader({
          name: "Eleven Downloader Pro",
          namespace: REPO_URL,
          version: pkg.version,
          description:
            "Captures and downloads WebSocket audio streams from ElevenReader and ElevenLabs (ScriptCat port).",
          author: "tinwritescode (based on jdcampolargo/ElevenDownloaderPro)",
          homepageURL: REPO_URL,
          supportURL: `${REPO_URL}/issues`,
          downloadURL: RELEASE_SCRIPT_URL,
          updateURL: RELEASE_SCRIPT_URL,
          match: ["https://*.elevenreader.io/*", "https://*.elevenlabs.io/*"],
          runAt: "document-start",
          earlyStart: true,
          injectInto: "page",
          noframes: true,
          grant: ["none"],
        }),
      },
    },
  },
  test: {
    environment: "happy-dom",
  },
});
