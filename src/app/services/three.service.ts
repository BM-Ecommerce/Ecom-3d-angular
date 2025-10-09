import { Injectable, ElementRef, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

@Injectable({
  providedIn: 'root'
})
export class ThreeService implements OnDestroy {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private textureLoader = new THREE.TextureLoader();
  private gltfLoader = new GLTFLoader();
  private cube2Mesh!: THREE.Mesh;
  private cube4Mesh!: THREE.Mesh;
  public cube5Meshes: THREE.Mesh[] = [];
  private cube3Mesh!: THREE.Mesh;
  private blackMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
  private textureMaterial?: THREE.MeshStandardMaterial;
  private cubeMesh!: THREE.Mesh;
  private initialCameraPosition!: THREE.Vector3;
  private initialControlsTarget!: THREE.Vector3;
  private isShutterOpen = false;
  

  constructor() {}

  ngOnDestroy(): void {
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
  public toggleRotation(): void {
    this.isShutterOpen = !this.isShutterOpen;
  }
 public initialize(canvas: ElementRef<HTMLCanvasElement>, container: HTMLElement): void {
  const width = container.clientWidth;
  const height = container.clientHeight;

  this.scene = new THREE.Scene();
  this.scene.background = new THREE.Color(0xffffff);

  this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  this.camera.position.z = 5;

  const canvasEl = canvas.nativeElement; 

  canvasEl.classList.add('grab');

  canvasEl.addEventListener('mousedown', () => {
    canvasEl.classList.remove('grab');
    canvasEl.classList.add('grabbing');
  });

  canvasEl.addEventListener('mouseup', () => {
    canvasEl.classList.remove('grabbing');
    canvasEl.classList.add('grab');
  });

  canvasEl.addEventListener('mouseleave', () => {
    canvasEl.classList.remove('grabbing');
    canvasEl.classList.add('grab');
  });

  this.renderer = new THREE.WebGLRenderer({
    canvas: canvasEl,
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

  this.controls.addEventListener('start', () => {
    canvasEl.classList.remove('grab');
    canvasEl.classList.add('grabbing');
  });

  this.controls.addEventListener('end', () => {
    canvasEl.classList.remove('grabbing');
    canvasEl.classList.add('grab');
  });

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  this.scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(1, 1, 1).normalize();
  this.scene.add(directionalLight);
}


 public loadGltfModel(gltfUrl: string,type: string): void {
  this.gltfLoader.load(
    gltfUrl,
    (gltf) => {
      this.scene.add(gltf.scene);

      gltf.scene.traverse((child) => {
      if(type == 'rollerblinds'){
         const mesh = child as THREE.Mesh;
          if (mesh.name.startsWith("Cylinder") || mesh.name.startsWith("Cube")) {
             this.cube5Meshes.push(mesh);
          }
      }else if(type == 'venetian'){
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            if (mesh.name.startsWith("Cylinder") || mesh.name.startsWith("Cube")) {
              mesh.material = new THREE.MeshStandardMaterial({
                color: 0xffffff,
              });
              (mesh.material as THREE.Material).needsUpdate = true;
            }

          else if (mesh.name.startsWith("mesh_12_instance_")) {
            this.cube5Meshes.push(mesh);
          }
        }
        }else{
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
        }else if((child as THREE.Mesh).isMesh && child.name === 'Cube_3'){
          this.cube3Mesh = child as THREE.Mesh;
        }else if((child as THREE.Mesh).isMesh && child.name === 'Cube_2'){
          this.cube2Mesh = child as THREE.Mesh;
        }else if((child as THREE.Mesh).isMesh && child.name === 'Cube'){
          this.cubeMesh = child as THREE.Mesh;
        }
      } 
      });

      this.animate();
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
    this.render(); // Ensure the scene is rendered before capturing
    return this.renderer.domElement.toDataURL('image/png');
  }
  public updateTextures(backgroundUrl: string): void {
    if (!backgroundUrl || !this.cube5Meshes.length) return;

    this.textureLoader.load(backgroundUrl, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;

      this.textureMaterial = new THREE.MeshStandardMaterial({ map: texture });

      this.cube5Meshes.forEach((mesh) => {
        mesh.material = this.textureMaterial!;
        (mesh.material as THREE.Material).needsUpdate = true;
      });
    });
  }
    public updateFrame(backgroundUrl: string): void {
      if (!backgroundUrl) return;

      const meshes = [this.cubeMesh, this.cube2Mesh, this.cube3Mesh];

      this.textureLoader.load(backgroundUrl, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        const newMaterial = new THREE.MeshStandardMaterial({ map: texture });

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
      requestAnimationFrame(loop);

      if (this.isShutterOpen) {
        this.cube5Meshes.forEach(mesh => {
          mesh.rotation.x -= 0.01; 
        });
      }

      this.controls.update();
      this.render();
    };

    loop();
  }

  public onResize(container: HTMLElement): void {
    if (this.renderer && this.camera) {
      const width = container.clientWidth;
      const height = container.clientHeight;

      this.renderer.setSize(width, height);

      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
  }

  private render(): void {
    if (!this.renderer || !this.scene || !this.camera) {
      return;
    }
    this.renderer.render(this.scene, this.camera);
  }
}