import { type Scene, UniversalCamera, Vector3 } from "@babylonjs/core";
import { resolveCollisions } from "./Collision";
import {
  GRAVITY,
  JUMP_SPEED,
  type Obstacle,
  PLAYER_BASE_SPEED,
  PLAYER_EYE_HEIGHT,
  PLAYER_MAX_HEALTH,
  PLAYER_RADIUS,
  PLAYER_SPRINT_MULT,
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

  constructor(scene: Scene, canvas: HTMLCanvasElement, spawnPos: Vector3, obstacles: Obstacle[], callbacks: PlayerCallbacks) {
    this.obstacles = obstacles;
    this.callbacks = callbacks;
    this.spawnPos = spawnPos.clone();

    this.camera = new UniversalCamera("playerCam", spawnPos.add(new Vector3(0, PLAYER_EYE_HEIGHT, 0)), scene);
    this.camera.minZ = 0.05;
    this.camera.fov = 0.95;
    this.camera.inertia = 0.35;
    this.camera.angularSensibility = 2600;
    this.camera.checkCollisions = false;
    this.camera.applyGravity = false;
    this.camera.attachControl(canvas, true);

    const kb = this.camera.inputs.attached.keyboard;
    if (kb) this.camera.inputs.remove(kb);

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys[e.code] = true;
    if (e.code === "Space") e.preventDefault();
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys[e.code] = false;
  };

  isMoving(): boolean {
    return !!(this.keys["KeyW"] || this.keys["KeyA"] || this.keys["KeyS"] || this.keys["KeyD"]);
  }

  isSprinting(): boolean {
    return this.sprinting;
  }

  update(dt: number): void {
    if (!this.alive) return;
    const cam = this.camera;

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

    const len = Math.hypot(moveX, moveZ);
    this.sprinting = !!(this.keys["ShiftLeft"] || this.keys["ShiftRight"]) && len > 0;
    const speed = PLAYER_BASE_SPEED * (this.sprinting ? PLAYER_SPRINT_MULT : 1);
    if (len > 0) {
      moveX = (moveX / len) * speed * dt;
      moveZ = (moveZ / len) * speed * dt;
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
    this.camera.position.copyFrom(this.spawnPos.add(new Vector3(0, PLAYER_EYE_HEIGHT, 0)));
    this.camera.rotation.set(0, 0, 0);
  }

  dispose(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }
}
