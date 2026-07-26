import {
  Color3,
  DynamicTexture,
  Matrix,
  Mesh,
  MeshBuilder,
  Quaternion,
  Scene,
  SpotLight,
  StandardMaterial,
  Texture,
  Vector3,
} from "@babylonjs/core";
import { ARENA_RADIUS, RETAINING_WALL_HEIGHT } from "./constants";

const ROW_COUNT = 9;
const ROW_DEPTH = 2.1;
const ROW_HEIGHT = 1.05;
const ROW_START_RADIUS = ARENA_RADIUS + 3;
const TRUSS_RADIUS = ARENA_RADIUS + ROW_COUNT * ROW_DEPTH + 5;
const TRUSS_COUNT = 6;
const TRUSS_HEIGHT = 17;

const CROWD_PALETTE = [
  new Color3(0.82, 0.85, 0.9),
  new Color3(0.16, 0.62, 0.85),
  new Color3(0.78, 0.2, 0.3),
  new Color3(0.45, 0.47, 0.53),
  new Color3(0.85, 0.7, 0.28),
  new Color3(0.3, 0.75, 0.55),
];

function mergeOrFirst(parts: Mesh[]): Mesh {
  return Mesh.MergeMeshes(parts, true, true) ?? parts[0];
}

function createPanelTexture(scene: Scene): DynamicTexture {
  const size = 256;
  const tex = new DynamicTexture("wallPanelTex", { width: size, height: size }, scene, false);
  const ctx = tex.getContext() as CanvasRenderingContext2D;
  ctx.fillStyle = "#0b1017";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "rgba(255,255,255,0.035)";
  ctx.fillRect(10, 10, size - 20, size / 2 - 18);
  ctx.fillRect(10, size / 2 + 8, size - 20, size / 2 - 18);
  ctx.strokeStyle = "rgba(0,0,0,0.65)";
  ctx.lineWidth = 5;
  ctx.strokeRect(2, 2, size - 4, size - 4);
  ctx.beginPath();
  ctx.moveTo(0, size / 2);
  ctx.lineTo(size, size / 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(90,210,235,0.55)";
  ctx.fillRect(18, size - 16, size - 36, 4);
  ctx.fillStyle = "rgba(140,160,175,0.55)";
  for (const [x, y] of [
    [18, 18],
    [size - 18, 18],
    [18, size - 18],
    [size - 18, size - 18],
  ]) {
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  tex.update();
  tex.wrapU = Texture.WRAP_ADDRESSMODE;
  tex.wrapV = Texture.CLAMP_ADDRESSMODE;
  return tex;
}

function buildRetainingWall(scene: Scene): void {
  const height = RETAINING_WALL_HEIGHT;
  const radius = ARENA_RADIUS + 0.4;
  const wall = MeshBuilder.CreateCylinder(
    "retainingWall",
    { diameter: radius * 2, height, tessellation: 32, sideOrientation: Mesh.DOUBLESIDE },
    scene,
  );
  wall.position.y = height / 2;

  const tex = createPanelTexture(scene);
  const circumference = 2 * Math.PI * radius;
  tex.uScale = circumference / 3;

  const mat = new StandardMaterial("retainingWallMat", scene);
  mat.diffuseTexture = tex;
  mat.emissiveColor = new Color3(0.05, 0.09, 0.11);
  mat.specularColor = new Color3(0.1, 0.1, 0.12);
  wall.material = mat;
  wall.receiveShadows = true;
  wall.isPickable = false;
}

function buildFloorEmblem(scene: Scene): void {
  const size = 512;
  const tex = new DynamicTexture("emblemTex", { width: size, height: size }, scene, false);
  tex.hasAlpha = true;
  const ctx = tex.getContext() as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2;
  const cy = size / 2;
  ctx.strokeStyle = "rgba(78,226,255,0.85)";
  for (let r = 70; r <= 230; r += 40) {
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.lineWidth = 2;
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 235, cy + Math.sin(a) * 235);
    ctx.lineTo(cx + Math.cos(a) * 250, cy + Math.sin(a) * 250);
    ctx.stroke();
  }
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 4;
  for (let i = 0; i < 6; i++) {
    ctx.rotate(Math.PI / 3);
    ctx.beginPath();
    ctx.moveTo(0, -55);
    ctx.lineTo(20, -15);
    ctx.lineTo(-20, -15);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
  tex.update();

  const disc = MeshBuilder.CreateDisc("emblem", { radius: 16, tessellation: 32 }, scene);
  disc.rotation.x = Math.PI / 2;
  disc.position.y = 0.03;
  const mat = new StandardMaterial("emblemMat", scene);
  mat.emissiveTexture = tex;
  mat.opacityTexture = tex;
  mat.diffuseColor = Color3.Black();
  mat.specularColor = Color3.Black();
  mat.disableLighting = true;
  disc.material = mat;
  disc.isPickable = false;
}

function buildPulseRing(scene: Scene): void {
  const ring = MeshBuilder.CreateTorus("pulseRing", { diameter: 2, thickness: 0.12, tessellation: 24 }, scene);
  ring.position.y = 0.05;
  ring.isPickable = false;
  const mat = new StandardMaterial("pulseRingMat", scene);
  mat.diffuseColor = Color3.Black();
  mat.emissiveColor = new Color3(0.3, 0.9, 1);
  mat.specularColor = Color3.Black();
  mat.alpha = 0.6;
  ring.material = mat;

  const maxScale = 15;
  const duration = 3.4;
  let t = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000;
    t = (t + dt) % duration;
    const progress = t / duration;
    const scale = 0.5 + progress * maxScale;
    ring.scaling.set(scale, 1, scale);
    mat.alpha = 0.55 * (1 - progress);
  });
}

