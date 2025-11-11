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
  private isRollerOpen: boolean = false;


  // New properties for 2D zoom
  private zoomCamera!: THREE.OrthographicCamera;
  private mouseX = 0;
  private mouseY = 0;
  private isZooming = false;
  private readonly lensRadius = 100;
  private readonly zoomFactor = 4;

  private animationFrameId?: number;

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

  public initialize(canvas: ElementRef<HTMLCanvasElement>, container: HTMLElement): void {
    this.resetState();
    const width = container.clientWidth;
    const height = container.clientHeight;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);

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

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1).normalize();
    this.scene.add(directionalLight);

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


  public loadGltfModel(gltfUrl: string, type: string): void {
    this.gltfLoader.load(
      gltfUrl,
      (gltf) => {
  this.scene.add(gltf.scene);

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

  gltf.scene.traverse((child) => {
    if ((child as any).isMesh) {
      const mesh = child as THREE.Mesh;

      if (type === 'rollerblinds') {
        console.log(mesh);
        if (mesh.name.startsWith('Cylinder') || mesh.name.startsWith('Cube')) {
          this.cube5Meshes.push(mesh);
        }
      } else if (type === 'venetian') {
        if (mesh.name.startsWith('Cylinder') || mesh.name.startsWith('Cube')) {
          mesh.material = new THREE.MeshStandardMaterial({ color: 0xffffff });
          (mesh.material as THREE.Material).needsUpdate = true;
        } else if (mesh.name.startsWith('Boolean')) {
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

  if (this.textureMaterial && this.cube5Meshes.length > 0) {
    this.cube5Meshes.forEach((mesh) => {
      mesh.material = this.textureMaterial!;
      (mesh.material as THREE.Material).needsUpdate = true;
    });
  }

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
        const framingMultiplier = 1.15; 
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
        this.initialControlsTarget = this.controls ? this.controls.target.clone() : new THREE.Vector3(0,0,0);
      }
    } catch (err) {
      console.warn('Auto-framing failed: ', err);
    }

    this.setRollerState(true);
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

 public openRoller(): void {
  if (!this.mixer || this.isRollerOpen) return; // Prevent opening if already open

  if (this.rollerAction) {
    // Single animation approach
    const action = this.rollerAction;
    action.stop();
    action.enabled = true;
    action.timeScale = 1;
    action.reset();
    action.play();
    this.isRollerOpen = true;
    this.updateButtonStates();
  } else if (this.actions && Object.keys(this.actions).length > 0) {
    // Multiple animations approach
    Object.values(this.actions).forEach((action) => {
      action.stop();
      action.enabled = true;
      action.timeScale = 1;
      action.reset();
      action.play();
    });
    this.isRollerOpen = true;
    this.updateButtonStates();
  }
}



  public closeRoller(): void {
  if (!this.mixer || !this.isRollerOpen) return; // Prevent closing if already closed

  if (this.rollerAction) {
    const action = this.rollerAction;
    const clip = action.getClip();
    const duration = clip.duration ?? 0;

    action.stop();
    action.enabled = true;
    action.time = duration;
    this.mixer.update(0);
    action.timeScale = -1;
    action.play();
    this.isRollerOpen = false;
    this.updateButtonStates();
  } else if (this.actions && Object.keys(this.actions).length > 0) {
    Object.values(this.actions).forEach((action) => {
      const clip = action.getClip();
      const duration = clip.duration ?? 0;

      action.stop();
      action.enabled = true;
      action.time = duration;
      this.mixer?.update(0);
      action.timeScale = -1;
      action.play();
    });
    this.isRollerOpen = false;
    this.updateButtonStates();
  }
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
    //   this.openButton.disabled = this.isRollerOpen;
    //   this.closeButton.disabled = !this.isRollerOpen;
    // }
    
    // Or if you're using template references, emit events or use a service
    console.log(`Roller is now ${this.isRollerOpen ? 'OPEN' : 'CLOSED'}`);
  }

  public setRollerState(isOpen: boolean): void {
    this.isRollerOpen = isOpen;
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

    this.textureLoader.load(backgroundUrl, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;

      if (this.textureMaterial) {
        this.textureMaterial.dispose();
      }

      this.textureMaterial = new THREE.MeshStandardMaterial({
        map: texture
      });

      if (this.cube5Meshes.length) {
        this.cube5Meshes.forEach((mesh) => {
          mesh.material = this.textureMaterial!;
          (mesh.material as THREE.Material).needsUpdate = true;
        });
      }
    });
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
