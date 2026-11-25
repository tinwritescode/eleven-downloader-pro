import {
  MESSAGES,
  loadLocale,
  saveLocale,
  type Locale,
  type LocaleStorage,
} from "./i18n";
import panelStyles from "./panel.css?inline";
import {
  MAX_AUTO_DOWNLOAD_SECONDS,
  MIN_AUTO_DOWNLOAD_SECONDS,
  formatBytes,
  type Recorder,
  type RecorderState,
} from "./recorder";

export const PANEL_HOST_ID = "er-downloader-panel";

const SVG_NS = "http://www.w3.org/2000/svg";

function createElement<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const el = doc.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function createSvgIcon(doc: Document, paths: ReadonlyArray<string>, filled = false): SVGSVGElement {
  const svg = doc.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("fill", filled ? "currentColor" : "none");
  if (!filled) {
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.75");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
  }
  for (const d of paths) {
    const path = doc.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
  }
  return svg;
}

function createRecordDotIcon(doc: Document): SVGSVGElement {
  const svg = doc.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("aria-hidden", "true");
  const circle = doc.createElementNS(SVG_NS, "circle");
  circle.setAttribute("cx", "8");
  circle.setAttribute("cy", "8");
  circle.setAttribute("r", "4.5");
  circle.setAttribute("fill", "currentColor");
  svg.appendChild(circle);
  return svg;
}

function createStopSquareIcon(doc: Document): SVGSVGElement {
  const svg = doc.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("aria-hidden", "true");
  const rect = doc.createElementNS(SVG_NS, "rect");
  rect.setAttribute("x", "4");
  rect.setAttribute("y", "4");
  rect.setAttribute("width", "8");
  rect.setAttribute("height", "8");
  rect.setAttribute("rx", "2");
  rect.setAttribute("fill", "currentColor");
  svg.appendChild(rect);
  return svg;
}

const ICONS = {
  chevronUp: (doc: Document) => createSvgIcon(doc, ["M4 10l4-4 4 4"]),
  record: (doc: Document) => createRecordDotIcon(doc),
  stop: (doc: Document) => createStopSquareIcon(doc),
  play: (doc: Document) => createSvgIcon(doc, ["M5 3.2L12.5 8 5 12.8z"], true),
  download: (doc: Document) =>
    createSvgIcon(doc, ["M8 2.5v7.5", "M5 7.2L8 10.2l3-3", "M3 12.8h10"]),
  trash: (doc: Document) =>
    createSvgIcon(doc, ["M3.5 4.5h9", "M6 4.5V3h4v1.5", "M5 4.5l.5 8.5h5l.5-8.5"]),
  help: (doc: Document) =>
    createSvgIcon(doc, [
      "M8 14a6 6 0 1 0 0-12 6 6 0 0 0 0 12z",
      "M6.3 6.3a1.8 1.8 0 0 1 3.4.6c0 1.2-1.7 1.5-1.7 2.4",
      "M8 11.4h.01",
    ]),
  arrowLeft: (doc: Document) => createSvgIcon(doc, ["M10 3.5L5.5 8 10 12.5"]),
};

function setButtonContent(
  doc: Document,
  button: HTMLButtonElement,
  icon: SVGSVGElement,
  label: string,
): void {
  button.replaceChildren(icon, createElement(doc, "span", undefined, label));
}

function sliderPercent(seconds: number): string {
  const span = MAX_AUTO_DOWNLOAD_SECONDS - MIN_AUTO_DOWNLOAD_SECONDS;
  const pct = ((seconds - MIN_AUTO_DOWNLOAD_SECONDS) / span) * 100;
  return `${Math.min(100, Math.max(0, pct)).toFixed(1)}%`;
}

export interface MountPanelOptions {
  readonly doc?: Document;
  readonly storage?: LocaleStorage | null;
  readonly initialLocale?: Locale;
}

