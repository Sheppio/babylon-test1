import { Color3, Mesh, MeshBuilder, type Scene, StandardMaterial, Vector3 } from "@babylonjs/core";
import { pickupBurst } from "./Effects";
import { ARENA_RADIUS, type Obstacle, PICKUP_HEAL_AMOUNT, PICKUP_LIFETIME, PICKUP_RADIUS } from "./constants";

interface PickupInstance {
  mesh: Mesh;
  age: number;
  spinSpeed: number;
}

export class PickupManager {
  private pickups: PickupInstance[] = [];
  private autoSpawnTimer = 14;
  private mat: StandardMaterial;
  private scene: Scene;
  private obstacles: Obstacle[];
  private onCollect: (amount: number) => void;

  constructor(scene: Scene, obstacles: Obstacle[], onCollect: (amount: number) => void) {
    this.scene = scene;
    this.obstacles = obstacles;
    this.onCollect = onCollect;
    this.mat = new StandardMaterial("pickupMat", scene);
    this.mat.diffuseColor = new Color3(0.1, 0.4, 0.25);
    this.mat.emissiveColor = new Color3(0.3, 1, 0.55);
    this.mat.specularColor = new Color3(0.4, 0.4, 0.4);
    this.mat.alpha = 0.92;
  }

  private findSpawnPoint(): Vector3 {
    for (let attempt = 0; attempt < 20; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * (ARENA_RADIUS - 6);
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      let clear = true;
      for (const ob of this.obstacles) {
        if (Math.hypot(x - ob.x, z - ob.z) < ob.radius + 2) {
          clear = false;
          break;
        }
      }
      if (clear) return new Vector3(x, 0.9, z);
    }
    return new Vector3(0, 0.9, 0);
  }

  spawnOne(): void {
    if (this.pickups.length >= 3) return;
    const pos = this.findSpawnPoint();
    const mesh = MeshBuilder.CreateIcoSphere("pickup", { radius: 0.32, subdivisions: 2 }, this.scene);
    mesh.position.copyFrom(pos);
    mesh.material = this.mat;
    mesh.isPickable = false;
    this.pickups.push({ mesh, age: 0, spinSpeed: 1.6 + Math.random() * 0.6 });
  }

  update(dt: number, playerPos: Vector3): void {
    this.autoSpawnTimer -= dt;
    if (this.autoSpawnTimer <= 0) {
      this.spawnOne();
      this.autoSpawnTimer = 16 + Math.random() * 8;
    }

    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.age += dt;
      p.mesh.rotation.y += dt * p.spinSpeed;
      p.mesh.position.y = 0.9 + Math.sin(p.age * 2.2) * 0.12;

      const dx = playerPos.x - p.mesh.position.x;
      const dz = playerPos.z - p.mesh.position.z;
      const collected = Math.hypot(dx, dz) < PICKUP_RADIUS;
      const expired = p.age > PICKUP_LIFETIME;

      if (collected || expired) {
        if (collected) {
          pickupBurst(this.scene, p.mesh.position.clone());
          this.onCollect(PICKUP_HEAL_AMOUNT);
        }
        p.mesh.dispose();
        this.pickups.splice(i, 1);
      }
    }
  }

  reset(): void {
    for (const p of this.pickups) p.mesh.dispose();
    this.pickups = [];
    this.autoSpawnTimer = 14;
  }
}
