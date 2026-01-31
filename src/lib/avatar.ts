/**
 * VRM Avatar loader + controller.
 * Loads a VRM file using @pixiv/three-vrm.
 * Falls back to a clean "no avatar" state if file is missing.
 * Exposes setMouth(), idle blink, head sway, breathing.
 *
 * Optimisations:
 * - Global ArrayBuffer cache (same file never fetched twice)
 * - "preview" quality mode for non-interactive instances (hero)
 * - Capped pixel ratio & shadow map sizes
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  VRMLoaderPlugin,
  VRM,
  VRMExpressionPresetName,
} from "@pixiv/three-vrm";

export type AvatarState = "loading" | "ready" | "missing" | "error";
export type AvatarQuality = "full" | "preview";

/* loading done inline in AvatarController.loadVRM */

/* ─── Avatar Controller ─────────────────────────────────── */

export class AvatarController {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private clock = new THREE.Clock();

  vrm: VRM | null = null;
  state: AvatarState = "loading";
  onStateChange?: (s: AvatarState) => void;

  private animFrameId = 0;
  private disposed = false;
  private quality: AvatarQuality;

  // Mouth value 0..1
  private mouthTarget = 0;
  private mouthCurrent = 0;

  // Blink
  private blinkTimer = 3;
  private isBlinking = false;
  private blinkValue = 0;

  // Speaking animation state
  private isSpeaking = false;
  private speakTime = 0;
  private speakAmplitude = 0;

  initError: string | null = null;
  private isVRM0 = false;

  private vrmPath: string;