export interface MountedPanel {
  readonly host: HTMLElement;
  readonly shadow: ShadowRoot;
  destroy(): void;
}

export function mountPanel(
  recorder: Recorder,
  options: MountPanelOptions = {},
): MountedPanel | null {
  const doc = options.doc ?? document;
  const existing = doc.getElementById(PANEL_HOST_ID);
  if (existing) return null;

  const mountTarget = doc.body ?? doc.documentElement;
  if (!mountTarget) return null;

  const storage =
    options.storage !== undefined ? options.storage : (doc.defaultView?.localStorage ?? null);
  let locale: Locale = options.initialLocale ?? loadLocale(storage);
  let collapsed = false;
  let showGuide = false;

  const host = doc.createElement("div");
  host.id = PANEL_HOST_ID;
  const shadow = host.attachShadow({ mode: "open" });

  const style = doc.createElement("style");
  style.textContent = panelStyles;
  shadow.appendChild(style);

  const panel = createElement(doc, "div", "panel");
  panel.dataset["mode"] = "idle";

  // Header
  const header = createElement(doc, "div", "header");
  const titleGroup = createElement(doc, "div", "title-group");
  const statusDot = createElement(doc, "span", "status-dot");
  const title = createElement(doc, "span", "title");
  const collapsedSize = createElement(doc, "span", "collapsed-size", "0 B");
  titleGroup.append(statusDot, title, collapsedSize);

  const headerRight = createElement(doc, "div", "header-right");
  const indicator = createElement(doc, "span", "indicator");
  indicator.id = "er-online-indicator";

  const collapseBtn = createElement(doc, "button", "collapse-btn");
  collapseBtn.type = "button";
  collapseBtn.setAttribute("aria-expanded", "true");
  collapseBtn.appendChild(ICONS.chevronUp(doc));

  headerRight.append(indicator, collapseBtn);
  header.append(titleGroup, headerRight);

  // Body (controls view + guide view + footer)
  const body = createElement(doc, "div", "body");

  // Main controls view
  const content = createElement(doc, "div", "content");

  const statusBox = createElement(doc, "div", "status-box");
  const statusTop = createElement(doc, "div", "status-top");
  const sizeDisplay = createElement(doc, "div", "size");
  sizeDisplay.id = "er-size";
  const speedPill = createElement(doc, "span", "speed-pill", "1.0×");
  statusTop.append(sizeDisplay, speedPill);

  const stateDisplay = createElement(doc, "div", "state");
  stateDisplay.id = "er-state";
  statusBox.append(statusTop, stateDisplay);

  const actions = createElement(doc, "div", "actions");

  const btnRecToggle = createElement(doc, "button", "btn btn-hero er-btn-primary");
  btnRecToggle.id = "er-rec-pause";
  btnRecToggle.type = "button";

  const secondaryRow = createElement(doc, "div", "btn-row");

  const btnDownload = createElement(doc, "button", "btn er-btn-action");
  btnDownload.id = "er-download";
  btnDownload.type = "button";

  const btnClear = createElement(doc, "button", "btn er-btn-secondary");
  btnClear.id = "er-clear";
  btnClear.type = "button";

  btnRecToggle.addEventListener("click", () => recorder.toggleRecording());
  btnDownload.addEventListener("click", () => recorder.downloadAndClear(false));
  btnClear.addEventListener("click", () => recorder.clearRam());

  secondaryRow.append(btnDownload, btnClear);
  actions.append(btnRecToggle, secondaryRow);

  const sliderContainer = createElement(doc, "div", "slider-container");
  const sliderHeader = createElement(doc, "div", "slider-header");
  const sliderLabel = createElement(doc, "label", "slider-label");
  sliderLabel.id = "er-slider-label";
  sliderLabel.htmlFor = "er-slider";

  const sliderValue = createElement(doc, "span", "slider-value", "60s");
  sliderValue.id = "er-slider-value";
  sliderHeader.append(sliderLabel, sliderValue);

  const slider = createElement(doc, "input", "er-slider");
  slider.id = "er-slider";
  slider.type = "range";
  slider.min = String(MIN_AUTO_DOWNLOAD_SECONDS);
  slider.max = String(MAX_AUTO_DOWNLOAD_SECONDS);
  slider.addEventListener("input", () => {
    recorder.setAutoDownloadSeconds(Number.parseInt(slider.value, 10));
  });

  sliderContainer.append(sliderHeader, slider);
  content.append(statusBox, actions, sliderContainer);

  // Guide view
  const guideView = createElement(doc, "div", "guide-view");
  guideView.id = "er-guide-view";
  guideView.hidden = true;

  const guideHeading = createElement(doc, "h2", "guide-heading");
  const guideStepsList = createElement(doc, "ol", "guide-steps");
  const guideTip = createElement(doc, "p", "guide-tip");
  guideView.append(guideHeading, guideStepsList, guideTip);

  // Footer (Guide toggle + EN/VI segmented switch)
  const footer = createElement(doc, "div", "footer");

  const guideBtn = createElement(doc, "button", "footer-btn");
  guideBtn.id = "er-guide-toggle";
  guideBtn.type = "button";

  const langGroup = createElement(doc, "div", "lang-segmented");
  langGroup.setAttribute("role", "group");

  const btnLangEn = createElement(doc, "button", "lang-btn", "EN");
  btnLangEn.id = "er-lang-en";
  btnLangEn.type = "button";

  const btnLangVi = createElement(doc, "button", "lang-btn", "VI");
  btnLangVi.id = "er-lang-vi";
  btnLangVi.type = "button";

  langGroup.append(btnLangEn, btnLangVi);
  footer.append(guideBtn, langGroup);

  body.append(content, guideView, footer);
  panel.append(header, body);
  shadow.appendChild(panel);
  mountTarget.appendChild(host);

  function renderGuide(): void {
    const t = MESSAGES[locale];
    guideHeading.textContent = t.guide.heading;
    const stepNodes = t.guide.steps.map((step, index) => {
      const li = createElement(doc, "li", "guide-step");
      const num = createElement(doc, "span", "guide-num", String(index + 1));
      const textWrap = createElement(doc, "div", "guide-step-text");
      const stepTitle = createElement(doc, "span", "guide-step-title", step.title);
      const stepBody = createElement(doc, "span", "guide-step-body", step.body);
      textWrap.append(stepTitle, stepBody);
      li.append(num, textWrap);
      return li;
    });
    guideStepsList.replaceChildren(...stepNodes);
    guideTip.textContent = t.guide.tip;
  }

  function render(state: RecorderState): void {
    const t = MESSAGES[locale];
    const formatted = formatBytes(state.totalBytes);
    const hasBuffer = state.totalBytes > 0;
    const visualState =
      state.mode === "recording" ? "recording" : hasBuffer ? "buffered" : "idle";

    panel.dataset["mode"] = visualState;
    panel.classList.toggle("is-collapsed", collapsed);
    body.hidden = collapsed;
    content.hidden = showGuide;
    guideView.hidden = !showGuide;

    title.textContent = t.title;
    sizeDisplay.textContent = formatted;
    collapsedSize.textContent = formatted;

    const collapseLabel = collapsed ? t.aria.expand : t.aria.collapse;
    collapseBtn.title = collapseLabel;
    collapseBtn.setAttribute("aria-label", collapseLabel);
    collapseBtn.setAttribute("aria-expanded", String(!collapsed));

    langGroup.setAttribute("aria-label", t.aria.languageGroup);
    btnLangEn.setAttribute("aria-pressed", String(locale === "en"));
    btnLangVi.setAttribute("aria-pressed", String(locale === "vi"));

    guideBtn.setAttribute("aria-pressed", String(showGuide));
    setButtonContent(
      doc,
      guideBtn,
      showGuide ? ICONS.arrowLeft(doc) : ICONS.help(doc),
      showGuide ? t.buttons.back : t.buttons.guide,
    );

    setButtonContent(doc, btnDownload, ICONS.download(doc), t.buttons.download);
    setButtonContent(doc, btnClear, ICONS.trash(doc), t.buttons.clearRam);

    btnDownload.disabled = !hasBuffer;
    btnClear.disabled = !hasBuffer;

    sliderLabel.textContent = t.sliderLabel;
    slider.value = String(state.autoDownloadSeconds);
    slider.style.setProperty("--slider-pct", sliderPercent(state.autoDownloadSeconds));
    sliderValue.textContent = `${state.autoDownloadSeconds}s`;

    if (state.mode === "recording") {
      speedPill.textContent = "16×";
      stateDisplay.textContent = t.statusSummary.recording;
      btnRecToggle.className = "btn btn-hero er-btn-paused";
      setButtonContent(doc, btnRecToggle, ICONS.stop(doc), t.buttons.stop);
      indicator.textContent = t.statusBadge.recording;
    } else if (hasBuffer) {
      speedPill.textContent = "1.0×";
      stateDisplay.textContent = t.statusSummary.buffered;
      btnRecToggle.className = "btn btn-hero er-btn-resume";
      setButtonContent(doc, btnRecToggle, ICONS.play(doc), t.buttons.resume);
      indicator.textContent = t.statusBadge.buffered;
    } else {
      speedPill.textContent = "1.0×";
      stateDisplay.textContent = t.statusSummary.ready;
      btnRecToggle.className = "btn btn-hero er-btn-primary";
      setButtonContent(doc, btnRecToggle, ICONS.record(doc), t.buttons.record);
      indicator.textContent = t.statusBadge.ready;
    }

    renderGuide();
  }

  function setLocale(next: Locale): void {
    if (locale === next) return;
    locale = next;
    saveLocale(next, storage);
    render(recorder.getState());
  }

  collapseBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    collapsed = !collapsed;
    render(recorder.getState());
  });

  guideBtn.addEventListener("click", () => {
    showGuide = !showGuide;
    render(recorder.getState());
  });

  btnLangEn.addEventListener("click", () => setLocale("en"));
  btnLangVi.addEventListener("click", () => setLocale("vi"));

  render(recorder.getState());
  const unsubscribe = recorder.subscribe(render);

  // Dragging via addEventListener so we never clobber the host page's handlers.
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  const onMouseDown = (event: MouseEvent): void => {
    if (event.button !== 0 || collapseBtn.contains(event.target as Node | null)) return;
    isDragging = true;
    const rect = host.getBoundingClientRect();
    offsetX = event.clientX - rect.left;
    offsetY = event.clientY - rect.top;
  };

  const onMouseMove = (event: MouseEvent): void => {
    if (!isDragging) return;
    const win = doc.defaultView;
    const maxLeft = win ? Math.max(0, win.innerWidth - 60) : event.clientX;
    const maxTop = win ? Math.max(0, win.innerHeight - 40) : event.clientY;
    const nextLeft = Math.min(maxLeft, Math.max(0, event.clientX - offsetX));
    const nextTop = Math.min(maxTop, Math.max(0, event.clientY - offsetY));
    host.style.left = `${nextLeft}px`;
    host.style.top = `${nextTop}px`;
    host.style.right = "auto";
  };

  const onMouseUp = (): void => {
    isDragging = false;
  };

  header.addEventListener("mousedown", onMouseDown);
  const win = doc.defaultView;
  win?.addEventListener("mousemove", onMouseMove);
  win?.addEventListener("mouseup", onMouseUp);

  return {
    host,
    shadow,
    destroy() {
      unsubscribe();
      header.removeEventListener("mousedown", onMouseDown);
      win?.removeEventListener("mousemove", onMouseMove);
      win?.removeEventListener("mouseup", onMouseUp);
      host.remove();
    },
  };
}
