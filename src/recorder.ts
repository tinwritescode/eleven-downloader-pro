export type RecorderMode = "idle" | "recording";

export interface RecorderState {
  readonly mode: RecorderMode;
  readonly totalBytes: number;
  readonly chunkCount: number;
  readonly autoDownloadSeconds: number;
}

export interface DownloadPayload {
  readonly blob: Blob;
  readonly filename: string;
  readonly auto: boolean;
}

export interface RecorderOptions {
  readonly byteLimit?: number;
  readonly defaultAutoDownloadSeconds?: number;
  readonly now?: () => number;
  readonly onDownload?: (payload: DownloadPayload) => void;
}

export interface Recorder {
  getState(): RecorderState;
  subscribe(listener: (state: RecorderState) => void): () => void;
  toggleRecording(): void;
  stopRecording(): void;
  setAutoDownloadSeconds(seconds: number): void;
  shouldAcceleratePlayback(): boolean;
  ingestMessage(rawData: unknown): boolean;
  clearRam(): void;
  downloadAndClear(auto: boolean): boolean;
}

export const GB_LIMIT = 1024 * 1024 * 1024;
export const MIN_AUTO_DOWNLOAD_SECONDS = 10;
export const MAX_AUTO_DOWNLOAD_SECONDS = 300;
export const DEFAULT_AUTO_DOWNLOAD_SECONDS = 60;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function decodeBase64Audio(base64: string): Uint8Array<ArrayBuffer> {
  const binary = globalThis.atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function triggerBrowserDownload(payload: DownloadPayload): void {
  const url = URL.createObjectURL(payload.blob);
  const anchor = document.createElement("a");
  anchor.style.display = "none";
  anchor.href = url;
  anchor.download = payload.filename;
  (document.body ?? document.documentElement).appendChild(anchor);
  anchor.click();
  anchor.remove();

  globalThis.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

function clampAutoDownloadSeconds(seconds: number): number {
  if (!Number.isFinite(seconds)) return DEFAULT_AUTO_DOWNLOAD_SECONDS;
  return Math.min(
    MAX_AUTO_DOWNLOAD_SECONDS,
    Math.max(MIN_AUTO_DOWNLOAD_SECONDS, Math.round(seconds)),
  );
}

export function createRecorder(options: RecorderOptions = {}): Recorder {
  const byteLimit = options.byteLimit ?? GB_LIMIT;
  const now = options.now ?? (() => Date.now());
  const onDownload = options.onDownload ?? triggerBrowserDownload;

  let mode: RecorderMode = "idle";
  let audioChunks: Uint8Array<ArrayBuffer>[] = [];
  let totalBytes = 0;
  let autoDownloadSeconds = clampAutoDownloadSeconds(
    options.defaultAutoDownloadSeconds ?? DEFAULT_AUTO_DOWNLOAD_SECONDS,
  );
  let autoDownloadTimer: ReturnType<typeof setTimeout> | null = null;
  const listeners = new Set<(state: RecorderState) => void>();

  function getState(): RecorderState {
    return {
      mode,
      totalBytes,
      chunkCount: audioChunks.length,
      autoDownloadSeconds,
    };
  }

  function notify(): void {
    const snapshot = getState();
    for (const listener of listeners) {
      listener(snapshot);
    }
  }

  function cancelAutoDownloadTimer(): void {
    if (autoDownloadTimer !== null) {
      clearTimeout(autoDownloadTimer);
      autoDownloadTimer = null;
    }
  }

  function resetAutoDownloadTimer(): void {
    cancelAutoDownloadTimer();
    if (mode === "recording" && audioChunks.length > 0) {
      autoDownloadTimer = setTimeout(() => {
        autoDownloadTimer = null;
        downloadAndClear(true);
      }, autoDownloadSeconds * 1000);
    }
  }

  function clearRam(): void {
    cancelAutoDownloadTimer();
    audioChunks = [];
    totalBytes = 0;
    notify();
  }

  function downloadAndClear(auto: boolean): boolean {
    if (audioChunks.length === 0) return false;

    cancelAutoDownloadTimer();
    const snapshotChunks = audioChunks;
    audioChunks = [];
    totalBytes = 0;
    notify();

    const blob = new Blob(snapshotChunks, { type: "audio/mpeg" });
    const filename = `ElevenReader_${auto ? "AUTO_" : ""}${now()}.mp3`;
    onDownload({ blob, filename, auto });
    return true;
  }

  function stopRecording(): void {
    if (mode === "idle") return;
    mode = "idle";
    cancelAutoDownloadTimer();
    notify();
  }

  function toggleRecording(): void {
    if (mode === "idle") {
      mode = "recording";
      resetAutoDownloadTimer();
    } else {
      mode = "idle";
      cancelAutoDownloadTimer();
    }
    notify();
  }

  function setAutoDownloadSeconds(seconds: number): void {
    autoDownloadSeconds = clampAutoDownloadSeconds(seconds);
    resetAutoDownloadTimer();
    notify();
  }

  function shouldAcceleratePlayback(): boolean {
    return mode === "recording";
  }

  function ingestMessage(rawData: unknown): boolean {
    if (mode !== "recording" || typeof rawData !== "string") return false;

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawData);
    } catch {
      return false;
    }

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("audio" in parsed) ||
      typeof parsed.audio !== "string" ||
      parsed.audio.length === 0
    ) {
      return false;
    }

    let bytes: Uint8Array<ArrayBuffer>;
    try {
      bytes = decodeBase64Audio(parsed.audio);
    } catch {
      return false;
    }

    if (bytes.length === 0) return false;

    audioChunks.push(bytes);
    totalBytes += bytes.length;
    notify();

    if (totalBytes >= byteLimit) {
      downloadAndClear(true);
    } else {
      resetAutoDownloadTimer();
    }
    return true;
  }

  function subscribe(listener: (state: RecorderState) => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  return {
    getState,
    subscribe,
    toggleRecording,
    stopRecording,
    setAutoDownloadSeconds,
    shouldAcceleratePlayback,
    ingestMessage,
    clearRam,
    downloadAndClear,
  };
}
