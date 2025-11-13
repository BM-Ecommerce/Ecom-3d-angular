import { Injectable, ElementRef, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

@Injectable({
  providedIn: 'root'
})
export class ThreeService implements OnDestroy {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private camera2d!: THREE.OrthographicCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private canvasEl: HTMLCanvasElement | null = null;

  private readonly onCanvasMouseDown = () => {
    this.canvasEl?.classList.remove('grab');
    this.canvasEl?.classList.add('grabbing');
  };
  private readonly onCanvasMouseUp = () => {
    this.canvasEl?.classList.remove('grabbing');
    this.canvasEl?.classList.add('grab');
  };
  private readonly onCanvasMouseLeave = () => {
    this.canvasEl?.classList.remove('grabbing');
    this.canvasEl?.classList.add('grab');
  };

  private textureLoader = new THREE.TextureLoader();
  private gltfLoader = new GLTFLoader();

  private cube2Mesh!: THREE.Mesh;
  private frameMesh!: THREE.Mesh;
  private cube4Mesh!: THREE.Mesh;
  public cube5Meshes: THREE.Mesh[] = [];
  private cube3Mesh!: THREE.Mesh;
  private backgroundMesh!: THREE.Mesh;
  private textureMaterial?: THREE.MeshStandardMaterial;
  private cubeMesh!: THREE.Mesh;
  private initialCameraPosition!: THREE.Vector3;
  private initialControlsTarget!: THREE.Vector3;

  // Animation-related
  private mixer?: THREE.AnimationMixer;
  private clock = new THREE.Clock();
  private rollerAction?: THREE.AnimationAction | null = null;
  private actions?: { [key: string]: THREE.AnimationAction };
  public isAnimateOpen: boolean = false;

  public fitMode: 'contain' | 'cover' | 'stretch' = 'cover';

  public alignX: 'left' | 'center' | 'right' = 'center';
  public alignY: 'top' | 'center' | 'bottom' = 'center';
  public offsetU = 0;
  public offsetV = 0;

  public flipV = false;
  private zoomCamera!: THREE.OrthographicCamera;
  private mouseX = 0;
  private mouseY = 0;
  private isZooming = false;
  private readonly lensRadius = 100;
  private readonly zoomFactor = 4;

  private animationFrameId?: number;

  // Added: lighting references (so they can be adjusted if needed)
  private directionalLight?: THREE.DirectionalLight;
  private ambientLight?: THREE.AmbientLight;
  private fillLight?: THREE.PointLight;

  constructor() { }

  ngOnDestroy(): void {
    this.resetState();
  }

  private resetState(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }

    if (this.renderer) {
      try { this.renderer.dispose(); } catch { /* ignore */ }
    }

    if (this.textureMaterial) {
      try { this.textureMaterial.dispose(); } catch { /* ignore */ }
    }

    if (this.controls) {
      try { this.controls.dispose(); } catch { /* ignore */ }
    }

    if (this.canvasEl) {
      this.canvasEl.removeEventListener('mousedown', this.onCanvasMouseDown);
      this.canvasEl.removeEventListener('mouseup', this.onCanvasMouseUp);
      this.canvasEl.removeEventListener('mouseleave', this.onCanvasMouseLeave);
      this.canvasEl.classList.remove('grab', 'grabbing');
      this.canvasEl = null;
    }

    if (this.mixer) {
      // stop any actions and release mixer
      try {
        this.mixer.stopAllAction();
      } catch { /* ignore */ }
      this.mixer = undefined;
    }

    // remove lights if present
    try {
      if (this.directionalLight) this.scene.remove(this.directionalLight);
      if (this.ambientLight) this.scene.remove(this.ambientLight);
      if (this.fillLight) this.scene.remove(this.fillLight);
    } catch { /* ignore */ }

    this.scene = new THREE.Scene();
    this.camera = null!;
    this.camera2d = null!;
    this.zoomCamera = null!;
    this.controls = null!;
    this.cube2Mesh = null!;
    this.frameMesh = null!;
    this.cube4Mesh = null!;
    this.cube5Meshes = [];
    this.cube3Mesh = null!;
    this.backgroundMesh = null!;
    this.textureMaterial = undefined;
    this.cubeMesh = null!;
    this.initialCameraPosition = null!;
    this.initialControlsTarget = null!;
    this.mouseX = 0;
    this.mouseY = 0;
    this.isZooming = false;
    this.rollerAction = null;
    this.clock = new THREE.Clock();
  }

  // ------------------------------------------------------
  // initialize: sets up scene, camera, renderer, controls
  // ------------------------------------------------------
  public initialize(canvas: ElementRef<HTMLCanvasElement>, container: HTMLElement): void {
    this.resetState();
    const width = container.clientWidth;
    const height = container.clientHeight;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xeeeeee);

    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.z = 5;

    this.canvasEl = canvas.nativeElement;

    this.canvasEl.classList.add('grab');

    this.canvasEl.addEventListener('mousedown', this.onCanvasMouseDown);
    this.canvasEl.addEventListener('mouseup', this.onCanvasMouseUp);
    this.canvasEl.addEventListener('mouseleave', this.onCanvasMouseLeave);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvasEl,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true
    });

    // --- SHADOWS: enable and set soft type ---
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.outputColorSpace = (THREE as any).SRGBColorSpace ?? THREE.SRGBColorSpace;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    this.initialCameraPosition = this.camera.position.clone();
    this.initialControlsTarget = this.controls.target.clone();

    this.controls.addEventListener('start', this.onCanvasMouseDown);
    this.controls.addEventListener('end', this.onCanvasMouseUp);

    // --- Dynamic lighting (brightened as requested) ---
    // Ambient light - soft global illumination (increased)
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.ambientLight);

    // Directional light - main sunlight (casts shadows) (increased)
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.3);
    this.directionalLight.position.set(5, 10, 5);
    this.directionalLight.castShadow = true;

    // Shadow quality
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 100;
    const d = 15;
    (this.directionalLight.shadow as any).camera.left = -d;
    (this.directionalLight.shadow as any).camera.right = d;
    (this.directionalLight.shadow as any).camera.top = d;
    (this.directionalLight.shadow as any).camera.bottom = -d;

    this.scene.add(this.directionalLight);

    // Fill light to soften shadows (slightly brighter)
    this.fillLight = new THREE.PointLight(0xffffff, 0.35);
    this.fillLight.position.set(-5, 5, -5);
    this.fillLight.castShadow = false;
    this.scene.add(this.fillLight);

    this.animate();
  }

  public zoomIn(): void {
    if (this.controls) {
      const factor = 0.9; // <1 to zoom in
      const camera = this.controls.object;
      camera.position.multiplyScalar(factor);
      this.controls.update();
    }
  }

  public zoomOut(): void {
    if (this.controls) {
      const factor = 1.1; // >1 to zoom out
      const camera = this.controls.object;
      camera.position.multiplyScalar(factor);
      this.controls.update();
    }
  }

  type!: string;
  public loadGltfModel(gltfUrl: string, type: string): void {
    this.type = type;
    this.gltfLoader.load(
      gltfUrl,
      (gltf) => {
        this.scene.add(gltf.scene);

        // If animations exist, setup mixer and actions
        if (gltf.animations && gltf.animations.length > 0) {
          this.mixer = new THREE.AnimationMixer(gltf.scene);
          console.log(gltf.animations.length);
          if (gltf.animations.length === 2) {
            const clip = gltf.animations[0];
            this.rollerAction = this.mixer.clipAction(clip);
            this.rollerAction.clampWhenFinished = true;
            this.rollerAction.loop = THREE.LoopOnce;
            this.actions = undefined;
          } else {
            this.actions = {};
            this.rollerAction = undefined;

            gltf.animations.forEach((clip) => {
              const action = this.mixer!.clipAction(clip);
              action.loop = THREE.LoopOnce;
              action.clampWhenFinished = true;
              this.actions![clip.name] = action;
            });
          }
        } else {
          this.mixer = undefined;
          this.rollerAction = null;
          console.warn('ThreeService: no animations found in GLTF.');
        }

        // Traverse scene: set materials, enable shadows, detect named meshes
        gltf.scene.traverse((child) => {
          if ((child as any).isMesh) {
            const mesh = child as THREE.Mesh;

            // Ensure using MeshStandardMaterial so lighting affects material
            // If model already has a material, try to preserve it but convert to standard where possible
            let mat = mesh.material as any;
            if (!mat || mat.isMeshBasicMaterial) {
              // Replace non-PBR/basic with a standard material to react to lights
              mesh.material = new THREE.MeshStandardMaterial({ color: 0xffffff });
            } else if (mat.isMeshStandardMaterial) {
              // ok: use existing
            } else {
              // convert if possible: fallback to MeshStandardMaterial using map if present
              const map = mat.map ?? null;
              mesh.material = new THREE.MeshStandardMaterial({
                map,
                color: mat.color ? (mat.color as THREE.Color).getHex() : 0xffffff
              });
            }

            // --- MAKE MESH CAST/RECEIVE SHADOWS ---
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            // small material tweaks for parts likely metal/plastic
            if ((mesh.name && /Rod|Metal|Frame|Tube|Cylinder/i.test(mesh.name))) {
              const m = mesh.material as THREE.MeshStandardMaterial;
              m.metalness = 0.7;
              m.roughness = 0.2;
              m.needsUpdate = true;
            } else {
              const m = mesh.material as THREE.MeshStandardMaterial;
              m.metalness = m.metalness ?? 0.0;
              m.roughness = m.roughness ?? 0.6;
              m.needsUpdate = true;
            }

            if (type === 'rollerblinds') {
              if (mesh.name.startsWith('Cylinder032') || mesh.name.startsWith('Cylinder027') || mesh.name.startsWith('Cylinder028')) {
                this.cube5Meshes.push(mesh);
              }
            } else if (type === 'venetian') {
              if (mesh.name.startsWith('Cube')) {
                mesh.material = new THREE.MeshStandardMaterial({ color: 0xffffff });
                (mesh.material as THREE.Material).needsUpdate = true;
              } else if (mesh.name.startsWith('Cylinder')) {
                this.cube5Meshes.push(mesh);
              }
            } else if (type === 'vertical') {
              if (mesh.name.startsWith('Cylinder') && !mesh.name.startsWith('Cylinder024') && !mesh.name.startsWith('Cylinder025') && !mesh.name.startsWith('Cylinder026')) {
                this.cube5Meshes.push(mesh);
              }
            } else {
              const parent = mesh.parent;
              const grandParent = parent?.parent;
              if (parent && grandParent && grandParent.name === 'Cube_5') {
                const index = parent.children.indexOf(child);
                if (index === 1) {
                  this.cube5Meshes.push(mesh);
                } else {
                  mesh.material = new THREE.MeshStandardMaterial({ color: 0x000000 });
                  (mesh.material as THREE.Material).needsUpdate = true;
                }
              }

              if (mesh.name === 'Cube_4') {
                this.cube4Mesh = mesh;
              } else if (mesh.name === 'Cube_3') {
                this.cube3Mesh = mesh;
              } else if (mesh.name === 'Cube_2') {
                this.cube2Mesh = mesh;
              } else if (mesh.name === 'Cube') {
                this.cubeMesh = mesh;
              }
            }
          }
        });

        // If texture material exists (previously applied), reassign it to found meshes
        if (this.textureMaterial && this.cube5Meshes.length > 0) {
          this.cube5Meshes.forEach((mesh) => {
            // dispose old
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((mat) => (mat as any).dispose && (mat as any).dispose());
            } else {
              (mesh.material as any).dispose && (mesh.material as any).dispose();
            }
            mesh.material = this.textureMaterial!;
            (mesh.material as THREE.Material).needsUpdate = true;

            // make sure shadows are still on
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          });
        }

        // Auto framing & camera adjustments
        try {
          const bbox = new THREE.Box3().setFromObject(gltf.scene);
          const size = bbox.getSize(new THREE.Vector3());
          const center = bbox.getCenter(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const safeMax = maxDim > 0 ? maxDim : 1;
          gltf.scene.position.x += -center.x;
          gltf.scene.position.y += -center.y;
          gltf.scene.position.z += -center.z;

          if (this.camera && this.camera.isPerspectiveCamera) {
            const fov = this.camera.fov * (Math.PI / 180);
            const aspect = this.camera.aspect;
            const distance = safeMax / (2 * Math.tan(fov / 2));
            const framingMultiplier = 1.45;
            this.camera.position.set(0, 0, distance * framingMultiplier);
            this.camera.near = Math.max(0.01, safeMax / 1000);
            this.camera.far = Math.max(1000, safeMax * 100);
            this.camera.updateProjectionMatrix();

            if (this.controls) {
              this.controls.target.set(0, 0, 0);
              this.controls.update();
              const fitDist = distance * framingMultiplier;
              this.controls.minDistance = Math.max(0.1, fitDist * 0.5);
              this.controls.maxDistance = Math.max(10, fitDist * 5);
            }

            this.initialCameraPosition = this.camera.position.clone();
            this.initialControlsTarget = this.controls ? this.controls.target.clone() : new THREE.Vector3(0, 0, 0);
          }
        } catch (err) {
          console.warn('Auto-framing failed: ', err);
        }

        // Ensure roller state is set
        this.setRollerState(true);

        // Reapply textureMaterial again if needed
        if (this.textureMaterial && this.cube5Meshes.length > 0) {
          this.cube5Meshes.forEach((mesh) => {
            mesh.material = this.textureMaterial!;
            (mesh.material as THREE.Material).needsUpdate = true;
          });
        }
      },
      undefined,
      (error) => {
        console.error(error);
      }
    );
  }

  public openAnimate(loopCount: number = 1): void {
    if (!this.mixer || this.isAnimateOpen) return;

    const playAction = (action: THREE.AnimationAction) => {
      action.stop();
      action.enabled = true;
      action.timeScale = 1;
      action.reset();
      action.setLoop(loopCount > 1 ? THREE.LoopRepeat : THREE.LoopOnce, loopCount - 1);
      action.clampWhenFinished = true;
      action.play();
    };

    if (this.rollerAction) {
      playAction(this.rollerAction);
    } else if (this.actions && Object.keys(this.actions).length > 0) {
      Object.values(this.actions).forEach(playAction);
    }

    this.isAnimateOpen = true;
    this.updateButtonStates();
  }

  public closeAnimate(instant: boolean = false): void {
    if (!this.mixer || !this.isAnimateOpen) return;

    const reverseAction = (action: THREE.AnimationAction) => {
      const clip = action.getClip();
      const duration = clip.duration ?? 0;

      action.stop();
      action.enabled = true;

      if (instant) {
        // Instantly jump to closed position (end frame)
        action.time = 0;
        this.mixer?.update(0);
        action.play();
        action.stop(); // stop immediately after jump
      } else {
        // Play reverse animation smoothly
        action.time = duration;
        this.mixer?.update(0);
        action.timeScale = -1;
        action.setLoop(THREE.LoopOnce, 0);
        action.clampWhenFinished = true;
        action.play();
      }
    };

    if (this.rollerAction) {
      reverseAction(this.rollerAction);
    } else if (this.actions && Object.keys(this.actions).length > 0) {
      Object.values(this.actions).forEach(reverseAction);
    }

    this.isAnimateOpen = false;
    this.updateButtonStates();
  }

  public toggleAnimate(loopCount: number = 1): void {
    if (!this.mixer) return;
    console.log(this.isAnimateOpen);
    this.isAnimateOpen ? this.closeAnimate() : this.openAnimate(loopCount);
  }

  public loopAnimate(loopCount: number = Infinity): void {

    if (!this.mixer) return;

    const loopAction = (action: THREE.AnimationAction) => {
      action.stop();
      action.enabled = true;
      action.timeScale = 1;
      action.reset();

      // 🔁 Ping-pong loop: plays forward, then backward automatically
      action.setLoop(THREE.LoopPingPong, Infinity);
      action.clampWhenFinished = false;
      action.play();
    };

    if (this.rollerAction) {
      loopAction(this.rollerAction);
    } else if (this.actions && Object.keys(this.actions).length > 0) {
      Object.values(this.actions).forEach(loopAction);
    }

    this.isAnimateOpen = true;
    this.updateButtonStates();
  }

  public stopAll(): void {
    if (this.rollerAction) this.rollerAction.stop();

    Object.values(this.actions ?? {}).forEach((a) => a.stop());
    this.isAnimateOpen = false;
    this.updateButtonStates();
  }

  public getCanvasDataURL(): string | undefined {
    if (!this.renderer) {
      return undefined;
    }
    this.render();
    return this.renderer.domElement.toDataURL('image/png');
  }

  private updateButtonStates(): void {
    // If you have direct references to buttons
    // if (this.openButton && this.closeButton) {
    //   this.openButton.disabled = this.isAnimateOpen;
    //   this.closeButton.disabled = !this.isAnimateOpen;
    // }

    // Or if you're using template references, emit events or use a service
    console.log(`Roller is now ${this.isAnimateOpen ? 'OPEN' : 'CLOSED'}`);
  }

  public setRollerState(isOpen: boolean): void {
    this.isAnimateOpen = isOpen;
    this.updateButtonStates();
  }

  public initialize2d(canvas: ElementRef<HTMLCanvasElement>, container: HTMLElement): void {
    this.resetState();

    const width = container.clientWidth;
    const height = container.clientHeight;

    this.scene = new THREE.Scene();

    const left = width / -2;
    const right = width / 2;
    const top = height / 2;
    const bottom = height / -2;

    this.camera2d = new THREE.OrthographicCamera(left, right, top, bottom, 0.1, 1000);
    this.camera2d.position.z = 10;

    this.zoomCamera = this.camera2d.clone();

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas.nativeElement,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.animate();
  }

  public createObjects(frameUrl: string, backgroundUrl: string): void {
    if (this.frameMesh) this.scene.remove(this.frameMesh);
    if (this.backgroundMesh) this.scene.remove(this.backgroundMesh);

    const textureLoader = new THREE.TextureLoader();

    textureLoader.load(frameUrl, (frameTexture) => {
      frameTexture.colorSpace = THREE.SRGBColorSpace;

      const imgWidth = frameTexture.image.width;
      const imgHeight = frameTexture.image.height;
      const aspect = imgWidth / imgHeight;

      const canvas = this.renderer.domElement;
      const canvasAspect = canvas.clientWidth / canvas.clientHeight;

      let viewWidth: number, viewHeight: number;

      if (aspect > canvasAspect) {
        // Texture is wider than the canvas, so fit to width
        viewWidth = canvas.clientWidth;
        viewHeight = viewWidth / aspect;
      } else {
        // Texture is taller than or equal to the canvas aspect ratio, so fit to height
        viewHeight = canvas.clientHeight;
        viewWidth = viewHeight * aspect;
      }

      const frameGeometry = new THREE.PlaneGeometry(viewWidth, viewHeight);
      const frameMaterial = new THREE.MeshBasicMaterial({
        map: frameTexture,
        transparent: true,
        alphaTest: 0.1,
        depthWrite: false
      });
      this.frameMesh = new THREE.Mesh(frameGeometry, frameMaterial);
      this.frameMesh.position.z = 0;
      // Frame in 2D doesn't need to cast shadows; keep as not casting for 2D flow
      this.frameMesh.receiveShadow = false;
      this.frameMesh.castShadow = false;

      this.scene.add(this.frameMesh);

      if (backgroundUrl) {
        textureLoader.load(backgroundUrl, (bgTexture) => {
          bgTexture.colorSpace = THREE.SRGBColorSpace;

          const bgGeometry = new THREE.PlaneGeometry(viewWidth, viewHeight);
          const bgMaterial = new THREE.MeshBasicMaterial({
            map: bgTexture,
            transparent: false
          });
          this.backgroundMesh = new THREE.Mesh(bgGeometry, bgMaterial);
          this.backgroundMesh.position.z = -1;
          this.backgroundMesh.receiveShadow = false;
          this.backgroundMesh.castShadow = false;
          this.scene.add(this.backgroundMesh);

          // Fit background into transparent area of frame texture
          this.fitBackgroundToFrame(frameTexture, this.frameMesh, this.backgroundMesh);

          this.render();
        });
      } else {
        this.render();
      }
    });
  }

  public updateTextures2d(frameUrl: string, backgroundUrl: string): void {
    const textureLoader = new THREE.TextureLoader();

    textureLoader.load(frameUrl, (frameTexture) => {
      frameTexture.colorSpace = THREE.SRGBColorSpace;

      const imgWidth = frameTexture.image.width;
      const imgHeight = frameTexture.image.height;
      const aspect = imgWidth / imgHeight;

      const canvas = this.renderer.domElement;
      const canvasAspect = canvas.clientWidth / canvas.clientHeight;

      let viewWidth: number, viewHeight: number;

      if (aspect > canvasAspect) {
        viewWidth = canvas.clientWidth;
        viewHeight = viewWidth / aspect;
      } else {
        viewHeight = canvas.clientHeight;
        viewWidth = viewHeight * aspect;
      }

      if (this.frameMesh) {
        this.scene.remove(this.frameMesh);
        this.frameMesh.geometry.dispose();
        (this.frameMesh.material as THREE.Material).dispose();
      }

      const frameGeometry = new THREE.PlaneGeometry(viewWidth, viewHeight);
      const frameMaterial = new THREE.MeshBasicMaterial({
        map: frameTexture,
        transparent: true,
        alphaTest: 0.1,
        depthWrite: false
      });
      this.frameMesh = new THREE.Mesh(frameGeometry, frameMaterial);
      this.frameMesh.position.z = 0;
      this.scene.add(this.frameMesh);

      if (backgroundUrl) {
        textureLoader.load(backgroundUrl, (bgTexture) => {
          bgTexture.colorSpace = THREE.SRGBColorSpace;

          if (this.backgroundMesh) {
            this.scene.remove(this.backgroundMesh);
            this.backgroundMesh.geometry.dispose();
            (this.backgroundMesh.material as THREE.Material).dispose();
          }

          const bgGeometry = new THREE.PlaneGeometry(0.225 * viewWidth, 0.5341 * viewHeight);
          const bgMaterial = new THREE.MeshBasicMaterial({
            map: bgTexture,
            transparent: false
          });
          this.backgroundMesh = new THREE.Mesh(bgGeometry, bgMaterial);
          this.backgroundMesh.position.z = 0;
          this.scene.add(this.backgroundMesh);

          // Fit background into transparent area of frame texture (use new frameTexture)
          this.fitBackgroundToFrame(frameTexture, this.frameMesh, this.backgroundMesh);

          this.render();
        });
      } else {
        this.render();
      }
    });
  }

  public onResize(container: HTMLElement): void {
    const width = container.clientWidth;
    const height = container.clientHeight;

    if (this.renderer) {
      this.renderer.setSize(width, height, false);
    }

    if (this.camera?.isPerspectiveCamera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }

    if (this.camera2d?.isOrthographicCamera) {
      this.camera2d.left = width / -2;
      this.camera2d.right = width / 2;
      this.camera2d.top = height / 2;
      this.camera2d.bottom = height / -2;
      this.camera2d.updateProjectionMatrix();
    }

    const resizeMesh = (mesh: THREE.Mesh | undefined) => {
      if (!mesh) return;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      const tex = mat.map;
      if (!tex || !tex.image) return;

      const imgWidth = tex.image.width;
      const imgHeight = tex.image.height;
      const aspect = imgWidth / imgHeight;

      const canvasAspect = width / height;

      let viewWidth: number, viewHeight: number;

      if (aspect > canvasAspect) {
        viewWidth = width;
        viewHeight = viewWidth / aspect;
      } else {
        viewHeight = height;
        viewWidth = viewHeight * aspect;
      }

      mesh.geometry.dispose();
      mesh.geometry = new THREE.PlaneGeometry(viewWidth, viewHeight);
    };
    if (!this.camera2d) {
      resizeMesh(this.frameMesh);
      resizeMesh(this.backgroundMesh);
    }
    this.render();
  }

