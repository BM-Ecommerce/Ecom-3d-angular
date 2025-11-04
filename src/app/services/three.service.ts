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
  
  // New properties for 2D zoom
  private zoomCamera!: THREE.OrthographicCamera;
  private mouseX = 0;
  private mouseY = 0;
  private isZooming = false;
  private readonly lensRadius = 100;
  private readonly zoomFactor = 4;

  private animationFrameId?: number;


  constructor() {}

  ngOnDestroy(): void {
    this.resetState();
  }
  
  private resetState(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
    if (this.textureMaterial) {
      this.textureMaterial.dispose();
    }
    if (this.controls) {
      this.controls.dispose();
    }
    if (this.canvasEl) {
      this.canvasEl.removeEventListener('mousedown', this.onCanvasMouseDown);
      this.canvasEl.removeEventListener('mouseup', this.onCanvasMouseUp);
      this.canvasEl.removeEventListener('mouseleave', this.onCanvasMouseLeave);
      this.canvasEl.classList.remove('grab', 'grabbing');
      this.canvasEl = null;
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
  }

  public initialize(canvas: ElementRef<HTMLCanvasElement>, container: HTMLElement): void {
    this.resetState();
    const width = container.clientWidth;
    const height = container.clientHeight;
    console.log(width);
    console.log(height);
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
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

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

        gltf.scene.traverse((child) => {
          if (type == 'rollerblinds') {
            const mesh = child as THREE.Mesh;
            if (mesh.name.startsWith("Cylinder") || mesh.name.startsWith("Cube")) {
              this.cube5Meshes.push(mesh);
            }
          } else if (type == 'venetian') {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              if (mesh.name.startsWith("Cylinder") || mesh.name.startsWith("Cube")) {
                mesh.material = new THREE.MeshStandardMaterial({
                  color: 0xffffff,
                });
                (mesh.material as THREE.Material).needsUpdate = true;
              } else if (mesh.name.startsWith("Boolean")) {
                this.cube5Meshes.push(mesh);
              }
            }
          } else {
            if ((child as THREE.Mesh).isMesh) {
              const parent = child.parent;
              const grandParent = parent?.parent;
              if (parent && grandParent && grandParent.name === "Cube_5") {
                const index = parent.children.indexOf(child);

                if (index === 1) {
                  this.cube5Meshes.push(child as THREE.Mesh);
                } else {
                  if ((child as THREE.Mesh).isMesh) {
                    (child as THREE.Mesh).material = new THREE.MeshStandardMaterial({
                      color: 0x000000,
                    });
                    ((child as THREE.Mesh).material as THREE.Material).needsUpdate = true;
                  }
                }
              }
            }
            if ((child as THREE.Mesh).isMesh && child.name === 'Cube_4') {
              this.cube4Mesh = child as THREE.Mesh;
            } else if ((child as THREE.Mesh).isMesh && child.name === 'Cube_3') {
              this.cube3Mesh = child as THREE.Mesh;
            } else if ((child as THREE.Mesh).isMesh && child.name === 'Cube_2') {
              this.cube2Mesh = child as THREE.Mesh;
            } else if ((child as THREE.Mesh).isMesh && child.name === 'Cube') {
              this.cubeMesh = child as THREE.Mesh;
            }
          }
        });

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

public getCanvasDataURL(): string | undefined {
  if (!this.renderer) {
    return undefined;
  }
  this.render(); 
  return this.renderer.domElement.toDataURL('image/png');
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
  console.log(this.renderer);
  console.log(width);
   console.log(height);
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
      const bgTexture = textureLoader.load(backgroundUrl, () => this.render());
      bgTexture.colorSpace = THREE.SRGBColorSpace;

      const bgGeometry = new THREE.PlaneGeometry(viewWidth, viewHeight);
      const bgMaterial = new THREE.MeshBasicMaterial({
        map: bgTexture,
        transparent: false
      });
      this.backgroundMesh = new THREE.Mesh(bgGeometry, bgMaterial);
      this.backgroundMesh.position.z = -1;
      this.scene.add(this.backgroundMesh);
    }

    this.render();
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

        const bgGeometry = new THREE.PlaneGeometry(viewWidth, viewHeight);
        const bgMaterial = new THREE.MeshBasicMaterial({
          map: bgTexture,
          transparent: false
        });
        this.backgroundMesh = new THREE.Mesh(bgGeometry, bgMaterial);
        this.backgroundMesh.position.z = -1;
        this.scene.add(this.backgroundMesh);

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

  resizeMesh(this.frameMesh);
  resizeMesh(this.backgroundMesh);

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
}
