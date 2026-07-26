import { type Scene, UniversalCamera, Vector3 } from "@babylonjs/core";
import { resolveCollisions } from "./Collision";
import {
  GRAVITY,
  JOYSTICK_DEADZONE,
  JOYSTICK_SPRINT_THRESHOLD,
  JUMP_SPEED,
  MOUSE_ANGULAR_SENSIBILITY,
  type Obstacle,
  PLAYER_BASE_SPEED,
  PLAYER_EYE_HEIGHT,
  PLAYER_MAX_HEALTH,
  PLAYER_RADIUS,
  PLAYER_SPRINT_MULT,
  TOUCH_LOOK_TURN_SPEED,
} from "./constants";

export interface PlayerCallbacks {
  onDamage: (amount: number, health: number) => void;
  onHeal: (health: number) => void;
  onDeath: () => void;
  onJump: () => void;
}

export class PlayerController {
  camera: UniversalCamera;
  health = PLAYER_MAX_HEALTH;
  alive = true;

  private keys: Record<string, boolean> = {};
  private velocityY = 0;
  private grounded = true;
  private obstacles: Obstacle[];
  private callbacks: PlayerCallbacks;
  private spawnPos: Vector3;
  private sprinting = false;
  private virtualMoveX = 0;
  private virtualMoveZ = 0;
  private virtualLookX = 0;
  private canvasEl: HTMLCanvasElement;

  constructor(scene: Scene, canvas: HTMLCanvasElement, spawnPos: Vector3, obstacles: Obstacle[], callbacks: PlayerCallbacks) {
    this.obstacles = obstacles;
    this.callbacks = callbacks;
    this.spawnPos = spawnPos.clone();
    this.canvasEl = canvas;

    this.camera = new UniversalCamera("playerCam", spawnPos.add(new Vector3(0, PLAYER_EYE_HEIGHT, 0)), scene);
    this.camera.minZ = 0.05;
    this.camera.fov = 0.95;
    this.camera.checkCollisions = false;
    this.camera.applyGravity = false;
    this.camera.attachControl(canvas, true);

    const kb = this.camera.inputs.attached.keyboard;
    if (kb) this.camera.inputs.remove(kb);
    const touch = this.camera.inputs.attached.touch;
    if (touch) this.camera.inputs.remove(touch);
    const mouse = this.camera.inputs.attached.mouse;
    if (mouse) this.camera.inputs.remove(mouse);

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("mousemove", this.onMouseMove);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys[e.code] = true;
    if (e.code === "Space") e.preventDefault();
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys[e.code] = false;
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (document.pointerLockElement !== this.canvasEl) return;
    this.camera.rotation.y += e.movementX / MOUSE_ANGULAR_SENSIBILITY;
  };

  isMoving(): boolean {
    const keyMoving = !!(this.keys["KeyW"] || this.keys["KeyA"] || this.keys["KeyS"] || this.keys["KeyD"]);
    return keyMoving || Math.hypot(this.virtualMoveX, this.virtualMoveZ) > JOYSTICK_DEADZONE;
  }

  isSprinting(): boolean {
    return this.sprinting;
  }

  setVirtualMove(strafe: number, forwardAmount: number): void {
    this.virtualMoveX = strafe;
    this.virtualMoveZ = forwardAmount;
  }

  setVirtualKey(code: string, pressed: boolean): void {
    this.keys[code] = pressed;
  }

  setVirtualLook(x: number): void {
    this.virtualLookX = x;
  }

  update(dt: number): void {
    if (!this.alive) return;
    const cam = this.camera;

    if (Math.abs(this.virtualLookX) > JOYSTICK_DEADZONE) {
      cam.rotation.y += this.virtualLookX * TOUCH_LOOK_TURN_SPEED * dt;
    }

    const forward = cam.getDirection(Vector3.Forward());
    forward.y = 0;
    forward.normalize();
    const right = cam.getDirection(Vector3.Right());
    right.y = 0;
    right.normalize();

    let moveX = 0;
    let moveZ = 0;
    if (this.keys["KeyW"]) {
      moveX += forward.x;
      moveZ += forward.z;
    }
    if (this.keys["KeyS"]) {
      moveX -= forward.x;
      moveZ -= forward.z;
    }
    if (this.keys["KeyD"]) {
      moveX += right.x;
      moveZ += right.z;
    }
    if (this.keys["KeyA"]) {
      moveX -= right.x;
      moveZ -= right.z;
    }

    const kbLen = Math.hypot(moveX, moveZ);
    const joyMagnitude = Math.hypot(this.virtualMoveX, this.virtualMoveZ);
    const keyboardSprint = !!(this.keys["ShiftLeft"] || this.keys["ShiftRight"]) && kbLen > 0;
    this.sprinting = keyboardSprint || joyMagnitude > JOYSTICK_SPRINT_THRESHOLD;
    const speed = PLAYER_BASE_SPEED * (this.sprinting ? PLAYER_SPRINT_MULT : 1);

    if (kbLen > 0) {
      moveX = (moveX / kbLen) * speed * dt;
      moveZ = (moveZ / kbLen) * speed * dt;
    } else if (joyMagnitude > JOYSTICK_DEADZONE) {
      moveX = (forward.x * this.virtualMoveZ + right.x * this.virtualMoveX) * speed * dt;
      moveZ = (forward.z * this.virtualMoveZ + right.z * this.virtualMoveX) * speed * dt;
    } else {
      moveX = 0;
      moveZ = 0;
    }

    const proposed = { x: cam.position.x + moveX, z: cam.position.z + moveZ };
    const resolved = resolveCollisions(proposed, PLAYER_RADIUS, this.obstacles);
    cam.position.x = resolved.x;
    cam.position.z = resolved.z;

    if (this.keys["Space"] && this.grounded) {
      this.velocityY = JUMP_SPEED;
      this.grounded = false;
      this.callbacks.onJump();
    }

    this.velocityY -= GRAVITY * dt;
    cam.position.y += this.velocityY * dt;

    if (cam.position.y <= PLAYER_EYE_HEIGHT) {
      cam.position.y = PLAYER_EYE_HEIGHT;
      this.velocityY = 0;
      this.grounded = true;
    }
  }

  takeDamage(amount: number): void {
    if (!this.alive) return;
    this.health = Math.max(0, this.health - amount);
    this.callbacks.onDamage(amount, this.health);
    if (this.health <= 0) {
      this.alive = false;
      this.callbacks.onDeath();
    }
  }

  heal(amount: number): void {
    if (!this.alive) return;
    this.health = Math.min(PLAYER_MAX_HEALTH, this.health + amount);
    this.callbacks.onHeal(this.health);
  }

  reset(): void {
    this.health = PLAYER_MAX_HEALTH;
    this.alive = true;
    this.velocityY = 0;
    this.grounded = true;
    this.virtualMoveX = 0;
    this.virtualMoveZ = 0;
    this.virtualLookX = 0;
    this.camera.position.copyFrom(this.spawnPos.add(new Vector3(0, PLAYER_EYE_HEIGHT, 0)));
    this.camera.rotation.set(0, 0, 0);
  }

  dispose(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("mousemove", this.onMouseMove);
  }
}