function buildBleachersAndCrowd(scene: Scene): void {
  const riserMat = new StandardMaterial("riserMat", scene);
  riserMat.diffuseColor = new Color3(0.11, 0.13, 0.17);
  riserMat.specularColor = Color3.Black();

  const trimColors = [new Color3(0.15, 0.7, 0.85), new Color3(0.9, 0.25, 0.35)];
  const trimMats = trimColors.map((c, idx) => {
    const m = new StandardMaterial(`riserTrimMat${idx}`, scene);
    m.diffuseColor = Color3.Black();
    m.emissiveColor = c;
    m.specularColor = Color3.Black();
    return m;
  });

  const body = MeshBuilder.CreateBox("specBody", { width: 0.5, height: 0.85, depth: 0.32 }, scene);
  body.position.y = 0.85 / 2;
  const head = MeshBuilder.CreateBox("specHead", { width: 0.3, height: 0.3, depth: 0.3 }, scene);
  head.position.y = 0.85 + 0.15;
  const spectatorMesh = mergeOrFirst([body, head]);
  spectatorMesh.name = "spectatorBase";
  const specMat = new StandardMaterial("spectatorMat", scene);
  specMat.diffuseColor = new Color3(1, 1, 1);
  specMat.emissiveColor = new Color3(0.35, 0.35, 0.35);
  specMat.specularColor = Color3.Black();
  spectatorMesh.material = specMat;
  spectatorMesh.isPickable = false;
  spectatorMesh.receiveShadows = false;

  const matrices: number[] = [];
  const colors: number[] = [];
  let instanceCount = 0;

  const riserParts: Mesh[] = [];
  const trimPartsByColor: Mesh[][] = [[], []];

  for (let row = 0; row < ROW_COUNT; row++) {
    const innerRadius = ROW_START_RADIUS + row * ROW_DEPTH;
    const outerY = (row + 1) * ROW_HEIGHT;

    const riser = MeshBuilder.CreateCylinder(
      `riser${row}`,
      { diameter: innerRadius * 2, height: ROW_HEIGHT, tessellation: 32, sideOrientation: Mesh.DOUBLESIDE },
      scene,
    );
    riser.position.y = row * ROW_HEIGHT + ROW_HEIGHT / 2;
    riser.isPickable = false;
    riserParts.push(riser);

    const trim = MeshBuilder.CreateTorus(`riserTrim${row}`, { diameter: innerRadius * 2 + 0.1, thickness: 0.05, tessellation: 24 }, scene);
    trim.position.y = row * ROW_HEIGHT + ROW_HEIGHT - 0.02;
    trim.isPickable = false;
    trimPartsByColor[row % 2].push(trim);

    const seatRadius = innerRadius + ROW_DEPTH * 0.4;
    const angleStep = 0.14;
    const angleOffset = row % 2 === 0 ? 0 : angleStep / 2;
    for (let a = angleOffset; a < Math.PI * 2; a += angleStep) {
      if (Math.random() < 0.12) continue;
      const jitterAngle = a + (Math.random() - 0.5) * 0.05;
      const jitterRadius = seatRadius + (Math.random() - 0.5) * 0.6;
      const x = Math.cos(jitterAngle) * jitterRadius;
      const z = Math.sin(jitterAngle) * jitterRadius;
      const yaw = Math.atan2(-x, -z);
      const scaleXZ = 0.9 + Math.random() * 0.2;
      const scaleY = 0.85 + Math.random() * 0.3;

      const m = Matrix.Compose(
        new Vector3(scaleXZ, scaleY, scaleXZ),
        Quaternion.FromEulerAngles(0, yaw, 0),
        new Vector3(x, outerY, z),
      );
      m.copyToArray(matrices, instanceCount * 16);
      const c = CROWD_PALETTE[Math.floor(Math.random() * CROWD_PALETTE.length)];
      colors.push(c.r, c.g, c.b, 1);
      instanceCount++;
    }
  }

  const mergedRisers = mergeOrFirst(riserParts);
  mergedRisers.name = "risersMerged";
  mergedRisers.material = riserMat;
  mergedRisers.isPickable = false;
  mergedRisers.receiveShadows = true;

  trimPartsByColor.forEach((parts, idx) => {
    const merged = mergeOrFirst(parts);
    merged.name = `trimMerged${idx}`;
    merged.material = trimMats[idx];
    merged.isPickable = false;
  });

  spectatorMesh.thinInstanceSetBuffer("matrix", new Float32Array(matrices), 16);
  spectatorMesh.thinInstanceSetBuffer("color", new Float32Array(colors), 4);
}

