import {
  Color3,
  Color4,
  DirectionalLight,
  DynamicTexture,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  PointLight,
  Scene,
  ShadowGenerator,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";
import { GridMaterial } from "@babylonjs/materials";
import { buildStadium } from "./Stadium";
import { ARENA_RADIUS, RETAINING_WALL_HEIGHT, WALL_HEIGHT, type Obstacle } from "./constants";

export interface ArenaData {
  obstacles: Obstacle[];
  spawnRing: Vector3[];
  shadowGenerator: ShadowGenerator;
  shadowCasters: Mesh[];
  boundaryWall: Mesh;
  ground: Mesh;
}

const PILLARS: { x: number; z: number; radius: number; height: number }[] = [
  { x: 12, z: 8, radius: 1.4, height: 4.2 },
  { x: -14, z: 10, radius: 1.1, height: 5.4 },
  { x: 6, z: -16, radius: 1.6, height: 3.6 },
  { x: -8, z: -14, radius: 1.2, height: 4.8 },
  { x: 20, z: -6, radius: 1.0, height: 5.0 },
  { x: -20, z: -4, radius: 1.3, height: 4.0 },
  { x: 0, z: 20, radius: 1.5, height: 3.8 },
  { x: 18, z: 16, radius: 1.1, height: 4.6 },
];

function buildSky(scene: Scene): void {
  const skyTex = new DynamicTexture("skyGrad", { width: 4, height: 512 }, scene, false);
  const ctx = skyTex.getContext() as CanvasRenderingContext2D;
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, "#04060c");
  grad.addColorStop(0.45, "#0a1330");
  grad.addColorStop(0.75, "#1c1440");
  grad.addColorStop(1, "#3a1030");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 512);
  for (let i = 0; i < 140; i++) {
    const x = Math.random() * 4;
    const y = Math.random() * 340;
    const a = Math.random() * 0.8 + 0.2;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(x, y, 1, 1);
  }
  skyTex.update();

  const sky = MeshBuilder.CreateSphere("sky", { diameter: 900, segments: 8, sideOrientation: Mesh.BACKSIDE }, scene);
  const mat = new StandardMaterial("skyMat", scene);
  mat.emissiveTexture = skyTex;
  mat.diffuseColor = Color3.Black();
  mat.specularColor = Color3.Black();
  mat.disableLighting = true;
  sky.material = mat;
  sky.infiniteDistance = true;
  sky.isPickable = false;
}

function buildGround(scene: Scene): Mesh {
  const ground = MeshBuilder.CreateGround("ground", { width: ARENA_RADIUS * 2 + 4, height: ARENA_RADIUS * 2 + 4, subdivisions: 2 }, scene);
  const mat = new GridMaterial("groundMat", scene);
  mat.mainColor = new Color3(0.02, 0.04, 0.07);
  mat.lineColor = new Color3(0.16, 0.55, 0.65);
  mat.gridRatio = 2;
  mat.majorUnitFrequency = 5;
  mat.minorUnitVisibility = 0.35;
  mat.opacity = 0.99;
  ground.material = mat;
  ground.receiveShadows = true;
  ground.isPickable = false;
  return ground;
}

function buildBoundary(scene: Scene): Mesh {
  const wall = MeshBuilder.CreateCylinder(
    "boundaryWall",
    { diameter: ARENA_RADIUS * 2, height: WALL_HEIGHT, tessellation: 48, sideOrientation: Mesh.DOUBLESIDE },
    scene,
  );
  wall.position.y = RETAINING_WALL_HEIGHT + WALL_HEIGHT / 2;
  const mat = new StandardMaterial("wallMat", scene);
  mat.diffuseColor = new Color3(0.02, 0.04, 0.05);
  mat.emissiveColor = new Color3(0.03, 0.1, 0.12);
  mat.alpha = 0.05;
  mat.specularColor = Color3.Black();
  mat.backFaceCulling = false;
  wall.material = mat;
  wall.isPickable = false;

  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2;
    const x = Math.cos(angle) * (ARENA_RADIUS - 0.15);
    const z = Math.sin(angle) * (ARENA_RADIUS - 0.15);
    const beam = MeshBuilder.CreateBox(`beam${i}`, { width: 0.25, depth: 0.25, height: WALL_HEIGHT }, scene);
    beam.position.set(x, RETAINING_WALL_HEIGHT + WALL_HEIGHT / 2, z);
    const beamMat = new StandardMaterial(`beamMat${i}`, scene);
    const flicker = i % 5 === 0;
    beamMat.emissiveColor = flicker ? new Color3(1, 0.2, 0.3) : new Color3(0.15, 0.7, 0.85);
    beamMat.diffuseColor = Color3.Black();
    beamMat.specularColor = Color3.Black();
    beam.material = beamMat;
    beam.isPickable = false;
  }

  return wall;
}