public updateTextures(backgroundUrl: string): void {
  if (!backgroundUrl) return;

  // Force reload (bypass cache)
  const urlWithCacheBust = `${backgroundUrl}?t=${Date.now()}`;

  this.textureLoader.load(
    urlWithCacheBust,
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
      texture.needsUpdate = true;

      // For venetian/vertical blinds - use specialized pattern application
      if (this.type === 'venetian' || this.type === 'vertical') {
        if (this.isAnimateOpen) {
          this.stopAll();
          this.closeAnimate(true);
          this.setRollerState(false);
          setTimeout(() => {
            this.applyPatternToVenetian(texture);
          }, 200);
        } else {
          this.applyPatternToVenetian(texture);
        }
        return;
      }

      // For other types - preserve original material properties
      if (this.cube5Meshes.length > 0) {
        this.cube5Meshes.forEach((mesh) => {
          if (!mesh.geometry.attributes['uv']) {
            this.generatePlanarUVs(mesh.geometry);
            console.warn(`${mesh.name}: generated missing UVs`);
          }

          // Get the original material properties before disposing
          const originalMaterial = mesh.material as THREE.MeshStandardMaterial;
          
          // Preserve original material properties for lighting
          const newMaterial = new THREE.MeshStandardMaterial({
            map: texture,
            // Preserve original lighting properties
            roughness: originalMaterial?.roughness ?? 0.7,
            metalness: originalMaterial?.metalness ?? 0.1,
            side: THREE.DoubleSide,
            // Preserve other important properties
            color: originalMaterial?.color ?? new THREE.Color(0xffffff),
            envMap: originalMaterial?.envMap,
            envMapIntensity: originalMaterial?.envMapIntensity,
            normalMap: originalMaterial?.normalMap,
            normalScale: originalMaterial?.normalScale,
            aoMap: originalMaterial?.aoMap,
            displacementMap: originalMaterial?.displacementMap
          });

          // Dispose old material
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat) => (mat as any).dispose?.());
          } else {
            (mesh.material as any)?.dispose?.();
          }

          mesh.material = newMaterial;
          (mesh.material as THREE.Material).needsUpdate = true;

          // Ensure shadows remain enabled
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        });

        this.textureMaterial = new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.7,
          metalness: 0.1,
          side: THREE.DoubleSide
        });

        this.render();
      } else {
        console.warn('No target meshes found for texture application.');
      }
    },
    undefined,
    (err) => {
      console.error('Texture load error:', err);
    }
  );
}

  private applyPatternToVenetian(texture: THREE.Texture, patternScale: number = 1): void {
  if (!this.cube5Meshes.length) return;

  // --- Texture Setup ---
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
  texture.needsUpdate = true;

  this.scene.updateMatrixWorld(true);

  // Collect slat bounds and original materials
  const slats = this.cube5Meshes.map(mesh => {
    const bbox = new THREE.Box3().setFromObject(mesh);
    const originalMaterial = mesh.material as THREE.MeshStandardMaterial;
    return { mesh, bbox, originalMaterial };
  });

  // ... rest of your existing bounds calculation code remains the same ...
  const globalMinX = Math.min(...slats.map(s => s.bbox.min.x));
  const globalMaxX = Math.max(...slats.map(s => s.bbox.max.x));
  const globalMinY = Math.min(...slats.map(s => s.bbox.min.y));
  const globalMaxY = Math.max(...slats.map(s => s.bbox.max.y));

  const totalWidth = globalMaxX - globalMinX;
  const totalHeight = globalMaxY - globalMinY;

  // ... rest of your UV calculation code remains the same ...
  const imgW = (texture.image as HTMLImageElement)?.width || 1;
  const imgH = (texture.image as HTMLImageElement)?.height || 1;
  const imageAspect = imgW / imgH;
  const blindsAspect = totalWidth / totalHeight;
  const aspectRatio = imageAspect / blindsAspect;

  const zoom = 1 / Math.max(1e-6, patternScale);
  let uScale = zoom;
  let vScale = zoom;

  switch (this.fitMode) {
    case 'contain':
      if (aspectRatio >= 1) vScale *= blindsAspect / imageAspect;
      else uScale *= imageAspect / blindsAspect;
      break;
    case 'cover':
      if (aspectRatio >= 1) uScale *= imageAspect / blindsAspect;
      else vScale *= blindsAspect / imageAspect;
      break;
    case 'stretch':
      break;
  }

  let uCenter = 0.5;
  let vCenter = 0.5;

  if (this.alignX === 'left') uCenter = 0.25;
  else if (this.alignX === 'right') uCenter = 0.75;

  if (this.alignY === 'top') vCenter = 0.75;
  else if (this.alignY === 'bottom') vCenter = 0.25;

  uCenter += this.offsetU;
  vCenter += this.offsetV;

  // --- Apply per slat with preserved material properties ---
  for (const { mesh, originalMaterial } of slats) {
    const geom = mesh.geometry as THREE.BufferGeometry;
    const pos = geom.attributes['position'] as THREE.BufferAttribute;
    const uvs = new Float32Array(pos.count * 2);

    for (let i = 0; i < pos.count; i++) {
      const vtx = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
      mesh.localToWorld(vtx);

      let u = (vtx.x - globalMinX) / totalWidth;
      let v = (vtx.y - globalMinY) / totalHeight;

      if (this.flipV) v = 1 - v;

      u = (u - 0.5) * uScale + uCenter;
      v = (v - 0.5) * vScale + vCenter;

      uvs[i * 2] = u;
      uvs[i * 2 + 1] = v;
    }

    geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geom.attributes['uv'].needsUpdate = true;

    // Dispose old material and apply new material with preserved properties
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(m => (m as any).dispose?.());
    } else {
      (mesh.material as any)?.dispose?.();
    }

    // Create new material while preserving original lighting properties
    mesh.material = new THREE.MeshStandardMaterial({
      map: texture,
      // Preserve original material properties for proper lighting
      roughness: originalMaterial?.roughness ?? 0.6,
      metalness: originalMaterial?.metalness ?? 0.1,
      side: THREE.DoubleSide,
      color: originalMaterial?.color ?? new THREE.Color(0xffffff),
      envMap: originalMaterial?.envMap,
      envMapIntensity: originalMaterial?.envMapIntensity
    });

    (mesh.material as THREE.Material).needsUpdate = true;

    // Ensure shadows remain enabled
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }

  console.log('✅ Venetian pattern applied with correct scaling, alignment, and preserved lighting properties');
}

  private generatePlanarUVs(geometry: THREE.BufferGeometry): void {
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox!;
    const size = new THREE.Vector3();
    bbox.getSize(size);

    const positions = geometry.attributes['position'];
    const uvs = new Float32Array(positions.count * 2);

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      // Avoid divide by zero if size.x or size.y is 0
      const u = size.x !== 0 ? (x - bbox.min.x) / size.x : 0;
      const v = size.y !== 0 ? (y - bbox.min.y) / size.y : 0;
      uvs[i * 2] = u;
      uvs[i * 2 + 1] = v;
    }

    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.attributes['uv'].needsUpdate = true;
  }

  public updateFrame(backgroundUrl: string): void {
    if (!backgroundUrl) return;

    const meshes = [this.cubeMesh, this.cube2Mesh, this.cube3Mesh];

    this.textureLoader.load(backgroundUrl, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      const newMaterial = new THREE.MeshStandardMaterial({
        map: texture
      });

      meshes.forEach((mesh) => {
        if (mesh) {
          mesh.material = newMaterial;
          (mesh.material as THREE.Material).needsUpdate = true;

          // keep shadows for frame pieces as needed
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      });
    });
  }

  public resetCamera(): void {
    if (this.camera && this.controls) {
      this.camera.position.copy(this.initialCameraPosition);
      this.controls.target.copy(this.initialControlsTarget);
      this.controls.update();
    }
  }

  public animate(): void {
    const loop = () => {
      if (this.controls) {
        this.controls.update();
      }

      // update mixer with clock delta
      if (this.mixer) {
        const delta = this.clock.getDelta();
        this.mixer.update(delta);
      }

      this.render();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    loop();
  }

  public setZoom(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
  }

  public enableZoom(enabled: boolean): void {
    this.isZooming = enabled;
  }

  private render(): void {
    if (!this.renderer || !this.scene) {
      return;
    }

    const activeCamera = this.camera2d || this.camera;
    if (!activeCamera) return;

    if (this.camera2d) {
      const width = this.renderer.domElement.clientWidth;
      const height = this.renderer.domElement.clientHeight;

      this.renderer.clear();
      this.renderer.setViewport(0, 0, width, height);
      this.renderer.setScissor(0, 0, width, height);
      this.renderer.setScissorTest(true);
      this.renderer.render(this.scene, this.camera2d);

      if (this.isZooming) {
        const lensX = this.mouseX;
        const lensY = this.mouseY;
        const lensRadius = this.lensRadius;

        const worldX = this.camera2d.left + (lensX / width) * (this.camera2d.right - this.camera2d.left);
        const worldY = this.camera2d.top - (lensY / height) * (this.camera2d.top - this.camera2d.bottom);

        const zoomSize = (this.camera2d.right - this.camera2d.left) / this.zoomFactor;

        this.zoomCamera.left = worldX - (zoomSize / 2);
        this.zoomCamera.right = worldX + (zoomSize / 2);
        this.zoomCamera.top = worldY + (zoomSize / 2);
        this.zoomCamera.bottom = worldY - (zoomSize / 2);
        this.zoomCamera.updateProjectionMatrix();

        const viewportX = lensX - lensRadius;
        const viewportY = height - lensY - lensRadius;

        this.renderer.setViewport(viewportX, viewportY, lensRadius * 2, lensRadius * 2);
        this.renderer.setScissor(viewportX, viewportY, lensRadius * 2, lensRadius * 2);
        this.renderer.setScissorTest(true);

        this.renderer.render(this.scene, this.zoomCamera);
      }
      this.renderer.setScissorTest(false);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * Detect transparent pixel bounding box in frame image
   * Returns bounds in image pixel space: { minX, minY, maxX, maxY, width, height }
   */
  private detectTransparentRegion(image: HTMLImageElement, alphaThreshold = 10) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    // We want the bounding box of transparent pixels (hole)
    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = 0;
    let maxY = 0;
    let foundAny = false;

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        const alpha = imgData[i + 3];

        if (alpha < alphaThreshold) {
          foundAny = true;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (!foundAny) {
      // No transparent pixels found — return full image as fallback (empty hole)
      return { minX: 0, minY: 0, maxX: image.width, maxY: image.height, width: image.width, height: image.height, found: false };
    }

    return { minX, minY, maxX, maxY, width: image.width, height: image.height, found: true };
  }

  /**
   * Fit background mesh to the transparent hole inside the frame texture
   */
  private fitBackgroundToFrame(frameTexture: THREE.Texture, frameMesh: THREE.Mesh, backgroundMesh: THREE.Mesh) {
    const img = frameTexture.image as HTMLImageElement;
    if (!img || !img.width || !img.height) {
      return;
    }

    // Detect transparent region in the image
    const hole = this.detectTransparentRegion(img, 40);
    if (!hole.found) {
      // nothing transparent -> place background behind entire frame
      // compute frame plane size:
      if (frameMesh.geometry) frameMesh.geometry.computeBoundingBox();
      const bbox = (frameMesh.geometry as any).boundingBox as THREE.Box3 | undefined;
      if (bbox) {
        const planeWidth = bbox.max.x - bbox.min.x;
        const planeHeight = bbox.max.y - bbox.min.y;
        // Replace background geometry to fit full plane
        if (backgroundMesh.geometry) backgroundMesh.geometry.dispose();
        backgroundMesh.geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
        backgroundMesh.position.set(frameMesh.position.x, frameMesh.position.y, frameMesh.position.z - 0.01);
      }
      return;
    }

    // Get frame plane size in local coordinates
    if (frameMesh.geometry) frameMesh.geometry.computeBoundingBox();
    const bbox = (frameMesh.geometry as any).boundingBox as THREE.Box3 | undefined;
    if (!bbox) return;

    const planeWidth = bbox.max.x - bbox.min.x;
    const planeHeight = bbox.max.y - bbox.min.y;

    // Pixel dimensions of detected hole
    const holePixelWidth = hole.maxX - hole.minX;
    const holePixelHeight = hole.maxY - hole.minY;
    const holeCenterX = (hole.minX + hole.maxX) / 2;
    const holeCenterY = (hole.minY + hole.maxY) / 2;

    // Map pixel sizes -> plane sizes
    const innerWidth = planeWidth * (holePixelWidth / hole.width);
    const innerHeight = planeHeight * (holePixelHeight / hole.height);

    // Compute center offset in plane coords:
    // image origin: top-left. plane origin: center (0,0) with Y up.
    const offsetXFromCenterPx = holeCenterX - (hole.width / 2);
    const offsetYFromCenterPx = (hole.height / 2) - holeCenterY; // invert Y

    const offsetX = (offsetXFromCenterPx / hole.width) * planeWidth;
    const offsetY = (offsetYFromCenterPx / hole.height) * planeHeight;

    // Apply geometry/scale and position to background mesh
    if (backgroundMesh.geometry) backgroundMesh.geometry.dispose();
    backgroundMesh.geometry = new THREE.PlaneGeometry(innerWidth, innerHeight);

    // Position background at computed center (relative to frameMesh)
    backgroundMesh.position.set(
      frameMesh.position.x + offsetX,
      frameMesh.position.y + offsetY,
      frameMesh.position.z - 0.01 // slightly behind to avoid z-fighting
    );

    backgroundMesh.updateMatrixWorld(true);
  }
}
