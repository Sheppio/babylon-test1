import {
  Color3,
  Color4,
  DefaultRenderingPipeline,
  Engine,
  Frustum,
  Mesh,
  Ray,
  Scene,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";
import { buildArena } from "./Arena";
import { SfxEngine } from "./Audio";
import { hitSpark, muzzleFlash } from "./Effects";
import { Enemy } from "./Enemy";
import { HUD } from "./HUD";
import { MobileControls } from "./MobileControls";
import { PickupManager } from "./Pickups";
import { PlayerController } from "./PlayerController";
import { settings } from "./Settings";
import { isTouchDevice } from "./touch";
import { WaveManager } from "./WaveManager";
import { WeaponView } from "./WeaponView";
import { FIRE_COOLDOWN, WEAPON_DAMAGE, WEAPON_RANGE } from "./constants";

type GameState = "start" | "playing" | "paused" | "gameover";

const COMBO_WINDOW = 1.6;

export class Game {
  private engine: Engine;
  private scene: Scene;
  private hud = new HUD();
  private audio = new SfxEngine();
  private player: PlayerController;
  private weapon: WeaponView;
  private waveManager: WaveManager;
  private pickups: PickupManager;
  private ground: Mesh;
  private pipeline: DefaultRenderingPipeline;

  private state: GameState = "start";
  private isFiring = false;
  private fireCooldown = 0;
  private score = 0;
  private kills = 0;
  private comboCount = 0;
  private comboClock = -999;
  private clock = 0;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.engine = new Engine(canvas, true, { stencil: true, antialias: true }, true);
    this.scene = new Scene(this.engine);

    const arena = buildArena(this.scene);
    this.ground = arena.ground;

    this.player = new PlayerController(this.scene, canvas, new Vector3(0, 0, 0), arena.obstacles, {
      onDamage: (_amount, health) => {
        this.hud.setHealth(health, 100);
        this.hud.flashDamage();
        this.audio.playerHurt();
      },
      onHeal: (health) => this.hud.setHealth(health, 100),
      onDeath: () => {
        this.audio.playerDeath();
        this.gameOver();
      },
      onJump: () => this.audio.jump(),
    });

    this.weapon = new WeaponView(this.scene, this.player.camera);

    this.waveManager = new WaveManager(this.scene, arena.spawnRing, arena.obstacles, arena.shadowGenerator, {
      onWaveStart: (wave) => {
        this.hud.setWave(wave);
        this.hud.showBanner(`WAVE ${wave}`);
        this.audio.waveStart();
      },
      onWaveClear: (_wave) => {
        this.hud.showBanner("WAVE CLEARED");
        this.audio.waveClear();
        this.audio.crowdCheer();
        this.player.heal(18);
        this.pickups.spawnOne();
      },
      onEnemyKilled: (_enemy, wave) => this.registerKill(wave),
      onPlayerHit: (amount) => this.player.takeDamage(amount),
    });

    this.pickups = new PickupManager(this.scene, arena.obstacles, (amount) => {
      this.player.heal(amount);
      this.audio.pickup();
    });

    if (isTouchDevice) {
      new MobileControls(
        this.player,
        () => {
          if (this.state === "playing") this.isFiring = true;
        },
        () => {
          this.isFiring = false;
        },
      );
    }

    this.pipeline = new DefaultRenderingPipeline("pipeline", true, this.scene, [this.player.camera]);
    this.pipeline.bloomEnabled = true;
    this.pipeline.bloomThreshold = 0.55;
    this.pipeline.bloomWeight = 0.28;
    this.pipeline.bloomKernel = 48;
    this.pipeline.bloomScale = 0.5;
    this.pipeline.fxaaEnabled = true;
    this.pipeline.imageProcessing.vignetteEnabled = true;
    this.pipeline.imageProcessing.vignetteWeight = 1.2;
    this.pipeline.imageProcessing.vignetteColor = new Color4(0, 0, 0, 1);
    this.pipeline.imageProcessing.contrast = 1.08;
    this.pipeline.imageProcessing.exposure = 1.0;

    this.hud.onStart(() => this.startGame());
    this.hud.onRestart(() => this.startGame());
    document.getElementById("pause-screen")?.addEventListener("click", () => {
      canvas.requestPointerLock();
    });

    document.addEventListener("pointerlockchange", () => {
      const locked = document.pointerLockElement === canvas;
      if (!locked && this.state === "playing") {
        this.state = "paused";
        this.hud.showPause();
      } else if (locked && this.state === "paused") {
        this.state = "playing";
        this.hud.hidePause();
      }
    });

    window.addEventListener("mousedown", (e) => {
      if (e.button === 0 && this.state === "playing") this.isFiring = true;
    });
    window.addEventListener("mouseup", (e) => {
      if (e.button === 0) this.isFiring = false;
    });

    window.addEventListener("resize", () => this.engine.resize());

    this.engine.runRenderLoop(() => {
      this.update();
      this.scene.render();
    });

    this.hud.setReady();
  }

  private startGame(): void {
    this.audio.unlock();
    this.audio.startCrowdAmbience();
    this.score = 0;
    this.kills = 0;
    this.comboCount = 0;
    this.comboClock = -999;
    this.clock = 0;

    this.player.reset();
    this.waveManager.reset();
    this.pickups.reset();
    this.waveManager.start();

    this.hud.enterPlaying();
    this.hud.setHealth(100, 100);
    this.hud.setScore(0);

    this.state = "playing";
    if (!isTouchDevice) this.canvas.requestPointerLock();
  }

  private gameOver(): void {
    this.state = "gameover";
    this.isFiring = false;
    this.audio.stopCrowdAmbience();
    document.exitPointerLock();
    this.hud.showGameOver(this.score, this.waveManager.wave, this.kills);
  }

  private registerKill(wave: number): void {
    this.kills += 1;
    if (this.clock - this.comboClock <= COMBO_WINDOW) {
      this.comboCount += 1;
    } else {
      this.comboCount = 1;
    }
    this.comboClock = this.clock;
    const points = 10 * wave * this.comboCount;
    this.score += points;
    this.hud.setScore(this.score);
    this.hud.showCombo(this.comboCount);
    this.audio.enemyDeath();
  }

  applyDebugFlags(flags: URLSearchParams): void {
    if (flags.has("noground")) this.ground.setEnabled(false);
    if (flags.has("flatground")) {
      const mat = new StandardMaterial("debugFlatGround", this.scene);
      mat.diffuseColor = new Color3(0.5, 0.1, 0.6);
      mat.specularColor = Color3.Black();
      this.ground.material = mat;
    }
    if (flags.has("nofog")) this.scene.fogEnabled = false;
    if (flags.has("nopipeline")) this.pipeline.dispose();
    if (flags.has("nofrustumcull")) {
      for (const m of this.scene.meshes) m.alwaysSelectAsActiveMesh = true;
    }
    if (flags.has("wireframe")) {
      for (const m of this.scene.materials) m.wireframe = true;
    }
  }

  debugInfo(): {
    meshCount: number;
    lightCount: number;
    materialCount: number;
    fps: number;
    meshStatus: Record<string, string>;
    camera: string;
  } {
    const names = ["pulseRing", "emblem", "risersMerged", "retainingWall", "ground", "trussStructureMerged"];
    const meshStatus: Record<string, string> = {};
    const cam = this.player.camera;
    cam.getViewMatrix(true);
    const transform = cam.getTransformationMatrix();
    const frustumPlanes = Frustum.GetPlanes(transform);
    for (const n of names) {
      const m = this.scene.getMeshByName(n);
      if (!m) {
        meshStatus[n] = "MISSING";
        continue;
      }
      const info = m.getBoundingInfo();
      const center = info.boundingSphere.centerWorld;
      const dist = Vector3.Distance(cam.globalPosition, center);
      const inFrustum = m.isInFrustum(frustumPlanes);
      meshStatus[n] =
        `${m.isEnabled() ? "en" : "DIS"} pos(${center.x.toFixed(1)},${center.y.toFixed(1)},${center.z.toFixed(1)}) ` +
        `d=${dist.toFixed(1)} r=${info.boundingSphere.radiusWorld.toFixed(1)} frustum=${inFrustum} vis=${m.isVisible} a=${(m.material as { alpha?: number })?.alpha ?? "n/a"}`;
    }
    return {
      meshCount: this.scene.meshes.length,
      lightCount: this.scene.lights.length,
      materialCount: this.scene.materials.length,
      fps: this.engine.getFps(),
      meshStatus,
      camera: `pos(${cam.globalPosition.x.toFixed(1)},${cam.globalPosition.y.toFixed(1)},${cam.globalPosition.z.toFixed(1)}) rot(${cam.rotation.x.toFixed(2)},${cam.rotation.y.toFixed(2)}) fov=${cam.fov.toFixed(2)} minZ=${cam.minZ} maxZ=${cam.maxZ}`,
    };
  }

  private hasTargetInSight(): boolean {
    const cam = this.player.camera;
    const direction = cam.getDirection(Vector3.Forward());
    const ray = new Ray(cam.globalPosition, direction, WEAPON_RANGE);
    const pick = this.scene.pickWithRay(ray, (mesh) => mesh.metadata?.type === "enemy");
    return !!pick?.hit;
  }

  private fire(): void {
    this.audio.shoot();
    this.weapon.triggerRecoil();
    const cam = this.player.camera;
    const direction = cam.getDirection(Vector3.Forward());
    muzzleFlash(this.scene, this.weapon.getMuzzleWorldPosition(), direction);

    const ray = new Ray(cam.globalPosition, direction, WEAPON_RANGE);
    const pick = this.scene.pickWithRay(ray, (mesh) => mesh.metadata?.type === "enemy");
    if (pick?.hit && pick.pickedPoint) {
      const enemy = pick.pickedMesh?.metadata?.ref as Enemy | undefined;
      if (enemy) {
        hitSpark(this.scene, pick.pickedPoint);
        this.hud.showHitmarker();
        const died = this.waveManager.damageEnemy(enemy, WEAPON_DAMAGE);
        if (!died) this.audio.enemyHit();
      }
    }
  }

  private update(): void {
    const dt = Math.min(this.engine.getDeltaTime() / 1000, 0.05);
    if (this.state !== "playing") return;
    this.clock += dt;

    this.player.update(dt);
    this.weapon.update(dt, this.player.isMoving(), this.player.isSprinting());
    this.waveManager.update(dt, this.player.camera.position);
    this.pickups.update(dt, this.player.camera.position);

    this.fireCooldown -= dt;
    const wantsToFire = settings.autoFire ? this.hasTargetInSight() : this.isFiring;
    if (wantsToFire && this.fireCooldown <= 0) {
      this.fireCooldown = FIRE_COOLDOWN;
      this.fire();
    }
  }
}
