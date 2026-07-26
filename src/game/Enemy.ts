import {
  Color3,
  Mesh,
  MeshBuilder,
  type Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
} from "@babylonjs/core";
import { resolveCollisions } from "./Collision";
import { ENEMY_RADIUS, ENEMY_SEPARATION_RADIUS, type Obstacle } from "./constants";

let idCounter = 0;

export class Enemy {
  id: number;
  root: TransformNode;
  hitbox: Mesh;
  shadowCasters: Mesh[] = [];
  health: number;
  maxHealth: number;
  speed: number;
  alive = true;
  attackCooldown = 0;
  tintColor: Color3;

  private bodyMat: StandardMaterial;
  private eyeMat: StandardMaterial;
  private bobPhase: number;

  constructor(scene: Scene, spawnPos: Vector3, health: number, speed: number, tintColor: Color3) {
    this.id = idCounter++;
    this.health = health;
    this.maxHealth = health;
    this.speed = speed;
    this.tintColor = tintColor;
    this.bobPhase = Math.random() * Math.PI * 2;

    this.root = new TransformNode(`enemyRoot${this.id}`, scene);
    this.root.position.copyFrom(spawnPos);

    this.bodyMat = new StandardMaterial(`enemyBody${this.id}`, scene);
    this.bodyMat.diffuseColor = tintColor.scale(0.35);
    this.bodyMat.emissiveColor = tintColor.scale(0.18);
    this.bodyMat.specularColor = new Color3(0.2, 0.2, 0.2);

    this.eyeMat = new StandardMaterial(`enemyEye${this.id}`, scene);
    this.eyeMat.diffuseColor = Color3.Black();
    this.eyeMat.emissiveColor = tintColor;
    this.eyeMat.specularColor = Color3.Black();

    const torso = MeshBuilder.CreateBox(`enemyTorso${this.id}`, { width: 0.75, height: 0.9, depth: 0.5 }, scene);
    torso.position.y = 0.95;
    torso.material = this.bodyMat;
    torso.parent = this.root;
    torso.isPickable = false;
    torso.receiveShadows = true;

    const head = MeshBuilder.CreateBox(`enemyHead${this.id}`, { width: 0.42, height: 0.4, depth: 0.42 }, scene);
    head.position.y = 1.62;
    head.material = this.bodyMat;
    head.parent = this.root;
    head.isPickable = false;

    this.shadowCasters.push(torso, head);

    const eyeL = MeshBuilder.CreateBox(`enemyEyeL${this.id}`, { width: 0.08, height: 0.08, depth: 0.05 }, scene);
    eyeL.position.set(0.11, 1.64, 0.21);
    eyeL.material = this.eyeMat;
    eyeL.parent = this.root;
    eyeL.isPickable = false;

    const eyeR = eyeL.clone(`enemyEyeR${this.id}`);
    eyeR.position.x = -0.11;
    eyeR.parent = this.root;
    eyeR.isPickable = false;

    const legL = MeshBuilder.CreateBox(`enemyLegL${this.id}`, { width: 0.22, height: 0.6, depth: 0.24 }, scene);
    legL.position.set(0.2, 0.3, 0);
    legL.material = this.bodyMat;
    legL.parent = this.root;
    legL.isPickable = false;

    const legR = legL.clone(`enemyLegR${this.id}`);
    legR.position.x = -0.2;
    legR.parent = this.root;
    legR.isPickable = false;

    const shoulder = MeshBuilder.CreateBox(`enemyShoulder${this.id}`, { width: 0.95, height: 0.16, depth: 0.4 }, scene);
    shoulder.position.y = 1.32;
    shoulder.material = this.eyeMat;
    shoulder.parent = this.root;
    shoulder.isPickable = false;

    this.hitbox = MeshBuilder.CreateBox(`enemyHitbox${this.id}`, { width: 0.95, height: 1.9, depth: 0.7 }, scene);
    this.hitbox.position.y = 0.95;
    this.hitbox.parent = this.root;
    this.hitbox.isVisible = false;
    this.hitbox.isPickable = true;
    this.hitbox.metadata = { type: "enemy", ref: this };
  }

  get position(): Vector3 {
    return this.root.position;
  }

  update(dt: number, playerPos: Vector3, obstacles: Obstacle[], others: Enemy[]): void {
    if (!this.alive) return;
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);

    const toPlayer = playerPos.subtract(this.root.position);
    toPlayer.y = 0;
    const dist = toPlayer.length();
    if (dist > 0.01) toPlayer.normalizeFromLength(dist);

    let sepX = 0;
    let sepZ = 0;
    for (const other of others) {
      if (other === this || !other.alive) continue;
      const dx = this.root.position.x - other.root.position.x;
      const dz = this.root.position.z - other.root.position.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.001 && d < ENEMY_SEPARATION_RADIUS) {
        const push = (ENEMY_SEPARATION_RADIUS - d) / ENEMY_SEPARATION_RADIUS;
        sepX += (dx / d) * push;
        sepZ += (dz / d) * push;
      }
    }

    const attackRangeBuffer = 1.4;
    const moveScale = dist > attackRangeBuffer ? 1 : 0;
    let dirX = toPlayer.x * moveScale + sepX * 0.6;
    let dirZ = toPlayer.z * moveScale + sepZ * 0.6;
    const len = Math.hypot(dirX, dirZ);
    if (len > 0.001) {
      dirX /= len;
      dirZ /= len;
    }

    const proposed = { x: this.root.position.x + dirX * this.speed * dt, z: this.root.position.z + dirZ * this.speed * dt };
    const resolved = resolveCollisions(proposed, ENEMY_RADIUS, obstacles);
    this.root.position.x = resolved.x;
    this.root.position.z = resolved.z;

    if (dist > 0.01) {
      this.root.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
    }

    this.bobPhase += dt * (moveScale > 0 ? 9 : 3);
    this.root.position.y = Math.abs(Math.sin(this.bobPhase)) * 0.06;
  }

  distanceToPlayer(playerPos: Vector3): number {
    const dx = playerPos.x - this.root.position.x;
    const dz = playerPos.z - this.root.position.z;
    return Math.hypot(dx, dz);
  }

  takeDamage(amount: number): boolean {
    if (!this.alive) return false;
    this.health -= amount;
    if (this.health <= 0) {
      this.alive = false;
      return true;
    }
    const flash = 1 - this.health / this.maxHealth;
    this.bodyMat.emissiveColor = this.tintColor.scale(0.18 + flash * 0.5);
    return false;
  }

  dispose(): void {
    this.root.dispose(false, true);
  }
}
