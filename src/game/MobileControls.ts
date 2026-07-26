import type { PlayerController } from "./PlayerController";

interface JoystickHandle {
  touchId: number | null;
  centerX: number;
  centerY: number;
  maxRadius: number;
}

export class MobileControls {
  private player: PlayerController;
  private onFireStart: () => void;
  private onFireEnd: () => void;

  constructor(player: PlayerController, onFireStart: () => void, onFireEnd: () => void) {
    this.player = player;
    this.onFireStart = onFireStart;
    this.onFireEnd = onFireEnd;

    // bindJoystick reports raw screen-space deflection (y positive = pushed down).
    // Movement treats "up" as forward, so it inverts y. Look only drives yaw (left/right).
    this.bindJoystick("joystick-zone", "joystick-base", "joystick-thumb", (x, y) => this.player.setVirtualMove(x, -y));
    this.bindJoystick("look-joystick-zone", "look-joystick-base", "look-joystick-thumb", (x) => this.player.setVirtualLook(x));

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

  private bindJoystick(zoneId: string, baseId: string, thumbId: string, onChange: (x: number, y: number) => void): void {
    const zone = document.getElementById(zoneId);
    const base = document.getElementById(baseId);
    const thumb = document.getElementById(thumbId);
    if (!zone || !base || !thumb) return;

    const handle: JoystickHandle = { touchId: null, centerX: 0, centerY: 0, maxRadius: 50 };

    const onStart = (e: TouchEvent): void => {
      if (handle.touchId !== null) return;
      const touch = e.changedTouches[0];
      handle.touchId = touch.identifier;
      const rect = base.getBoundingClientRect();
      handle.centerX = rect.left + rect.width / 2;
      handle.centerY = rect.top + rect.height / 2;
      handle.maxRadius = rect.width / 2 - 12;
      thumb.classList.add("active");
      e.preventDefault();
    };

    const onMove = (e: TouchEvent): void => {
      if (handle.touchId === null) return;
      const touch = Array.from(e.changedTouches).find((t) => t.identifier === handle.touchId);
      if (!touch) return;
      const dx = touch.clientX - handle.centerX;
      const dy = touch.clientY - handle.centerY;
      const dist = Math.hypot(dx, dy);
      const clamped = Math.min(dist, handle.maxRadius);
      const angle = Math.atan2(dy, dx);
      const tx = Math.cos(angle) * clamped;
      const ty = Math.sin(angle) * clamped;
      thumb.style.transform = `translate(${tx}px, ${ty}px)`;
      onChange(tx / handle.maxRadius, ty / handle.maxRadius);
      e.preventDefault();
    };

    const onEnd = (e: TouchEvent): void => {
      const touch = Array.from(e.changedTouches).find((t) => t.identifier === handle.touchId);
      if (!touch) return;
      handle.touchId = null;
      thumb.style.transform = "translate(0, 0)";
      thumb.classList.remove("active");
      onChange(0, 0);
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