  constructor(
    canvas: HTMLCanvasElement,
    vrmPath = "/avatars/avatar.vrm",
    quality: AvatarQuality = "full",
  ) {
    this.vrmPath = vrmPath;
    this.quality = quality;

    // Scene
    this.scene = new THREE.Scene();

    // Camera (default, will be overridden)
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

    // Renderer
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: quality === "full",
        alpha: false,
        powerPreference: quality === "preview" ? "low-power" : "high-performance",
      });
    } catch (e) {
      this.initError = `WebGL not available: ${e instanceof Error ? e.message : e}`;
      this.renderer = null as unknown as THREE.WebGLRenderer;
      this.setState("error");
      return;
    }

    // Gradient background
    const bgCanvas = document.createElement("canvas");
    bgCanvas.width = 2;
    bgCanvas.height = 256;
    const ctx = bgCanvas.getContext("2d")!;
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, "#1a1a3e");
    grad.addColorStop(0.5, "#16162e");
    grad.addColorStop(1, "#0d0d1a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 2, 256);
    const bgTexture = new THREE.CanvasTexture(bgCanvas);
    this.scene.background = bgTexture;

    // Camera
    this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(0, 1.35, 1.8);
    this.camera.lookAt(0, 1.25, 0);

    // Renderer setup — quality-dependent
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    const maxDPR = quality === "preview" ? 1 : Math.min(window.devicePixelRatio, 1.5);
    this.renderer.setPixelRatio(maxDPR);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    if (quality === "full") {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    } else {
      this.renderer.shadowMap.enabled = false;
    }

    // Lights
    const hemi = new THREE.HemisphereLight(0xc8c0ff, 0x444466, 0.8);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffeedd, 1.5);
    key.position.set(2, 3, 3);
    if (quality === "full") {
      key.castShadow = true;
      key.shadow.mapSize.set(512, 512);
      key.shadow.camera.near = 0.1;
      key.shadow.camera.far = 10;
      key.shadow.bias = -0.002;
    }
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0x8888ff, 0.5);
    fill.position.set(-2, 2, 1);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffffff, 0.4);
    rim.position.set(0, 2, -2);
    this.scene.add(rim);

    // Floor disc
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(1.5, quality === "preview" ? 16 : 32),
      new THREE.MeshStandardMaterial({
        color: 0x1a1a2e,
        roughness: 0.9,
        metalness: 0,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    if (quality === "full") floor.receiveShadow = true;
    this.scene.add(floor);

    // OrbitControls
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.set(0, 1.25, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 4;
    this.controls.enablePan = false;
    if (quality === "preview") {
      this.controls.enableZoom = false;
      this.controls.enableRotate = false;
    }
    this.controls.update();

    this.loadVRM();
    this.animate();
  }

  private async loadVRM() {
    try {
      console.log("[Avatar] Loading VRM:", this.vrmPath);
      const loader = new GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));
      const gltf = await loader.loadAsync(this.vrmPath);
      console.log("[Avatar] GLTF loaded, userData keys:", Object.keys(gltf.userData));
      const vrm = gltf.userData.vrm as VRM | undefined;
      if (!vrm) throw new Error("No VRM data in file");
      console.log("[Avatar] VRM created, meta:", JSON.stringify(vrm.meta));

      if (this.disposed) return;

      // VRM 0.x faces +Z → needs PI rotation. VRM 1.0 faces -Z already.
      this.isVRM0 = this.detectVRM0(vrm);
      console.log("[Avatar] isVRM0:", this.isVRM0);
      if (this.isVRM0) {
        vrm.scene.rotation.y = Math.PI;
      }

      if (this.quality === "full") {
        vrm.scene.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
          }
        });
      }

      this.scene.add(vrm.scene);
      this.vrm = vrm;

      this.setRestPose();
      this.frameCamera();
      this.setState("ready");
    } catch (err: unknown) {
      if (this.disposed) return;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("404") || msg.includes("Failed to load") || msg.includes("fetch")) {
        this.setState("missing");
      } else {
        console.error("VRM load error:", err);
        this.setState("error");
      }
    }
  }

  /** Detect VRM 0.x (faces +Z) vs VRM 1.0 (faces -Z) */
  private detectVRM0(vrm: VRM): boolean {
    // @pixiv/three-vrm sets meta.metaVersion = "0" for VRM 0.x, "1" for VRM 1.0
    // But some versions use different fields. Check multiple signals:
    const meta = vrm.meta as unknown as Record<string, unknown> | undefined;
    if (!meta) return true; // assume 0.x if no meta

    // VRM 1.0 meta has "authors" (array), VRM 0.x has "author" (string)
    if ("authors" in meta) return false;  // VRM 1.0
    if ("author" in meta) return true;    // VRM 0.x

    // Fallback: check metaVersion
    const ver = meta.metaVersion;
    if (ver === "1" || ver === 1) return false;
    return true;
  }

  /** Lower arms from T-pose into a natural rest position */
  private setRestPose() {
    if (!this.vrm?.humanoid) return;
    const h = this.vrm.humanoid;

    // VRM 0.x and 1.0 have different bone conventions.
    // VRM 0.x: positive Z on left = DOWN, negative Z on right = DOWN
    // VRM 1.0: negative Z on left = DOWN, positive Z on right = DOWN
    const sign = this.isVRM0 ? 1 : -1;

    const leftUpperArm = h.getNormalizedBoneNode("leftUpperArm");
    if (leftUpperArm) {
      leftUpperArm.rotation.z = sign * 1.2;
    }

    const rightUpperArm = h.getNormalizedBoneNode("rightUpperArm");
    if (rightUpperArm) {
      rightUpperArm.rotation.z = sign * -1.2;
    }

    // Lower arms: slight bend inward
    const leftLowerArm = h.getNormalizedBoneNode("leftLowerArm");
    if (leftLowerArm) {
      leftLowerArm.rotation.y = 0.25;
    }
    const rightLowerArm = h.getNormalizedBoneNode("rightLowerArm");
    if (rightLowerArm) {
      rightLowerArm.rotation.y = -0.25;
    }
  }

  private frameCamera() {
    if (!this.vrm) return;
    const head = this.vrm.humanoid?.getNormalizedBoneNode("head");
    if (head) {
      const pos = new THREE.Vector3();
      head.getWorldPosition(pos);
      this.camera.position.set(pos.x, pos.y + 0.05, pos.z + 0.9);
      this.camera.lookAt(pos.x, pos.y - 0.02, pos.z);
      if (this.controls) {
        this.controls.target.set(pos.x, pos.y - 0.02, pos.z);
        this.controls.update();
      }
    }
  }

  private setState(s: AvatarState) {
    this.state = s;
    this.onStateChange?.(s);
  }

  /** Set mouth openness 0..1 */
  setMouth(v: number) {
    this.mouthTarget = Math.max(0, Math.min(1, v));
  }

  /** Update speaking animation state */
  setSpeaking(active: boolean, time: number, amplitude: number) {
    this.isSpeaking = active;
    this.speakTime = time;
    this.speakAmplitude = amplitude;
  }

  private animate = () => {
    if (this.disposed) return;
    this.animFrameId = requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const t = this.clock.getElapsedTime();

    if (this.vrm) {
      // ─── Mouth ───
      this.mouthCurrent += (this.mouthTarget - this.mouthCurrent) * 0.5;
      const em = this.vrm.expressionManager;
      if (em) {
        em.setValue(VRMExpressionPresetName.Aa, this.mouthCurrent);
      }

      // ─── Blink ───
      this.blinkTimer -= delta;
      if (!this.isBlinking && this.blinkTimer <= 0) {
        this.isBlinking = true;
        this.blinkValue = 0;
      }
      if (this.isBlinking) {
        this.blinkValue += delta * 12;
        const v = Math.sin(this.blinkValue);
        if (em) em.setValue(VRMExpressionPresetName.Blink, Math.max(0, v));
        if (this.blinkValue > Math.PI) {
          this.isBlinking = false;
          if (em) em.setValue(VRMExpressionPresetName.Blink, 0);
          this.blinkTimer = 2 + Math.random() * 5;
        }
      }

      // ─── Head animation ───
      const head = this.vrm.humanoid?.getNormalizedBoneNode("head");
      if (head) {
        if (this.isSpeaking && this.quality === "full") {
          const st = this.speakTime;
          const amp = this.speakAmplitude;
          head.rotation.y = Math.sin(t * 0.4) * 0.06
            + Math.sin(st * 2.1) * 0.05
            + Math.sin(st * 3.7) * amp * 0.08;
          head.rotation.x = Math.sin(t * 0.3) * 0.03
            + Math.sin(st * 1.8) * 0.04
            + amp * -0.06;
          head.rotation.z = Math.sin(t * 0.6) * 0.015
            + Math.sin(st * 2.5) * 0.025;
        } else {
          // Idle sway
          head.rotation.y = Math.sin(t * 0.4) * 0.06;
          head.rotation.x = Math.sin(t * 0.3) * 0.03;
          head.rotation.z = Math.sin(t * 0.6) * 0.015;
        }
      }

      // ─── Spine / upper body (full quality only) ───
      if (this.quality === "full") {
        const spine = this.vrm.humanoid?.getNormalizedBoneNode("spine");
        if (spine) {
          if (this.isSpeaking) {
            const st = this.speakTime;
            const amp = this.speakAmplitude;
            spine.rotation.x = Math.sin(t * 1.2) * 0.008
              + Math.sin(st * 1.4) * 0.012;
            spine.rotation.y = Math.sin(st * 0.9) * 0.02
              + amp * Math.sin(st * 2.3) * 0.015;
            spine.rotation.z = Math.sin(st * 0.7) * 0.008;
          } else {
            spine.rotation.x = Math.sin(t * 1.2) * 0.008;
            spine.rotation.y = 0;
            spine.rotation.z = 0;
          }
        }

        // Shoulder micro-movement when speaking (skip — rest pose is additive
        // and we don't want to override it during speech)

      }

      this.vrm.update(delta);
    }

    if (this.controls) this.controls.update();
    if (this.renderer) this.renderer.render(this.scene, this.camera);
  };

  resize(w: number, h: number) {
    if (!this.renderer) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.animFrameId);
    if (this.controls) this.controls.dispose();
    if (this.renderer) this.renderer.dispose();
    if (this.vrm) {
      this.scene.remove(this.vrm.scene);
    }
  }
}
