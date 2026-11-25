import { afterEach, describe, expect, it, vi } from "vitest";
import type { LocaleStorage } from "./i18n";
import { createRecorder } from "./recorder";
import { PANEL_HOST_ID, mountPanel } from "./ui";

function createMemoryStorage(): LocaleStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

describe("mountPanel", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders the 3-button macOS Liquid Glass panel and wires controls cleanly", () => {
    const onDownload = vi.fn();
    const recorder = createRecorder({ onDownload });
    const storage = createMemoryStorage();
    const mounted = mountPanel(recorder, { doc: document, storage });
    expect(mounted).not.toBeNull();
    if (!mounted) return;

    // Second mount is ignored while host exists.
    expect(mountPanel(recorder, { doc: document, storage })).toBeNull();
    expect(document.getElementById(PANEL_HOST_ID)).toBe(mounted.host);

    const { shadow } = mounted;
    const panel = shadow.querySelector(".panel") as HTMLElement | null;
    const sizeEl = shadow.getElementById("er-size");
    const stateEl = shadow.getElementById("er-state");
    const indicatorEl = shadow.getElementById("er-online-indicator");
    const recBtn = shadow.getElementById("er-rec-pause");
    const clearBtn = shadow.getElementById("er-clear") as HTMLButtonElement | null;
    const downloadBtn = shadow.getElementById("er-download") as HTMLButtonElement | null;
    const slider = shadow.getElementById("er-slider") as HTMLInputElement | null;
    const sliderValue = shadow.getElementById("er-slider-value");

    // Idle with empty buffer.
    expect(panel?.dataset["mode"]).toBe("idle");
    expect(sizeEl?.textContent).toBe("0 B");
    expect(stateEl?.textContent).toBe("Normal playback · 1.0×");
    expect(indicatorEl?.textContent).toBe("Ready");
    expect(recBtn?.textContent).toBe("Record");
    expect(downloadBtn?.disabled).toBe(true);
    expect(clearBtn?.disabled).toBe(true);

    // Start recording.
    recBtn?.click();
    expect(panel?.dataset["mode"]).toBe("recording");
    expect(stateEl?.textContent).toBe("Capturing audio at 16× speed");
    expect(indicatorEl?.textContent).toBe("16× Rec");
    expect(recBtn?.textContent).toBe("Stop");

    recorder.ingestMessage(JSON.stringify({ audio: globalThis.btoa("hello world") }));
    expect(sizeEl?.textContent).toBe("11 B");
    expect(downloadBtn?.disabled).toBe(false);
    expect(clearBtn?.disabled).toBe(false);

    // Stop keeps audio in RAM and offers Resume.
    recBtn?.click();
    expect(panel?.dataset["mode"]).toBe("buffered");
    expect(stateEl?.textContent).toBe("Stopped · Audio held in RAM");
    expect(indicatorEl?.textContent).toBe("Stopped");
    expect(recBtn?.textContent).toBe("Resume");

    // Download saves and resets back to Ready.
    downloadBtn?.click();
    expect(onDownload).toHaveBeenCalledTimes(1);
    expect(sizeEl?.textContent).toBe("0 B");
    expect(panel?.dataset["mode"]).toBe("idle");
    expect(recBtn?.textContent).toBe("Record");
    expect(downloadBtn?.disabled).toBe(true);
    expect(clearBtn?.disabled).toBe(true);

    // Slider updates value badge and recorder setting.
    if (slider) {
      slider.value = "120";
      slider.dispatchEvent(new Event("input"));
    }
    expect(sliderValue?.textContent).toBe("120s");
    expect(recorder.getState().autoDownloadSeconds).toBe(120);

    // Clear button resets buffer.
    recBtn?.click();
    recorder.ingestMessage(JSON.stringify({ audio: globalThis.btoa("abc") }));
    expect(sizeEl?.textContent).toBe("3 B");
    clearBtn?.click();
    expect(sizeEl?.textContent).toBe("0 B");

    // Collapse button switches to floating pill and hides body.
    const collapseBtn = shadow.querySelector(".collapse-btn") as HTMLButtonElement | null;
    const body = shadow.querySelector(".body") as HTMLElement | null;
    expect(body?.hidden).toBe(false);
    expect(panel?.classList.contains("is-collapsed")).toBe(false);
    collapseBtn?.click();
    expect(body?.hidden).toBe(true);
    expect(panel?.classList.contains("is-collapsed")).toBe(true);
    expect(collapseBtn?.getAttribute("aria-expanded")).toBe("false");
    collapseBtn?.click();
    expect(body?.hidden).toBe(false);
    expect(panel?.classList.contains("is-collapsed")).toBe(false);

    mounted.destroy();
    expect(document.getElementById(PANEL_HOST_ID)).toBeNull();
  });

  it("toggles the in-modal Guide (default English) and switches between EN and VI with persistence", () => {
    const recorder = createRecorder({ onDownload: () => {} });
    const storage = createMemoryStorage();
    const mounted = mountPanel(recorder, { doc: document, storage });
    expect(mounted).not.toBeNull();
    if (!mounted) return;

    const { shadow } = mounted;
    const content = shadow.querySelector(".content") as HTMLElement | null;
    const guideView = shadow.getElementById("er-guide-view");
    const guideToggle = shadow.getElementById("er-guide-toggle");
    const langEn = shadow.getElementById("er-lang-en");
    const langVi = shadow.getElementById("er-lang-vi");
    const guideHeading = shadow.querySelector(".guide-heading");
    const recBtn = shadow.getElementById("er-rec-pause");

    expect(langEn?.getAttribute("aria-pressed")).toBe("true");
    expect(langVi?.getAttribute("aria-pressed")).toBe("false");
    expect(guideView?.hidden).toBe(true);
    expect(guideToggle?.textContent).toBe("Guide");

    guideToggle?.click();
    expect(content?.hidden).toBe(true);
    expect(guideView?.hidden).toBe(false);
    expect(guideHeading?.textContent).toBe("How to use");
    expect(guideToggle?.textContent).toBe("Back");
    expect(shadow.querySelectorAll(".guide-step")).toHaveLength(4);

    langVi?.click();
    expect(langVi?.getAttribute("aria-pressed")).toBe("true");
    expect(guideHeading?.textContent).toBe("Hướng dẫn sử dụng");
    expect(guideToggle?.textContent).toBe("Quay lại");
    expect(recBtn?.textContent).toBe("Ghi âm");

    guideToggle?.click();
    expect(content?.hidden).toBe(false);
    expect(guideView?.hidden).toBe(true);
    expect(guideToggle?.textContent).toBe("Hướng dẫn");

    mounted.destroy();
    const remounted = mountPanel(recorder, { doc: document, storage });
    expect(remounted?.shadow.getElementById("er-rec-pause")?.textContent).toBe("Ghi âm");
    remounted?.destroy();
  });
});
