import { settings } from "./Settings";
import { isTouchDevice } from "./touch";

function el<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing element #${id}`);
  return found as T;
}

export class HUD {
  private startScreen = el<HTMLDivElement>("start-screen");
  private pauseScreen = el<HTMLDivElement>("pause-screen");
  private gameoverScreen = el<HTMLDivElement>("gameover-screen");
  private settingsScreen = el<HTMLDivElement>("settings-screen");
  private settingsBtn = el<HTMLButtonElement>("settings-btn");
  private settingsBackBtn = el<HTMLButtonElement>("settings-back-btn");
  private invertYToggle = el<HTMLInputElement>("invert-y-toggle");
  private autoFireToggle = el<HTMLInputElement>("auto-fire-toggle");
  private hud = el<HTMLDivElement>("hud");
  private mobileControls = el<HTMLDivElement>("mobile-controls");
  private crosshair = el<HTMLDivElement>("crosshair");
  private ammoHint = el<HTMLDivElement>("ammo-hint");
  private healthFill = el<HTMLDivElement>("health-fill");
  private healthText = el<HTMLDivElement>("health-text");
  private waveText = el<HTMLDivElement>("wave-text");
  private scoreText = el<HTMLDivElement>("score-text");
  private comboText = el<HTMLDivElement>("combo-text");
  private banner = el<HTMLDivElement>("banner");
  private vignette = el<HTMLDivElement>("vignette");
  private damageFlash = el<HTMLDivElement>("damage-flash");
  private hitmarker = el<HTMLDivElement>("hitmarker");
  private startBtn = el<HTMLButtonElement>("start-btn");
  private restartBtn = el<HTMLButtonElement>("restart-btn");
  private loadingText = el<HTMLDivElement>("loading-text");
  private finalScore = el<HTMLSpanElement>("final-score");
  private finalWave = el<HTMLSpanElement>("final-wave");
  private finalKills = el<HTMLSpanElement>("final-kills");

  private comboHideTimer: number | null = null;

  constructor() {
    if (isTouchDevice) document.body.classList.add("touch-device");

    this.invertYToggle.checked = settings.invertY;
    this.invertYToggle.addEventListener("change", () => settings.setInvertY(this.invertYToggle.checked));

    this.autoFireToggle.checked = settings.autoFire;
    document.body.classList.toggle("auto-fire", settings.autoFire);
    this.autoFireToggle.addEventListener("change", () => {
      settings.setAutoFire(this.autoFireToggle.checked);
      document.body.classList.toggle("auto-fire", this.autoFireToggle.checked);
    });

    this.settingsBtn.addEventListener("click", () => {
      this.startScreen.classList.add("hidden");
      this.settingsScreen.classList.remove("hidden");
    });
    this.settingsBackBtn.addEventListener("click", () => {
      this.settingsScreen.classList.add("hidden");
      this.startScreen.classList.remove("hidden");
    });
  }

  onStart(cb: () => void): void {
    this.startBtn.addEventListener("click", cb);
  }

  onRestart(cb: () => void): void {
    this.restartBtn.addEventListener("click", cb);
  }

  setReady(): void {
    this.loadingText.classList.add("ready");
  }

  enterPlaying(): void {
    this.startScreen.classList.add("hidden");
    this.pauseScreen.classList.add("hidden");
    this.gameoverScreen.classList.add("hidden");
    this.hud.classList.add("visible");
    this.crosshair.classList.add("visible");
    this.ammoHint.classList.add("visible");
    this.mobileControls.classList.add("visible");
    const fireHint = settings.autoFire ? "AUTO-FIRE ON TARGET" : "LMB FIRE";
    this.ammoHint.innerHTML = `${fireHint} &nbsp;·&nbsp; WASD MOVE &nbsp;·&nbsp; SPACE JUMP &nbsp;·&nbsp; SHIFT SPRINT`;
  }

  showPause(): void {
    this.pauseScreen.classList.remove("hidden");
  }

  hidePause(): void {
    this.pauseScreen.classList.add("hidden");
  }

  showGameOver(score: number, wave: number, kills: number): void {
    this.finalScore.textContent = String(score);
    this.finalWave.textContent = String(wave);
    this.finalKills.textContent = String(kills);
    this.gameoverScreen.classList.remove("hidden");
    this.hud.classList.remove("visible");
    this.crosshair.classList.remove("visible");
    this.ammoHint.classList.remove("visible");
    this.mobileControls.classList.remove("visible");
  }

  setHealth(current: number, max: number): void {
    const pct = Math.max(0, Math.min(100, (current / max) * 100));
    this.healthFill.style.width = `${pct}%`;
    this.healthText.textContent = `${Math.ceil(current)} / ${max}`;
    if (pct < 55) {
      const hue = pct < 25 ? "#ff3860" : "#ffcf3f";
      this.healthFill.style.background = `linear-gradient(90deg, ${hue}, #ff3860)`;
    } else {
      this.healthFill.style.background = "";
    }
    this.vignette.classList.toggle("low-health", current > 0 && current <= 28);
  }

  flashDamage(): void {
    this.damageFlash.classList.remove("hit");
    void this.damageFlash.offsetWidth;
    this.damageFlash.classList.add("hit");
  }

  showHitmarker(): void {
    this.hitmarker.classList.remove("show");
    void this.hitmarker.offsetWidth;
    this.hitmarker.classList.add("show");
  }

  setWave(wave: number): void {
    this.waveText.textContent = `WAVE ${wave}`;
  }

  setScore(score: number): void {
    this.scoreText.textContent = `SCORE ${score}`;
  }

  showCombo(multiplier: number): void {
    if (multiplier < 2) {
      this.comboText.classList.remove("show");
      return;
    }
    this.comboText.textContent = `${multiplier}x COMBO`;
    this.comboText.classList.add("show");
    if (this.comboHideTimer !== null) window.clearTimeout(this.comboHideTimer);
    this.comboHideTimer = window.setTimeout(() => this.comboText.classList.remove("show"), 1400);
  }

  showBanner(text: string): void {
    this.banner.textContent = text;
    this.banner.classList.remove("show");
    void this.banner.offsetWidth;
    this.banner.classList.add("show");
  }
}
