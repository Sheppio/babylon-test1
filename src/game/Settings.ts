const STORAGE_KEY = "arena-settings-v1";

interface SettingsData {
  invertY: boolean;
}

function load(): SettingsData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SettingsData>;
      return { invertY: parsed.invertY ?? false };
    }
  } catch {
    // localStorage unavailable or corrupt; fall back to defaults
  }
  return { invertY: false };
}

class SettingsStore {
  private data: SettingsData = load();

  get invertY(): boolean {
    return this.data.invertY;
  }

  setInvertY(value: boolean): void {
    this.data.invertY = value;
    this.persist();
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // ignore write failures (private browsing, quota, etc.)
    }
  }
}

export const settings = new SettingsStore();
