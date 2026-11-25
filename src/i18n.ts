export type Locale = "en" | "vi";

export interface GuideStep {
  readonly title: string;
  readonly body: string;
}

export interface Messages {
  readonly title: string;
  readonly statusBadge: {
    readonly ready: string;
    readonly recording: string;
    readonly buffered: string;
  };
  readonly statusSummary: {
    readonly ready: string;
    readonly recording: string;
    readonly buffered: string;
  };
  readonly buttons: {
    readonly record: string;
    readonly resume: string;
    readonly stop: string;
    readonly download: string;
    readonly clearRam: string;
    readonly guide: string;
    readonly back: string;
  };
  readonly sliderLabel: string;
  readonly aria: {
    readonly collapse: string;
    readonly expand: string;
    readonly languageGroup: string;
  };
  readonly guide: {
    readonly heading: string;
    readonly steps: readonly GuideStep[];
    readonly tip: string;
  };
}

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_STORAGE_KEY = "eleven-downloader-pro:locale";

export const MESSAGES: Record<Locale, Messages> = {
  en: {
    title: "Eleven Downloader",
    statusBadge: {
      ready: "Ready",
      recording: "16× Rec",
      buffered: "Stopped",
    },
    statusSummary: {
      ready: "Normal playback · 1.0×",
      recording: "Capturing audio at 16× speed",
      buffered: "Stopped · Audio held in RAM",
    },
    buttons: {
      record: "Record",
      resume: "Resume",
      stop: "Stop",
      download: "Download MP3",
      clearRam: "Clear RAM",
      guide: "Guide",
      back: "Back",
    },
    sliderLabel: "Auto-save after silence",
    aria: {
      collapse: "Collapse panel",
      expand: "Expand panel",
      languageGroup: "Language",
    },
    guide: {
      heading: "How to use",
      steps: [
        {
          title: "Click Record",
          body: "Starts capturing audio and boosts playback to 16× so the stream finishes faster.",
        },
        {
          title: "Press Play on the page",
          body: "Start playback in ElevenReader or ElevenLabs. Captured audio collects in RAM.",
        },
        {
          title: "Save as MP3",
          body: "Click Download MP3 anytime, or let the silence timer auto-save when playback ends.",
        },
        {
          title: "Stop anytime",
          body: "Click Stop to return to normal 1.0× listening (audio stays in RAM). Use Clear RAM to start fresh.",
        },
      ],
      tip: "Tip: Reload the page once after installing in ScriptCat so audio hooks attach before the player loads.",
    },
  },
  vi: {
    title: "Eleven Downloader",
    statusBadge: {
      ready: "Sẵn sàng",
      recording: "16× Ghi",
      buffered: "Đã dừng",
    },
    statusSummary: {
      ready: "Nghe bình thường · 1.0×",
      recording: "Đang thu âm ở tốc độ 16×",
      buffered: "Đã dừng · Đang giữ âm thanh trong RAM",
    },
    buttons: {
      record: "Ghi âm",
      resume: "Ghi tiếp",
      stop: "Dừng",
      download: "Tải MP3",
      clearRam: "Xoá RAM",
      guide: "Hướng dẫn",
      back: "Quay lại",
    },
    sliderLabel: "Tự lưu sau khi im lặng",
    aria: {
      collapse: "Thu gọn bảng",
      expand: "Mở rộng bảng",
      languageGroup: "Ngôn ngữ",
    },
    guide: {
      heading: "Hướng dẫn sử dụng",
      steps: [
        {
          title: "Nhấn Ghi âm",
          body: "Bắt đầu thu âm thanh và tăng tốc phát lên 16× để tải luồng âm thanh nhanh hơn.",
        },
        {
          title: "Nhấn Phát trên trang",
          body: "Bắt đầu phát trên ElevenReader hoặc ElevenLabs. Âm thanh thu được sẽ lưu tạm trong RAM.",
        },
        {
          title: "Lưu file MP3",
          body: "Nhấn Tải MP3 bất cứ lúc nào, hoặc đợi bộ đếm im lặng tự động lưu khi phát xong.",
        },
        {
          title: "Dừng bất cứ lúc nào",
          body: "Nhấn Dừng để ngừng thu và nghe lại bình thường 1.0× (dữ liệu vẫn giữ trong RAM). Nhấn Xoá RAM để thu bài mới.",
        },
      ],
      tip: "Mẹo: Tải lại trang một lần sau khi cài trong ScriptCat để hook âm thanh chạy trước trình phát.",
    },
  },
};

export interface LocaleStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "vi";
}

export function loadLocale(storage?: LocaleStorage | null): Locale {
  try {
    const raw = storage?.getItem(LOCALE_STORAGE_KEY);
    return isLocale(raw) ? raw : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function saveLocale(locale: Locale, storage?: LocaleStorage | null): void {
  try {
    storage?.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Ignore storage quota or privacy-mode errors.
  }
}