function buildLightTrusses(scene: Scene): void {
  const poleMat = new StandardMaterial("trussPoleMat", scene);
  poleMat.diffuseColor = new Color3(0.09, 0.09, 0.11);
  poleMat.specularColor = Color3.Black();

  const lampMats = [new StandardMaterial("trussLampMatWarm", scene), new StandardMaterial("trussLampMatCool", scene)];
  const beamMats = [new StandardMaterial("trussBeamMatWarm", scene), new StandardMaterial("trussBeamMatCool", scene)];
  const lightColors = [new Color3(1, 0.88, 0.65), new Color3(0.55, 0.85, 1)];
  lampMats.forEach((m, i) => {
    m.diffuseColor = Color3.Black();
    m.emissiveColor = lightColors[i];
    m.specularColor = Color3.Black();
  });
  beamMats.forEach((m, i) => {
    m.diffuseColor = Color3.Black();
    m.emissiveColor = lightColors[i];
    m.specularColor = Color3.Black();
    m.alpha = 0.05;
    m.backFaceCulling = false;
  });

  const structureParts: Mesh[] = [];
  const lampPartsByColor: Mesh[][] = [[], []];
  const beamPartsByColor: Mesh[][] = [[], []];

  const tilt = 0.55;

  for (let i = 0; i < TRUSS_COUNT; i++) {
    const angle = (i / TRUSS_COUNT) * Math.PI * 2;
    const x = Math.cos(angle) * TRUSS_RADIUS;
    const z = Math.sin(angle) * TRUSS_RADIUS;
    const colorIdx = i % 2;

    const pole = MeshBuilder.CreateCylinder(`trussPole${i}`, { diameter: 0.5, height: TRUSS_HEIGHT, tessellation: 8 }, scene);
    pole.position.set(x, TRUSS_HEIGHT / 2, z);
    pole.isPickable = false;
    structureParts.push(pole);

    const fixture = MeshBuilder.CreateBox(`trussFixture${i}`, { width: 2.2, height: 0.35, depth: 0.55 }, scene);
    fixture.position.set(x, TRUSS_HEIGHT, z);
    fixture.rotation.y = Math.atan2(-x, -z);
    fixture.isPickable = false;
    structureParts.push(fixture);

    for (let j = -1; j <= 1; j++) {
      const lamp = MeshBuilder.CreateCylinder(`trussLamp${i}_${j}`, { diameter: 0.32, height: 0.22, tessellation: 8 }, scene);
      lamp.position.set(x + j * 0.7 * Math.cos(fixture.rotation.y), TRUSS_HEIGHT - 0.22, z - j * 0.7 * Math.sin(fixture.rotation.y));
      lamp.isPickable = false;
      lampPartsByColor[colorIdx].push(lamp);
    }

    const inward = new Vector3(-x, 0, -z).normalize();
    const dir = new Vector3(inward.x * Math.sin(tilt), -Math.cos(tilt), inward.z * Math.sin(tilt)).normalize();

    // StandardMaterial caps lighting at 4 simultaneous lights per mesh by default, so having
    // every truss cast a real spotlight stays cheap - each surface only ever shades against
    // its nearest few anyway.
    const spot = new SpotLight(`trussSpot${i}`, new Vector3(x, TRUSS_HEIGHT, z), dir, Math.PI / 3.5, 3.5, scene);
    spot.diffuse = lightColors[colorIdx];
    spot.intensity = 45;
    spot.range = 50;

    const beamHeight = TRUSS_HEIGHT - 1.5;
    const beam = MeshBuilder.CreateCylinder(`trussBeam${i}`, { diameterTop: 0.3, diameterBottom: 13, height: beamHeight, tessellation: 10 }, scene);
    beam.position.set(x + dir.x * beamHeight * 0.5, TRUSS_HEIGHT - beamHeight * 0.5, z + dir.z * beamHeight * 0.5);
    const up = Vector3.Up();
    const axis = Vector3.Cross(up, dir);
    if (axis.length() > 0.0001) {
      const rotAngle = Math.acos(Vector3.Dot(up, dir));
      beam.rotationQuaternion = Quaternion.RotationAxis(axis.normalize(), rotAngle);
    }
    beam.isPickable = false;
    beamPartsByColor[colorIdx].push(beam);
  }

  const mergedStructure = mergeOrFirst(structureParts);
  mergedStructure.name = "trussStructureMerged";
  mergedStructure.material = poleMat;
  mergedStructure.isPickable = false;

  lampPartsByColor.forEach((parts, idx) => {
    if (parts.length === 0) return;
    const merged = mergeOrFirst(parts);
    merged.name = `trussLampMerged${idx}`;
    merged.material = lampMats[idx];
    merged.isPickable = false;
  });

  beamPartsByColor.forEach((parts, idx) => {
    if (parts.length === 0) return;
    const merged = mergeOrFirst(parts);
    merged.name = `trussBeamMerged${idx}`;
    merged.material = beamMats[idx];
    merged.isPickable = false;
  });
}

export function buildStadium(scene: Scene): void {
  buildRetainingWall(scene);
  buildBleachersAndCrowd(scene);
  buildLightTrusses(scene);
  buildFloorEmblem(scene);
  buildPulseRing(scene);
}
