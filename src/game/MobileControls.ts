import type { PlayerController } from "./PlayerController";

export class MobileControls {
  private player: PlayerController;
  private onFireStart: () => void;
  private onFireEnd: () => void;

  private joystickTouchId: number | null = null;
  private joystickCenterX = 0;
  private joystickCenterY = 0;
  private joystickMaxRadius = 50;

  private lookTouchId: number | null = null;
  private lookLastX = 0;
  private lookLastY = 0;

  constructor(player: PlayerController, onFireStart: () => void, onFireEnd: () => void) {
    this.player = player;
    this.onFireStart = onFireStart;
    this.onFireEnd = onFireEnd;
    this.setupJoystick();
    this.setupLookZone();
    this.setupButton(
      "jump-btn",
      () => this.player.setVirtualKey("Space", true),
      () => this.player.setVirtualKey("Space", false),
    );
    this.setupButton(
      "fire-btn",
      () => this.onFireStart(),
      () => this.onFireEnd(),
    );
  }

  private setupJoystick(): void {
    const zone = document.getElementById("joystick-zone");
    const base = document.getElementById("joystick-base");
    const thumb = document.getElementById("joystick-thumb");
    if (!zone || !base || !thumb) return;

    const onStart = (e: TouchEvent): void => {
      if (this.joystickTouchId !== null) return;
      const touch = e.changedTouches[0];
      this.joystickTouchId = touch.identifier;
      const rect = base.getBoundingClientRect();
      this.joystickCenterX = rect.left + rect.width / 2;
      this.joystickCenterY = rect.top + rect.height / 2;
      this.joystickMaxRadius = rect.width / 2 - 12;
      thumb.classList.add("active");
      e.preventDefault();
    };

    const onMove = (e: TouchEvent): void => {
      if (this.joystickTouchId === null) return;
      const touch = Array.from(e.changedTouches).find((t) => t.identifier === this.joystickTouchId);
      if (!touch) return;
      const dx = touch.clientX - this.joystickCenterX;
      const dy = touch.clientY - this.joystickCenterY;
      const dist = Math.hypot(dx, dy);
      const clamped = Math.min(dist, this.joystickMaxRadius);
      const angle = Math.atan2(dy, dx);
      const tx = Math.cos(angle) * clamped;
      const ty = Math.sin(angle) * clamped;
      thumb.style.transform = `translate(${tx}px, ${ty}px)`;
      this.player.setVirtualMove(tx / this.joystickMaxRadius, -ty / this.joystickMaxRadius);
      e.preventDefault();
    };

    const onEnd = (e: TouchEvent): void => {
      const touch = Array.from(e.changedTouches).find((t) => t.identifier === this.joystickTouchId);
      if (!touch) return;
      this.joystickTouchId = null;
      thumb.style.transform = "translate(0, 0)";
      thumb.classList.remove("active");
      this.player.setVirtualMove(0, 0);
    };

    zone.addEventListener("touchstart", onStart, { passive: false });
    zone.addEventListener("touchmove", onMove, { passive: false });
    zone.addEventListener("touchend", onEnd);
    zone.addEventListener("touchcancel", onEnd);
  }

  private setupLookZone(): void {
    const zone = document.getElementById("look-zone");
    if (!zone) return;

    const onStart = (e: TouchEvent): void => {
      if (this.lookTouchId !== null) return;
      const touch = e.changedTouches[0];
      this.lookTouchId = touch.identifier;
      this.lookLastX = touch.clientX;
      this.lookLastY = touch.clientY;
    };

    const onMove = (e: TouchEvent): void => {
      if (this.lookTouchId === null) return;
      const touch = Array.from(e.changedTouches).find((t) => t.identifier === this.lookTouchId);
      if (!touch) return;
      const dx = touch.clientX - this.lookLastX;
      const dy = touch.clientY - this.lookLastY;
      this.lookLastX = touch.clientX;
      this.lookLastY = touch.clientY;
      this.player.applyLookDelta(dx, dy);
      e.preventDefault();
    };

    const onEnd = (e: TouchEvent): void => {
      const touch = Array.from(e.changedTouches).find((t) => t.identifier === this.lookTouchId);
      if (!touch) return;
      this.lookTouchId = null;
    };

    zone.addEventListener("touchstart", onStart, { passive: false });
    zone.addEventListener("touchmove", onMove, { passive: false });
    zone.addEventListener("touchend", onEnd);
    zone.addEventListener("touchcancel", onEnd);
  }

  private setupButton(id: string, onDown: () => void, onUp: () => void): void {
    const btn = document.getElementById(id);
    if (!btn) return;

    btn.addEventListener(
      "touchstart",
      (e) => {
        btn.classList.add("active");
        onDown();
        e.preventDefault();
      },
      { passive: false },
    );

    const release = (): void => {
      btn.classList.remove("active");
      onUp();
    };
    btn.addEventListener("touchend", release);
    btn.addEventListener("touchcancel", release);
  }
}
