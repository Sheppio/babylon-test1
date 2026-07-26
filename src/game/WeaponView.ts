import {
  Color3,
  Mesh,
  MeshBuilder,
  type Scene,
  StandardMaterial,
  type UniversalCamera,
  Vector3,
} from "@babylonjs/core";

export class WeaponView {
  root: Mesh;
  private muzzleTip: Mesh;
  private bobTime = 0;
  private recoilAmount = 0;
  private baseLocalPos = new Vector3(0.32, -0.32, 0.75);

  constructor(scene: Scene, camera: UniversalCamera) {
    this.root = new Mesh("weaponRoot", scene);
    this.root.parent = camera;
    this.root.position.copyFrom(this.baseLocalPos);
    this.root.isPickable = false;

    const bodyMat = new StandardMaterial("gunBodyMat", scene);
    bodyMat.diffuseColor = new Color3(0.08, 0.09, 0.11);
    bodyMat.specularColor = new Color3(0.3, 0.3, 0.3);

    const accentMat = new StandardMaterial("gunAccentMat", scene);
    accentMat.diffuseColor = Color3.Black();
    accentMat.emissiveColor = new Color3(0.15, 0.75, 0.95);
    accentMat.specularColor = Color3.Black();

    const body = MeshBuilder.CreateBox("gunBody", { width: 0.11, height: 0.12, depth: 0.55 }, scene);
    body.material = bodyMat;
    body.parent = this.root;
    body.isPickable = false;

    const barrel = MeshBuilder.CreateCylinder("gunBarrel", { diameter: 0.045, height: 0.4, tessellation: 8 }, scene);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.01, 0.45);
    barrel.material = bodyMat;
    barrel.parent = this.root;
    barrel.isPickable = false;

    const grip = MeshBuilder.CreateBox("gunGrip", { width: 0.09, height: 0.22, depth: 0.1 }, scene);
    grip.position.set(0, -0.16, -0.12);
    grip.rotation.x = -0.25;
    grip.material = bodyMat;
    grip.parent = this.root;
    grip.isPickable = false;

    const stripe = MeshBuilder.CreateBox("gunStripe", { width: 0.03, height: 0.02, depth: 0.3 }, scene);
    stripe.position.set(0.06, 0.05, 0.15);
    stripe.material = accentMat;
    stripe.parent = this.root;
    stripe.isPickable = false;

    this.muzzleTip = MeshBuilder.CreateBox("muzzleTip", { size: 0.01 }, scene);
    this.muzzleTip.position.set(0, 0.01, 0.65);
    this.muzzleTip.parent = this.root;
    this.muzzleTip.isVisible = false;
    this.muzzleTip.isPickable = false;
  }

  getMuzzleWorldPosition(): Vector3 {
    return this.muzzleTip.getAbsolutePosition();
  }

  triggerRecoil(): void {
    this.recoilAmount = 1;
  }

  update(dt: number, moving: boolean, sprinting: boolean): void {
    const bobSpeed = sprinting ? 14 : moving ? 9 : 2.2;
    const bobAmountY = sprinting ? 0.028 : moving ? 0.018 : 0.006;
    const bobAmountX = sprinting ? 0.02 : moving ? 0.012 : 0.004;
    this.bobTime += dt * bobSpeed;

    this.recoilAmount = Math.max(0, this.recoilAmount - dt * 8);
    const recoilOffset = this.recoilAmount * 0.12;
    const recoilTilt = this.recoilAmount * 0.25;

    this.root.position.x = this.baseLocalPos.x + Math.sin(this.bobTime) * bobAmountX;
    this.root.position.y = this.baseLocalPos.y + Math.abs(Math.cos(this.bobTime)) * bobAmountY;
    this.root.position.z = this.baseLocalPos.z - recoilOffset;
    this.root.rotation.x = -recoilTilt;
    this.root.rotation.y = Math.sin(this.bobTime * 0.5) * 0.01;
  }
}
