import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createRecorder,
  decodeBase64Audio,
  formatBytes,
  type DownloadPayload,
} from "./recorder";

function encodeBase64(bytes: number[]): string {
  return globalThis.btoa(String.fromCharCode(...bytes));
}

describe("formatBytes", () => {
  it("formats bytes, kilobytes, and megabytes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1.00 KB");
    expect(formatBytes(1536)).toBe("1.50 KB");
    expect(formatBytes(1024 * 1024)).toBe("1.00 MB");
  });
});

describe("decodeBase64Audio", () => {
  it("decodes base64 payloads into raw bytes", () => {
    const raw = [0x49, 0x44, 0x33, 0x03, 0x00];
    const decoded = decodeBase64Audio(encodeBase64(raw));
    expect(Array.from(decoded)).toEqual(raw);
  });
});

describe("createRecorder", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("ignores messages while idle and captures with 16x acceleration while recording", () => {
    const downloads: DownloadPayload[] = [];
    const recorder = createRecorder({
      now: () => 1700000000000,
      onDownload: (payload) => downloads.push(payload),
    });

    const msg = JSON.stringify({ audio: encodeBase64([1, 2, 3, 4]) });

    // Idle mode ignores audio and plays normally at 1.0x.
    expect(recorder.getState().mode).toBe("idle");
    expect(recorder.shouldAcceleratePlayback()).toBe(false);
    expect(recorder.ingestMessage(msg)).toBe(false);
    expect(recorder.getState().totalBytes).toBe(0);

    // Start recording.
    recorder.toggleRecording();
    expect(recorder.getState().mode).toBe("recording");
    expect(recorder.shouldAcceleratePlayback()).toBe(true);
    expect(recorder.ingestMessage(msg)).toBe(true);
    expect(recorder.getState().totalBytes).toBe(4);
    expect(recorder.getState().chunkCount).toBe(1);

    // Stop returns to idle (1.0x) while preserving captured audio in RAM.
    recorder.toggleRecording();
    expect(recorder.getState().mode).toBe("idle");
    expect(recorder.shouldAcceleratePlayback()).toBe(false);
    expect(recorder.ingestMessage(msg)).toBe(false);
    expect(recorder.getState().totalBytes).toBe(4);

    // Manual download emits mp3 blob and clears RAM immediately.
    expect(recorder.downloadAndClear(false)).toBe(true);
    expect(downloads).toHaveLength(1);
    expect(downloads[0]?.filename).toBe("ElevenReader_1700000000000.mp3");
    expect(downloads[0]?.blob.type).toBe("audio/mpeg");
    expect(downloads[0]?.blob.size).toBe(4);
    expect(recorder.getState().totalBytes).toBe(0);
    expect(recorder.downloadAndClear(false)).toBe(false);
  });

  it("auto-downloads after configured silence timeout and resets on new chunks", () => {
    const downloads: DownloadPayload[] = [];
    const recorder = createRecorder({
      defaultAutoDownloadSeconds: 15,
      now: () => 42,
      onDownload: (payload) => downloads.push(payload),
    });

    recorder.toggleRecording();
    recorder.ingestMessage(JSON.stringify({ audio: encodeBase64([10, 20]) }));

    vi.advanceTimersByTime(10_000);
    expect(downloads).toHaveLength(0);

    recorder.ingestMessage(JSON.stringify({ audio: encodeBase64([30, 40]) }));
    vi.advanceTimersByTime(10_000);
    expect(downloads).toHaveLength(0);

    vi.advanceTimersByTime(5_000);
    expect(downloads).toHaveLength(1);
    expect(downloads[0]?.auto).toBe(true);
    expect(downloads[0]?.filename).toBe("ElevenReader_AUTO_42.mp3");
    expect(downloads[0]?.blob.size).toBe(4);
    expect(recorder.getState().totalBytes).toBe(0);
  });

  it("auto-downloads immediately when hitting byteLimit without dropping subsequent chunks", () => {
    const downloads: DownloadPayload[] = [];
    const recorder = createRecorder({
      byteLimit: 6,
      now: () => 99,
      onDownload: (payload) => downloads.push(payload),
    });

    recorder.toggleRecording();
    recorder.ingestMessage(JSON.stringify({ audio: encodeBase64([1, 2, 3, 4]) }));
    expect(downloads).toHaveLength(0);

    recorder.ingestMessage(JSON.stringify({ audio: encodeBase64([5, 6]) }));
    expect(downloads).toHaveLength(1);
    expect(downloads[0]?.blob.size).toBe(6);
    expect(recorder.getState().totalBytes).toBe(0);

    recorder.ingestMessage(JSON.stringify({ audio: encodeBase64([7, 8]) }));
    expect(recorder.getState().totalBytes).toBe(2);
  });

  it("safely ignores invalid JSON, non-string messages, and malformed base64", () => {
    const recorder = createRecorder({ onDownload: () => {} });
    recorder.toggleRecording();

    expect(recorder.ingestMessage(new ArrayBuffer(8))).toBe(false);
    expect(recorder.ingestMessage("not-json")).toBe(false);
    expect(recorder.ingestMessage(JSON.stringify({ text: "hello" }))).toBe(false);
    expect(recorder.ingestMessage(JSON.stringify({ audio: "" }))).toBe(false);
    expect(recorder.ingestMessage(JSON.stringify({ audio: "%%%invalid%%%" }))).toBe(false);
    expect(recorder.getState().totalBytes).toBe(0);
  });

  it("cancels pending auto-download timer on stopRecording and clearRam", () => {
    const onDownload = vi.fn();
    const recorder = createRecorder({ defaultAutoDownloadSeconds: 10, onDownload });

    recorder.toggleRecording();
    recorder.ingestMessage(JSON.stringify({ audio: encodeBase64([1, 2]) }));
    recorder.stopRecording();

    vi.advanceTimersByTime(15_000);
    expect(onDownload).not.toHaveBeenCalled();

    recorder.toggleRecording();
    recorder.clearRam();
    vi.advanceTimersByTime(15_000);
    expect(onDownload).not.toHaveBeenCalled();
  });
});
