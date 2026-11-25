import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  MESSAGES,
  loadLocale,
  saveLocale,
  type LocaleStorage,
} from "./i18n";

function createMemoryStorage(): LocaleStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

describe("i18n", () => {
  it("defaults to English and persists valid locale selections", () => {
    const storage = createMemoryStorage();
    expect(loadLocale(storage)).toBe(DEFAULT_LOCALE);

    saveLocale("vi", storage);
    expect(loadLocale(storage)).toBe("vi");

    storage.setItem(LOCALE_STORAGE_KEY, "fr");
    expect(loadLocale(storage)).toBe("en");
  });

  it("handles failing storage gracefully", () => {
    const broken: LocaleStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(loadLocale(broken)).toBe("en");
    expect(() => saveLocale("vi", broken)).not.toThrow();
  });

  it("provides matching guide step counts in English and Vietnamese", () => {
    expect(MESSAGES.en.guide.steps.length).toBeGreaterThan(0);
    expect(MESSAGES.vi.guide.steps.length).toBe(MESSAGES.en.guide.steps.length);
  });
});
