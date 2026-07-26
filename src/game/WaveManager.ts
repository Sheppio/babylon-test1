import { Color3, Color4, type Scene, type ShadowGenerator, Vector3 } from "@babylonjs/core";
import { enemyDeathExplosion } from "./Effects";
import { Enemy } from "./Enemy";
import {
  ENEMY_ATTACK_COOLDOWN,
  ENEMY_ATTACK_DAMAGE,
  ENEMY_ATTACK_RANGE,
  ENEMY_BASE_HEALTH,
  ENEMY_BASE_SPEED,
  type Obstacle,
} from "./constants";

type WaveState = "idle" | "spawning" | "active" | "intermission";

export interface WaveCallbacks {
  onWaveStart: (wave: number) => void;
  onWaveClear: (wave: number) => void;
  onEnemyKilled: (enemy: Enemy, wave: number) => void;
  onPlayerHit: (amount: number) => void;
}

const GREEN = new Color3(0.3, 1, 0.4);
const RED = new Color3(1, 0.2, 0.25);

export class WaveManager {
  wave = 0;
  enemies: Enemy[] = [];
  private state: WaveState = "idle";
  private spawnTimer = 0;
  private toSpawn = 0;
  private intermissionTimer = 0;
  private scene: Scene;
  private spawnRing: Vector3[];
  private obstacles: Obstacle[];
  private shadowGenerator: ShadowGenerator;
  private callbacks: WaveCallbacks;

  constructor(scene: Scene, spawnRing: Vector3[], obstacles: Obstacle[], shadowGenerator: ShadowGenerator, callbacks: WaveCallbacks) {
    this.scene = scene;
    this.spawnRing = spawnRing;
    this.obstacles = obstacles;
    this.shadowGenerator = shadowGenerator;
    this.callbacks = callbacks;
  }

  start(): void {
    this.wave = 0;
    this.beginNextWave();
  }

  private beginNextWave(): void {
    this.wave += 1;
    this.toSpawn = Math.min(4 + this.wave * 2, 40);
    this.spawnTimer = 0;
    this.state = "spawning";
    this.callbacks.onWaveStart(this.wave);
  }

  private spawnOne(): void {
    const point = this.spawnRing[Math.floor(Math.random() * this.spawnRing.length)];
    const health = ENEMY_BASE_HEALTH + (this.wave - 1) * 7;
    const speed = ENEMY_BASE_SPEED + Math.min((this.wave - 1) * 0.12, 2.8);
    const tint = Color3.Lerp(GREEN, RED, Math.min((this.wave - 1) / 12, 1));
    const enemy = new Enemy(this.scene, point.clone(), health, speed, tint);
    for (const caster of enemy.shadowCasters) this.shadowGenerator.addShadowCaster(caster);
    this.enemies.push(enemy);
  }

  update(dt: number, playerPos: Vector3): void {
    if (this.state === "idle") return;

    if (this.state === "spawning") {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.toSpawn > 0) {
        this.spawnOne();
        this.toSpawn -= 1;
        this.spawnTimer = Math.max(0.9 - this.wave * 0.02, 0.32);
      }
      if (this.toSpawn <= 0) this.state = "active";
    }

    if (this.state === "spawning" || this.state === "active") {
      for (const enemy of this.enemies) {
        enemy.update(dt, playerPos, this.obstacles, this.enemies);
        if (enemy.attackCooldown <= 0 && enemy.distanceToPlayer(playerPos) <= ENEMY_ATTACK_RANGE) {
          enemy.attackCooldown = ENEMY_ATTACK_COOLDOWN;
          this.callbacks.onPlayerHit(ENEMY_ATTACK_DAMAGE);
        }
      }

      if (this.state === "active" && this.toSpawn <= 0 && this.enemies.length === 0) {
        this.state = "intermission";
        this.intermissionTimer = 4;
        this.callbacks.onWaveClear(this.wave);
      }
    } else if (this.state === "intermission") {
      this.intermissionTimer -= dt;
      if (this.intermissionTimer <= 0) this.beginNextWave();
    }
  }

  damageEnemy(enemy: Enemy, amount: number): boolean {
    const died = enemy.takeDamage(amount);
    if (died) {
      enemyDeathExplosion(
        this.scene,
        enemy.root.position.add(new Vector3(0, 1, 0)),
        new Color4(enemy.tintColor.r, enemy.tintColor.g, enemy.tintColor.b, 1),
      );
      this.callbacks.onEnemyKilled(enemy, this.wave);
      for (const caster of enemy.shadowCasters) this.shadowGenerator.removeShadowCaster(caster);
      enemy.dispose();
      const idx = this.enemies.indexOf(enemy);
      if (idx >= 0) this.enemies.splice(idx, 1);
    }
    return died;
  }

  reset(): void {
    for (const e of this.enemies) {
      for (const caster of e.shadowCasters) this.shadowGenerator.removeShadowCaster(caster);
      e.dispose();
    }
    this.enemies = [];
    this.wave = 0;
    this.state = "idle";
  }
}