function buildPillars(scene: Scene, shadowGenerator: ShadowGenerator): { obstacles: Obstacle[]; casters: Mesh[] } {
  const obstacles: Obstacle[] = [];
  const casters: Mesh[] = [];
  const mat = new StandardMaterial("pillarMat", scene);
  mat.diffuseColor = new Color3(0.08, 0.1, 0.14);
  mat.specularColor = new Color3(0.2, 0.2, 0.25);
  mat.emissiveColor = new Color3(0.02, 0.05, 0.07);

  const ringMat = new StandardMaterial("pillarRingMat", scene);
  ringMat.diffuseColor = Color3.Black();
  ringMat.emissiveColor = new Color3(0.9, 0.25, 0.35);
  ringMat.specularColor = Color3.Black();

  for (let i = 0; i < PILLARS.length; i++) {
    const p = PILLARS[i];
    const pillar = MeshBuilder.CreateCylinder(`pillar${i}`, { diameter: p.radius * 2, height: p.height, tessellation: 12 }, scene);
    pillar.position.set(p.x, p.height / 2, p.z);
    pillar.material = mat;
    pillar.receiveShadows = true;
    casters.push(pillar);

    const ring = MeshBuilder.CreateTorus(`pillarRing${i}`, { diameter: p.radius * 2 + 0.12, thickness: 0.06, tessellation: 16 }, scene);
    ring.position.set(p.x, p.height * 0.82, p.z);
    ring.material = ringMat;
    ring.isPickable = false;

    obstacles.push({ x: p.x, z: p.z, radius: p.radius });
  }

  for (const c of casters) shadowGenerator.addShadowCaster(c);

  return { obstacles, casters };
}

function buildLighting(scene: Scene): ShadowGenerator {
  const hemi = new HemisphericLight("hemi", new Vector3(0.2, 1, 0.1), scene);
  hemi.intensity = 0.55;
  hemi.diffuse = new Color3(0.55, 0.65, 0.85);
  hemi.groundColor = new Color3(0.08, 0.05, 0.12);

  const sun = new DirectionalLight("sun", new Vector3(-0.5, -1, 0.35), scene);
  sun.intensity = 1.1;
  sun.diffuse = new Color3(0.85, 0.9, 1.0);
  sun.position = new Vector3(30, 40, -30);

  const shadowGenerator = new ShadowGenerator(1024, sun);
  shadowGenerator.useBlurExponentialShadowMap = true;
  shadowGenerator.blurKernel = 16;
  shadowGenerator.darkness = 0.35;

  const accent1 = new PointLight("accent1", new Vector3(0, 3, 0), scene);
  accent1.diffuse = new Color3(0.3, 0.6, 1);
  accent1.intensity = 0.4;
  accent1.range = 40;

  const accent2 = new PointLight("accent2", new Vector3(15, 2.5, -15), scene);
  accent2.diffuse = new Color3(1, 0.3, 0.4);
  accent2.intensity = 0.3;
  accent2.range = 25;

  return shadowGenerator;
}

export function buildArena(scene: Scene): ArenaData {
  scene.clearColor = new Color4(0.02, 0.03, 0.06, 1);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogColor = new Color3(0.06, 0.06, 0.12);
  scene.fogDensity = 0.012;
  scene.collisionsEnabled = false;

  buildSky(scene);
  const ground = buildGround(scene);
  const boundaryWall = buildBoundary(scene);
  buildStadium(scene);
  const shadowGenerator = buildLighting(scene);
  const { obstacles, casters } = buildPillars(scene, shadowGenerator);

  const spawnRing: Vector3[] = [];
  const spawnCount = 16;
  for (let i = 0; i < spawnCount; i++) {
    const angle = (i / spawnCount) * Math.PI * 2;
    spawnRing.push(new Vector3(Math.cos(angle) * (ARENA_RADIUS - 1.5), 0, Math.sin(angle) * (ARENA_RADIUS - 1.5)));
  }

  return { obstacles, spawnRing, shadowGenerator, shadowCasters: casters, boundaryWall, ground };
}
