import {
  Color3,
  Color4,
  DynamicTexture,
  ParticleSystem,
  PointLight,
  type Scene,
  Vector3,
} from "@babylonjs/core";

let flareTexture: DynamicTexture | null = null;

function getFlareTexture(scene: Scene): DynamicTexture {
  if (flareTexture) return flareTexture;
  const tex = new DynamicTexture("flareTex", 64, scene, false);
  const ctx = tex.getContext() as CanvasRenderingContext2D;
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.9)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  tex.update();
  flareTexture = tex;
  return tex;
}

interface BurstOptions {
  position: Vector3;
  color1: Color4;
  color2: Color4;
  count: number;
  minSize: number;
  maxSize: number;
  minSpeed: number;
  maxSpeed: number;
  life: number;
  gravityY?: number;
  direction?: Vector3;
  spread?: number;
}

function burst(scene: Scene, opts: BurstOptions): void {
  const ps = new ParticleSystem("burst", opts.count, scene);
  ps.particleTexture = getFlareTexture(scene);
  ps.emitter = opts.position.clone();
  ps.minEmitBox = Vector3.Zero();
  ps.maxEmitBox = Vector3.Zero();
  ps.color1 = opts.color1;
  ps.color2 = opts.color2;
  ps.colorDead = new Color4(opts.color2.r, opts.color2.g, opts.color2.b, 0);
  ps.minSize = opts.minSize;
  ps.maxSize = opts.maxSize;
  ps.minLifeTime = opts.life * 0.7;
  ps.maxLifeTime = opts.life;
  ps.emitRate = opts.count / 0.05;
  ps.blendMode = ParticleSystem.BLENDMODE_ADD;
  ps.gravity = new Vector3(0, opts.gravityY ?? -9.8, 0);
  ps.minEmitPower = opts.minSpeed;
  ps.maxEmitPower = opts.maxSpeed;
  ps.updateSpeed = 0.016;

  const dir = opts.direction ?? new Vector3(0, 1, 0);
  const spread = opts.spread ?? Math.PI;
  ps.createConeEmitter(0.05, spread);
  ps.direction1 = dir;
  ps.direction2 = dir;

  ps.start();
  const stopMs = 60;
  const disposeMs = (opts.life + 0.1) * 1000 + stopMs;
  setTimeout(() => ps.stop(), stopMs);
  setTimeout(() => ps.dispose(), disposeMs);
}

export function muzzleFlash(scene: Scene, position: Vector3, direction: Vector3): void {
  burst(scene, {
    position,
    color1: new Color4(1, 0.95, 0.6, 1),
    color2: new Color4(1, 0.6, 0.15, 1),
    count: 14,
    minSize: 0.08,
    maxSize: 0.22,
    minSpeed: 2,
    maxSpeed: 5,
    life: 0.12,
    gravityY: 0,
    direction,
    spread: 0.5,
  });

  const light = new PointLight("muzzleLight", position, scene);
  light.diffuse = new Color3(1, 0.7, 0.3);
  light.intensity = 6;
  light.range = 8;
  setTimeout(() => light.dispose(), 45);
}

export function hitSpark(scene: Scene, position: Vector3): void {
  burst(scene, {
    position,
    color1: new Color4(1, 0.9, 0.3, 1),
    color2: new Color4(1, 0.3, 0.2, 1),
    count: 10,
    minSize: 0.05,
    maxSize: 0.14,
    minSpeed: 1.5,
    maxSpeed: 4,
    life: 0.25,
    gravityY: -4,
  });
}

export function enemyDeathExplosion(scene: Scene, position: Vector3, color: Color4): void {
  burst(scene, {
    position,
    color1: color,
    color2: new Color4(0.1, 0.1, 0.15, 1),
    count: 34,
    minSize: 0.15,
    maxSize: 0.45,
    minSpeed: 2,
    maxSpeed: 7,
    life: 0.55,
    gravityY: -6,
  });
}

export function pickupBurst(scene: Scene, position: Vector3): void {
  burst(scene, {
    position,
    color1: new Color4(0.3, 1, 0.6, 1),
    color2: new Color4(0.3, 1, 1, 1),
    count: 20,
    minSize: 0.1,
    maxSize: 0.25,
    minSpeed: 1,
    maxSpeed: 3.5,
    life: 0.5,
    gravityY: -2,
  });
}
