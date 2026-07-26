const STORAGE_KEY = "arena-settings-v1";

interface SettingsData {
  autoFire: boolean;
}

function load(): SettingsData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SettingsData>;
      return { autoFire: parsed.autoFire ?? true };
    }
  } catch {
    // localStorage unavailable or corrupt; fall back to defaults
  }
  return { autoFire: true };
}

class SettingsStore {
  private data: SettingsData = load();

  get autoFire(): boolean {
    return this.data.autoFire;
  }

  setAutoFire(value: boolean): void {
    this.data.autoFire = value;
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
