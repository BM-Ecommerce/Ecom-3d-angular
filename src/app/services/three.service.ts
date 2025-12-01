import {
  Injectable,
  ElementRef,
  OnDestroy,
  NgZone,
  Inject
} from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { LoadingService } from './loading.service';

type BlindType =
  | 'rollerblinds'
  | 'venetian'
  | 'vertical'
  | 'daynight'
  | 'roman'
  | 'wood'
  | 'generic';

interface BlindMaterialProfile {
  roughness: number;
  metalness: number;
  emissiveIntensity: number;
  transparent?: boolean;
  opacity?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ThreeService implements OnDestroy {
  // Core Three.js
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private camera2d!: THREE.OrthographicCamera;
  private zoomCamera!: THREE.OrthographicCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;

  private canvasEl: HTMLCanvasElement | null = null;
  private containerEl?: HTMLElement;
  private resizeObserver?: ResizeObserver;

  // Current GLTF model root
  private currentModelRoot?: THREE.Object3D;

  // Lighting
  private directionalLight?: THREE.DirectionalLight;
  private ambientLight?: THREE.AmbientLight;
  private fillLight?: THREE.PointLight;

  // Loaders
  private loadingManager!: THREE.LoadingManager;
  private textureLoader!: THREE.TextureLoader;
  private gltfLoader!: GLTFLoader;

  // Blind parts: slats / fabric etc
  public Wood: THREE.Mesh[] = [];
  private cube2Mesh!: THREE.Mesh;
  private frameMesh!: THREE.Mesh;
  private cube4Mesh!: THREE.Mesh;
  public cube5Meshes: THREE.Mesh[] = [];
  private cube3Mesh!: THREE.Mesh;
  private backgroundMesh!: THREE.Mesh;
  private cubeMesh!: THREE.Mesh;
  public showDimensions = true;

  // Material used for pattern on slats/fabric
  private textureMaterial?: THREE.MeshStandardMaterial;

  // Camera initial state
  private initialCameraPosition!: THREE.Vector3;
  private initialControlsTarget!: THREE.Vector3;

  // Animation
  private mixer?: THREE.AnimationMixer;
  private clock = new THREE.Clock();
  private rollerAction?: THREE.AnimationAction | null = null;
  private actions?: { [key: string]: THREE.AnimationAction };
  public isAnimateOpen = false;
  public isLooping = false;
  public hideAnimation = false;

  // Blind type
  public type!: BlindType;

  // Pattern / texture controls
  public fitMode: 'contain' | 'cover' | 'stretch' = 'cover';
  public alignX: 'left' | 'center' | 'right' = 'center';
  public alignY: 'top' | 'center' | 'bottom' = 'center';
  public offsetU = 0;
  public offsetV = 0;
  public flipV = false;

  // Zoom lens for 2D mode
  private mouseX = 0;
  private mouseY = 0;
  private isZooming = false;
  private readonly lensRadius = 50;
  private readonly zoomFactor = 12;

  // Transparent-hole detection cache for frames (2D)
  private holeCache = new Map<
    string,
    {
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
      width: number;
      height: number;
      found: boolean;
    }
  >();

  // RAF id
  private animationFrameId?: number;
  private slatEdgeHelpers: THREE.LineSegments[] = [];

  // Background texture URL requested before GLTF finished loading
  private pendingTextureUrl?: string;

  // Canvas mouse handlers (for cursor style)
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

  // Measurement helpers (3D): arrows + labels
  private measurementGroup?: THREE.Group;
  private horizArrowPos?: THREE.ArrowHelper;
  private horizArrowNeg?: THREE.ArrowHelper;
  private vertArrowPos?: THREE.ArrowHelper;
  private vertArrowNeg?: THREE.ArrowHelper;
  private widthLabel?: THREE.Sprite;
  private heightLabel?: THREE.Sprite;
  private lastWidth: number = 0;
  private lastDrop: number = 0;
  private unitLabel: string = '';

  constructor(
    private zone: NgZone,
    @Inject(LoadingService) private loading: LoadingService
  ) {
    // Global loading manager (textures + GLTF)
    this.loadingManager = new THREE.LoadingManager();
    this.loadingManager.onStart = () => {
      this.loading.start('three:assets');
      this.loading.setProgress(1);
    };
    this.loadingManager.onProgress = (_url, loaded, total) => {
      const pct = total > 0 ? (loaded / total) * 100 : 0;
      this.loading.setProgress(pct);
    };
    this.loadingManager.onLoad = () => {
      this.loading.end('three:assets');
      this.loading.setProgress(100);
    };
    this.loadingManager.onError = () => {
      this.loading.end('three:assets');
    };

    this.textureLoader = new THREE.TextureLoader(this.loadingManager);
    this.gltfLoader = new GLTFLoader(this.loadingManager);
  }

  
  public setDimensions(width: number, drop: number): void {
    this.lastWidth = Number(width) || 0;
    this.lastDrop = Number(drop) || 0;
    this.updateDimensionHelpers(this.lastWidth, this.lastDrop);
  }

  public setUnitLabel(unit: string): void {
    this.unitLabel = unit || '';
    this.updateDimensionHelpers(this.lastWidth, this.lastDrop);
  }

  private createTextSprite(text: string, baseScale: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

  const padding = 18;
  const fontSize = 60;
  const fontFamily = 'Arial, sans-serif';
  ctx.font = `600 ${fontSize}px ${fontFamily}`;

  const textWidth = ctx.measureText(text).width;
  const textHeight = fontSize * 1.4;

  canvas.width = textWidth + padding * 2;
  canvas.height = textHeight + padding * 2;

  const ctx2 = canvas.getContext('2d')!;
  ctx2.font = `600 ${fontSize}px ${fontFamily}`;
  ctx2.textBaseline = 'middle';

  const radius = 35;
  const w = canvas.width;
  const h = canvas.height;

  ctx2.fillStyle = this.getPrimaryColorRGBA(1);
  ctx2.beginPath();
  ctx2.moveTo(radius, 0);
  ctx2.lineTo(w - radius, 0);
  ctx2.quadraticCurveTo(w, 0, w, radius);
  ctx2.lineTo(w, h - radius);
  ctx2.quadraticCurveTo(w, h, w - radius, h);
  ctx2.lineTo(radius, h);
  ctx2.quadraticCurveTo(0, h, 0, h - radius);
  ctx2.lineTo(0, radius);
  ctx2.quadraticCurveTo(0, 0, radius, 0);
  ctx2.closePath();
  ctx2.fill();

  // White text
  ctx2.fillStyle = '#ffffff';
  ctx2.fillText(text, padding, h / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false
  });

  const sprite = new THREE.Sprite(material);

  const scale = baseScale;
  sprite.scale.set(scale, scale * (canvas.height / canvas.width), 1);

  return sprite;
}

  private getPrimaryColorRGBA(alpha: number): string {
    try {
      const style = getComputedStyle(document.documentElement);
      let val = style.getPropertyValue('--primary-color')?.trim();
      if (!val) return `rgba(0,39,70,${alpha})`;
      // Normalize value
      // Supported: #RGB, #RRGGBB, rgb(r,g,b), rgba(r,g,b,a)
      if (val.startsWith('#')) {
        const hex = val.slice(1);
        let r = 0, g = 0, b = 0;
        if (hex.length === 3) {
          r = parseInt(hex[0] + hex[0], 16);
          g = parseInt(hex[1] + hex[1], 16);
          b = parseInt(hex[2] + hex[2], 16);
        } else if (hex.length === 6) {
          r = parseInt(hex.substring(0, 2), 16);
          g = parseInt(hex.substring(2, 4), 16);
          b = parseInt(hex.substring(4, 6), 16);
        } else {
          return `rgba(0,39,70,${alpha})`;
        }
        
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
      if (val.startsWith('rgb')) {
        // rgb(…)/rgba(…)
        const nums = val.replace(/rgba?\(/, '').replace(/\)/, '').split(',').map(s => s.trim());
        const r = parseFloat(nums[0]);
        const g = parseFloat(nums[1]);
        const b = parseFloat(nums[2]);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
      // Attempt CSS color keywords via temp element
      const tmp = document.createElement('div');
      tmp.style.color = val;
      document.body.appendChild(tmp);
      const cs = getComputedStyle(tmp).color; // rgb(r,g,b)
      document.body.removeChild(tmp);
      const nums = cs.replace(/rgba?\(/, '').replace(/\)/, '').split(',').map(s => s.trim());
      const r = parseFloat(nums[0]);
      const g = parseFloat(nums[1]);
      const b = parseFloat(nums[2]);
      if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
      return `rgba(0,39,70,${alpha})`;
    } catch {
      return `rgba(0,39,70,${alpha})`;
    }
  }

  private getPrimaryOpacity(defaultAlpha: number): number {
    try {
      const style = getComputedStyle(document.documentElement);
      let val = style.getPropertyValue('--primary-color')?.trim();
      if (!val) return defaultAlpha;
      if (/^rgba\(/i.test(val)) {
        const nums = val.replace(/rgba?\(/i, '').replace(/\)/, '').split(',').map(s => s.trim());
        const a = parseFloat(nums[3]);
        return Number.isFinite(a) ? a : defaultAlpha;
      }
      if (/^hsla\(/i.test(val)) {
        const nums = val.replace(/hsla\(/i, '').replace(/\)/, '').split(',').map(s => s.trim());
        const a = parseFloat(nums[3]);
        return Number.isFinite(a) ? a : defaultAlpha;
      }
      return defaultAlpha;
    } catch {
      return defaultAlpha;
    }
  }

  private ensureMeasurementGroup(): THREE.Group {
    if (!this.measurementGroup) {
      this.measurementGroup = new THREE.Group();
      this.scene.add(this.measurementGroup);
    }
    return this.measurementGroup;
  }
  private updateDimensionHelpers(width: number, drop: number): void {
  if (!this.scene || !this.camera || !this.currentModelRoot) return;

  const bbox = new THREE.Box3().setFromObject(this.currentModelRoot);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  bbox.getSize(size);
  bbox.getCenter(center);

  const mainSpan = Math.max(size.x, size.y, size.z, 1);
  const margin = mainSpan * 0.06;

  const group = this.ensureMeasurementGroup();
  while (group.children.length > 0) {
    const child = group.children.pop()!;
    this.disposeObject(child);
  }

  group.visible = !!(this.showDimensions && ((width > 0) || (drop > 0)));

  const COLOR = this.getPrimaryColorRGBA(1);
  const ALPHA = this.getPrimaryOpacity(0.1);
  const ARROW_SIZE = mainSpan * 0.045;
  const LABEL_GAP = mainSpan * 0.06;

  const lineMat = new THREE.LineDashedMaterial({
    color: COLOR,
    dashSize: mainSpan * 0.04,
    gapSize: mainSpan * 0.02,
    depthTest: false,
    transparent: true,
    opacity: ALPHA
  });

const makeArrowHead = (size: number) => {
  const geo = new THREE.BufferGeometry();
  const verts = new Float32Array([
    0, 0, 0,
    -size,  size * 0.5, 0,
    -size, -size * 0.5, 0
  ]);
  geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));

  const mat = new THREE.MeshBasicMaterial({
    color: COLOR,
    depthTest: false,
    transparent: false, 
    opacity: 1
  });

  return new THREE.Mesh(geo, mat);
};

  // ---------------------
  // WIDTH DIMENSION
  // ---------------------
  const widthGroup = new THREE.Group();
  group.add(widthGroup);
  const yDim = bbox.min.y - margin;

  const widthLineGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(bbox.min.x, yDim, center.z),
    new THREE.Vector3(bbox.max.x, yDim, center.z)
  ]);
  const widthLine = new THREE.Line(widthLineGeo, lineMat);
  widthLine.computeLineDistances();
  widthGroup.add(widthLine);

  const leftArrow = makeArrowHead(ARROW_SIZE);
  leftArrow.position.set(bbox.min.x, yDim, center.z);
  leftArrow.rotation.z = Math.PI;
  widthGroup.add(leftArrow);

  const rightArrow = makeArrowHead(ARROW_SIZE);
  rightArrow.position.set(bbox.max.x, yDim, center.z);
  rightArrow.rotation.z = 0;
  widthGroup.add(rightArrow);

  const widthText = `${width || 0} ${this.unitLabel}`;
  this.widthLabel = this.createTextSprite(widthText, mainSpan * 0.14);
  this.widthLabel.position.set(
    (bbox.min.x + bbox.max.x) / 2,
    yDim - LABEL_GAP,
    center.z
  );
  widthGroup.add(this.widthLabel);

  // ---------------------
  // HEIGHT DIMENSION
  // ---------------------
  const heightGroup = new THREE.Group();
  group.add(heightGroup);
  const xDim = bbox.max.x + margin;

  const heightLineGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(xDim, bbox.min.y, center.z),
    new THREE.Vector3(xDim, bbox.max.y, center.z)
  ]);
  const heightLine = new THREE.Line(heightLineGeo, lineMat);
  heightLine.computeLineDistances();
  heightGroup.add(heightLine);

  const bottomArrow = makeArrowHead(ARROW_SIZE);
  bottomArrow.position.set(xDim, bbox.min.y, center.z);
  bottomArrow.rotation.z = -Math.PI / 2;
  heightGroup.add(bottomArrow);

  const topArrow = makeArrowHead(ARROW_SIZE);
  topArrow.position.set(xDim, bbox.max.y, center.z);
  topArrow.rotation.z = Math.PI / 2;
  heightGroup.add(topArrow);

  const heightText = `${drop || 0} ${this.unitLabel}`;
  this.heightLabel = this.createTextSprite(heightText, mainSpan * 0.14);
  this.heightLabel.position.set(
    xDim + LABEL_GAP,
    (bbox.min.y + bbox.max.y) / 2,
    center.z
  );
  heightGroup.add(this.heightLabel);

  // Visibility per dimension
  widthGroup.visible = width > 0;
  heightGroup.visible = drop > 0;

  this.render();
}

public enableDimensions(on: boolean): void {
  this.showDimensions = on;
  // Recompute helpers so group + per-axis visibility update together
  this.updateDimensionHelpers(this.lastWidth, this.lastDrop);
  this.render();
}
  // ------------------------------------------------------
  // Lifecycle
  // ------------------------------------------------------
  ngOnDestroy(): void {
    this.resetState();
  }

  // ------------------------------------------------------
  // Blind material profile engine
  // ------------------------------------------------------
  public getBlindMaterialProfile(type: BlindType): BlindMaterialProfile {
    switch (type) {
      case 'rollerblinds':
        return {
          roughness: 0.45,
          metalness: 0.0,
          emissiveIntensity: 0.03
        };

      case 'venetian':
        return {
          roughness: 0.15, // more reflective
          metalness: 0.4,
          emissiveIntensity: 0.05
        };

      case 'vertical':
        return {
          roughness: 0.55,
          metalness: 0.0,
          emissiveIntensity: 0.05
        };

      case 'daynight':
        return {
          roughness: 0.4,
          metalness: 0.0,
          transparent: true,
          opacity: 0.85,
          emissiveIntensity: 0.08
        };

      case 'roman':
        return {
          roughness: 0.5,
          metalness: 0.0,
          emissiveIntensity: 0.05
        };

      case 'wood':
        return {
          roughness: 0.35,
          metalness: 0.0,
          emissiveIntensity: 0.03
        };

      case 'generic':
      default:
        return {
          roughness: 0.5,
          metalness: 0.1,
          emissiveIntensity: 0.05
        };
    }
  }

  // ------------------------------------------------------
  // State reset & disposal
  // ------------------------------------------------------
  private resetState(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }

    if (this.renderer) {
      try {
        this.renderer.dispose();
      } catch {
        /* ignore */
      }
    }

    if (this.textureMaterial) {
      try {
        this.textureMaterial.dispose();
      } catch {
        /* ignore */
      }
    }

    if (this.measurementGroup) {
      try {
        this.scene?.remove(this.measurementGroup);
      } catch {
        /* ignore */
      }
      this.disposeObject(this.measurementGroup);
      this.measurementGroup = undefined;
      this.horizArrowPos = undefined;
      this.horizArrowNeg = undefined;
      this.vertArrowPos = undefined;
      this.vertArrowNeg = undefined;
      this.widthLabel = undefined;
      this.heightLabel = undefined;
    }

    if (this.controls) {
      try {
        this.controls.removeEventListener('start', this.onCanvasMouseDown);
        this.controls.removeEventListener('end', this.onCanvasMouseUp);
      } catch {
        /* ignore */
      }
      try {
        this.controls.dispose();
      } catch {
        /* ignore */
      }
    }

    if (this.canvasEl) {
      this.canvasEl.removeEventListener('mousedown', this.onCanvasMouseDown);
      this.canvasEl.removeEventListener('mouseup', this.onCanvasMouseUp);
      this.canvasEl.removeEventListener('mouseleave', this.onCanvasMouseLeave);
      this.canvasEl.classList.remove('grab', 'grabbing');
      this.canvasEl = null;
    }

    if (this.mixer) {
      try {
        this.mixer.stopAllAction();
      } catch {
        /* ignore */
      }
      this.mixer = undefined;
    }

    // Remove and dispose any slat edge helpers
    try {
      for (const seg of this.slatEdgeHelpers) {
        if (seg.parent) seg.parent.remove(seg);
        (seg.geometry as any)?.dispose?.();
        (seg.material as any)?.dispose?.();
      }
    } catch { /* ignore */ }
    this.slatEdgeHelpers = [];

    try {
      if (this.directionalLight) this.scene.remove(this.directionalLight);
      if (this.ambientLight) this.scene.remove(this.ambientLight);
      if (this.fillLight) this.scene.remove(this.fillLight);
    } catch {
      /* ignore */
    }

    // Remove and dispose model
    try {
      if (this.currentModelRoot && this.scene) {
        this.scene.remove(this.currentModelRoot);
        this.disposeObject(this.currentModelRoot);
        this.currentModelRoot = undefined;
      }
    } catch {
      /* ignore */
    }

    // Reset core references
    this.scene = new THREE.Scene();
    this.camera = null as any;
    this.camera2d = null as any;
    this.zoomCamera = null as any;
    this.controls = null as any;

    this.cube2Mesh = null as any;
    this.frameMesh = null as any;
    this.cube4Mesh = null as any;
    this.cube5Meshes = [];
    this.cube3Mesh = null as any;
    this.backgroundMesh = null as any;
    this.textureMaterial = undefined;
    this.cubeMesh = null as any;
    this.initialCameraPosition = null as any;
    this.initialControlsTarget = null as any;
    this.mouseX = 0;
    this.mouseY = 0;
    this.isZooming = false;
    this.rollerAction = null;
    this.clock = new THREE.Clock();
    this.Wood = [];
    this.pendingTextureUrl = undefined;
    this.isAnimateOpen = false;
    this.isLooping = false;
  }

  // Dispose a subtree of the scene graph
  private disposeObject(object: THREE.Object3D): void {
    object.traverse((child: any) => {
      if (child.isMesh) {
        const mesh = child as THREE.Mesh;
        try {
          mesh.geometry?.dispose?.();
        } catch {
          /* ignore */
        }
        const materials = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        for (const m of materials) {
          if (!m) continue;
          try {
            const texKeys = [
              'map',
              'normalMap',
              'aoMap',
              'roughnessMap',
              'metalnessMap',
              'emissiveMap',
              'bumpMap',
              'displacementMap',
              'alphaMap',
              'envMap'
            ];
            for (const k of texKeys) {
              const t = (m as any)[k];
              if (t && typeof t.dispose === 'function') {
                try {
                  t.dispose();
                } catch {
                  /* ignore */
                }
              }
            }
            m.dispose?.();
          } catch {
            /* ignore */
          }
        }
      }
    });
  }

  // ------------------------------------------------------
  // 3D initialization
  // ------------------------------------------------------
  public initialize(
    canvas: ElementRef<HTMLCanvasElement>,
    container: HTMLElement
  ): void {
    this.resetState();
    this.containerEl = container;

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
      antialias: true
    });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace as any;
    (this.renderer as any).physicallyCorrectLights = true;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    this.initialCameraPosition = this.camera.position.clone();
    this.initialControlsTarget = this.controls.target.clone();

    this.controls.addEventListener('start', this.onCanvasMouseDown);
    this.controls.addEventListener('end', this.onCanvasMouseUp);

    // Lighting
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.3);
    this.directionalLight.position.set(5, 10, 5);
    this.directionalLight.castShadow = true;
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

    this.fillLight = new THREE.PointLight(0xffffff, 0.35);
    this.fillLight.position.set(-5, 5, -5);
    this.fillLight.castShadow = false;
    this.scene.add(this.fillLight);

    // Animation loop outside Angular
    this.zone.runOutsideAngular(() => this.animate());

    // Resize observer
    try {
      const RO: any = (window as any).ResizeObserver;
      if (RO) {
        const ro = new RO(() => this.onResize(container));
        this.resizeObserver = ro;
        ro.observe(container);
      }
    } catch {
      /* ignore */
    }
  }

  // Simple zoom helpers
  public zoomIn(): void {
    if (this.controls) {
      const factor = 0.9;
      const camera = this.controls.object as THREE.PerspectiveCamera;
      camera.position.multiplyScalar(factor);
      this.controls.update();
    }
  }

  public zoomOut(): void {
    if (this.controls) {
      const factor = 1.1;
      const camera = this.controls.object as THREE.PerspectiveCamera;
      camera.position.multiplyScalar(factor);
      this.controls.update();
    }
  }

  // ------------------------------------------------------
  // 3D: GLTF load + blind setup
  // ------------------------------------------------------
  public loadGltfModel(gltfUrl: string, type: BlindType): void {
    this.type = type;
    this.cube5Meshes = [];
    this.Wood = [];

    this.gltfLoader.load(
      gltfUrl,
      (gltf) => {
        // Remove old model
        if (this.currentModelRoot) {
          this.scene.remove(this.currentModelRoot);
          this.disposeObject(this.currentModelRoot);
          this.currentModelRoot = undefined;
        }

        this.scene.add(gltf.scene);
        this.currentModelRoot = gltf.scene;

        // Extra lights just for the model (optional)
        const ambient = new THREE.AmbientLight(0xffffff, 1.3);
        this.scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight.position.set(10, 10, 10);
        this.scene.add(dirLight);

        // Animation setup
        if (gltf.animations && gltf.animations.length > 0) {
          this.hideAnimation = false;
          this.mixer = new THREE.AnimationMixer(gltf.scene);

          if (gltf.animations.length === 2) {
            const clip = gltf.animations[0];
            this.rollerAction = this.mixer.clipAction(clip);
            this.rollerAction.loop = THREE.LoopOnce;
            this.rollerAction.clampWhenFinished = true;
            this.actions = undefined;

            // Start in closed pose
            this.rollerAction.stop();
            this.rollerAction.enabled = true;
            this.rollerAction.reset();
            this.rollerAction.time = 0;
            this.mixer.update(0);
            this.rollerAction.stop();
          } else {
            this.actions = {};
            this.rollerAction = undefined;
            gltf.animations.forEach((clip) => {
              const action = this.mixer!.clipAction(clip);
              action.loop = THREE.LoopOnce;
              action.clampWhenFinished = true;
              this.actions![clip.name] = action;
            });

            Object.values(this.actions).forEach((action) => {
              action.stop();
              action.enabled = true;
              action.reset();
              action.time = 0;
            });
            this.mixer.update(0);
          }
        } else {
          this.hideAnimation = true;
          this.mixer = undefined;
          this.rollerAction = null;
        }

        this.isAnimateOpen = false;
        this.isLooping = false;

        const profile = this.getBlindMaterialProfile(type);

        // Traverse scene, normalize materials and pick slats/fabric parts
        gltf.scene.traverse((child) => {
          if ((child as any).isMesh) {
            const mesh = child as THREE.Mesh;
            let mat = mesh.material as any;

            // Normalize to MeshStandardMaterial
            if (!mat || !mat.isMeshStandardMaterial) {
              mesh.material = new THREE.MeshStandardMaterial({
                map: mat?.map ?? null,
                color: mat?.color ? mat.color.getHex() : 0xffffff
              });
            }

            const m = mesh.material as THREE.MeshStandardMaterial;
            // Base profile application
            m.metalness = profile.metalness;
            m.roughness = profile.roughness;
            m.emissive = new THREE.Color(0xffffff);
            m.emissiveIntensity = profile.emissiveIntensity;
            m.transparent = profile.transparent ?? false;
            if (profile.opacity !== undefined) {
              m.opacity = profile.opacity;
            }
            if (type === 'daynight') {
              m.depthWrite = false;
            }
            m.needsUpdate = true;

            mesh.castShadow = true;
            mesh.receiveShadow = true;

            // Blind-type specific selection of slats / panels
            if (type === 'rollerblinds') {
              if (
                mesh.name.startsWith('Cylinder032') ||
                mesh.name.startsWith('Cylinder027') ||
                mesh.name.startsWith('Cylinder028')
              ) {
                this.cube5Meshes.push(mesh);
              }
            } else if (type === 'venetian') {
              if (
                mesh.name.startsWith('Cylinder') &&
                !mesh.name.startsWith('Cylinder032') &&
                !mesh.name.startsWith('Cylinder031') &&
                !mesh.name.startsWith('Cylinder033') &&
                !mesh.name.startsWith('Cylinder034') &&
                !mesh.name.startsWith('Cylinder023') &&
                !mesh.name.startsWith('Cylinder022')
              ){
                this.cube5Meshes.push(mesh);
              }
            } else if (type === 'vertical') {
              if (
                mesh.name.startsWith('Cylinder') &&
                !mesh.name.startsWith('Cylinder024') &&
                !mesh.name.startsWith('Cylinder025') &&
                !mesh.name.startsWith('Cylinder026')
              ) {
                this.cube5Meshes.push(mesh);
              }
            } else if (type === 'daynight') {
              if (mesh.name.startsWith('Cube')) {
                this.cube5Meshes.push(mesh);
              }
            } else if (type === 'roman') {
              if (mesh.name.startsWith('Plane')) {
                this.cube5Meshes.push(mesh);
              }
            } else if (type === 'wood') {
              const excludedCubes = [
                'Cube067',
                'Cube070',
                'Cube071',
                'Cube059',
                'Cube060',
                'Cube061',
                'Cube024',
                'Cube045',
                'Cube046',
                'Cube044'
              ];
              const isExcluded = excludedCubes.some((prefix) =>
                mesh.name.startsWith(prefix)
              );

              if (mesh.name.startsWith('Cube') && !isExcluded) {
                this.cube5Meshes.push(mesh);
              }

              if (isExcluded) {
                this.Wood.push(mesh);
              }
            } else {
             if (mesh.name.startsWith('Plane') || mesh.name.startsWith('Cube001')) {
                this.cube5Meshes.push(mesh);
              }
              if(mesh.name.startsWith('Cube') && !mesh.name.startsWith('Cube001')){
                this.cubeMesh= mesh;
              }
            }
          }
        });

        // If a shared texture material already exists, apply to slats
      if (this.textureMaterial && this.cube5Meshes.length > 0) {
        this.cube5Meshes.forEach((mesh) => {
          mesh.material = this.textureMaterial!;
          (mesh.material as THREE.Material).needsUpdate = true;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        });
      }

      // Enhance edge definition for vertical slats by overlaying EdgesGeometry lines
      if (this.type === 'vertical' && this.cube5Meshes.length > 0) {
        try {
          // Remove any old helpers first
          for (const seg of this.slatEdgeHelpers) {
            if (seg.parent) seg.parent.remove(seg);
            (seg.geometry as any)?.dispose?.();
            (seg.material as any)?.dispose?.();
          }
          this.slatEdgeHelpers = [];

          for (const mesh of this.cube5Meshes) {
            const edges = new THREE.EdgesGeometry(mesh.geometry);
            const mat = new THREE.LineBasicMaterial({
              color: 0x000000,
              transparent: true,
              opacity: 0.1,
              depthTest: true,
              depthWrite: false
            });
            const lines = new THREE.LineSegments(edges, mat);
            // Attach as child so it follows transforms
            mesh.add(lines);
            // Slightly higher order to reduce z-fighting artifacts
            lines.renderOrder = (mesh.renderOrder || 0) + 1;
            this.slatEdgeHelpers.push(lines);
          }
        } catch { /* ignore */ }
      }

        // If a texture request was queued before model load, apply now
        if (this.pendingTextureUrl) {
          const url = this.pendingTextureUrl;
          this.pendingTextureUrl = undefined;
          this.updateTextures(url);
        }

        // Auto-frame camera
        try {
          const bbox = new THREE.Box3().setFromObject(gltf.scene);
          const size = bbox.getSize(new THREE.Vector3());
          const center = bbox.getCenter(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const safeMax = maxDim > 0 ? maxDim : 1;

          gltf.scene.position.sub(center);

          if (this.camera && (this.camera as any).isPerspectiveCamera) {
            const fov = (this.camera.fov * Math.PI) / 180;
            const distance = safeMax / (2 * Math.tan(fov / 2));
            const aspect = window.innerWidth / window.innerHeight;
            const padding = THREE.MathUtils.lerp(1.35, 2.0, Math.max(0, 1 - aspect));
            const finalDist = distance * padding;

            this.camera.position.set(0, 0, finalDist);
            this.camera.near = Math.max(0.01, safeMax / 1000);
            this.camera.far = Math.max(1000, safeMax * 100);
            this.camera.updateProjectionMatrix();

            if (this.controls) {
              this.controls.target.set(0, 0, 0);
              this.controls.update();
              this.controls.minDistance = finalDist * 0.5;
              this.controls.maxDistance = finalDist * 5;
            }

            this.initialCameraPosition = this.camera.position.clone();
            this.initialControlsTarget = this.controls
              ? this.controls.target.clone()
              : new THREE.Vector3(0, 0, 0);
          }
        } catch (err) {
          console.warn('Auto-framing failed:', err);
        }

        // Force animations to closed pose
        this.forceAllAnimationsClosed();

        // Re-apply shared texture if present
        if (this.textureMaterial && this.cube5Meshes.length > 0) {
          this.cube5Meshes.forEach((mesh) => {
            mesh.material = this.textureMaterial!;
            (mesh.material as THREE.Material).needsUpdate = true;
          });
        }

        // Update measurement arrows/labels using latest width/drop
        this.updateDimensionHelpers(this.lastWidth, this.lastDrop);
      },
      undefined,
      (error) => {
        console.error(error);
      }
    );
  }

  // ------------------------------------------------------
  // Animation control
  // ------------------------------------------------------
  private forceAllAnimationsClosed(): void {
    if (!this.mixer) return;

    if (this.rollerAction) {
      this.rollerAction.stop();
      this.rollerAction.enabled = true;
      this.rollerAction.reset();
      this.rollerAction.time = 0;
      this.mixer.update(0);
      this.rollerAction.stop();
      this.setRollerState(true);
      return;
    }

    if (this.actions) {
      Object.values(this.actions).forEach((action) => {
        action.stop();
        action.enabled = true;
        action.reset();
        action.time = 0;
      });
      this.mixer.update(0);
    }
  }

  public openAnimate(loopCount: number = 1): void {
    if (!this.mixer || this.isAnimateOpen) return;

    const playAction = (action: THREE.AnimationAction) => {
      action.stop();
      action.enabled = true;
      action.timeScale = 1;
      action.reset();
      action.setLoop(
        loopCount > 1 ? THREE.LoopRepeat : THREE.LoopOnce,
        loopCount - 1
      );
      action.clampWhenFinished = true;
      action.play();
    };

    if (this.rollerAction) {
      playAction(this.rollerAction);
    } else if (this.actions && Object.keys(this.actions).length > 0) {
      Object.values(this.actions).forEach(playAction);
    }

    this.isAnimateOpen = true;
  }

  public closeAnimate(instant: boolean = false): void {
    if (!this.mixer || !this.isAnimateOpen) return;

    const reverseAction = (action: THREE.AnimationAction) => {
      const clip = action.getClip();
      const duration = clip.duration ?? 0;

      action.stop();
      action.enabled = true;

      if (instant) {
        action.time = 0;
        this.mixer?.update(0);
        action.play();
        action.stop();
      } else {
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
  }

  public toggleAnimate(loopCount: number = 1): void {
    if (!this.mixer) return;
    if (this.isLooping) return;
    this.isAnimateOpen ? this.closeAnimate() : this.openAnimate(loopCount);
  }

  public loopAnimate(): void {
    if (!this.mixer) return;

    const loopAction = (action: THREE.AnimationAction) => {
      action.stop();
      action.enabled = true;
      action.timeScale = 1;
      action.reset();
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
    this.isLooping = true;
  }

  public stopAll(): void {
    if (this.rollerAction) {
      this.rollerAction.stop();
      this.isAnimateOpen = true;
    } else {
      Object.values(this.actions ?? {}).forEach((a) => a.stop());
      this.isAnimateOpen = false;
    }
    this.isLooping = false;
  }

  public setRollerState(isOpen: boolean): void {
    this.isAnimateOpen = isOpen;
  }

  // Export image from canvas
  public getCanvasDataURL(): string | undefined {
    if (!this.renderer) return undefined;
    this.render();
    return this.renderer.domElement.toDataURL('image/png');
  }

  // ------------------------------------------------------
  // 2D initialization
  // ------------------------------------------------------
  public initialize2d(
    canvas: ElementRef<HTMLCanvasElement>,
    container: HTMLElement
  ): void {
    this.resetState();
    this.containerEl = container;

    const width = container.clientWidth;
    const height = container.clientHeight;

    this.scene = new THREE.Scene();

    const left = width / -2;
    const right = width / 2;
    const top = height / 2;
    const bottom = height / -2;

    this.camera2d = new THREE.OrthographicCamera(
      left,
      right,
      top,
      bottom,
      0.1,
      1000
    );
    this.camera2d.position.z = 10;

    this.zoomCamera = this.camera2d.clone();

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas.nativeElement,
      alpha: true,
      antialias: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.zone.runOutsideAngular(() => this.animate());

    try {
      const RO: any = (window as any).ResizeObserver;
      if (RO) {
        const ro = new RO(() => this.onResize(container));
        this.resizeObserver = ro;
        ro.observe(container);
      }
    } catch {
      /* ignore */
    }
  }

  // ------------------------------------------------------
  // 2D: frame + background creation and updates
  // ------------------------------------------------------
  public refit2d(): void {
    try {
      if (!this.frameMesh || !this.backgroundMesh) return;
      const mat = this.frameMesh.material as any;
      const frameTex: THREE.Texture | undefined = mat?.map;
      if (!frameTex) return;
      this.fitBackgroundToFrame(frameTex, this.frameMesh, this.backgroundMesh);
      this.render();
    } catch { /* noop */ }
  }

  public createObjects(frameUrl: string, backgroundUrl: string): void {
    if (this.frameMesh) this.scene.remove(this.frameMesh);
    if (this.backgroundMesh) this.scene.remove(this.backgroundMesh);

    const texLoader = new THREE.TextureLoader(this.loadingManager);

    texLoader.load(frameUrl, (frameTexture) => {
      frameTexture.colorSpace = THREE.SRGBColorSpace;
      frameTexture.needsUpdate = true;

      const imgWidth = frameTexture.image.width;
      const imgHeight = frameTexture.image.height;
      const aspect = imgWidth / imgHeight;

      const canvas = this.renderer.domElement;
      const canvasAspect = canvas.clientWidth / canvas.clientHeight;

      let viewWidth: number;
      let viewHeight: number;

      if (aspect > canvasAspect) {
        viewWidth = canvas.clientWidth;
        viewHeight = viewWidth / aspect;
      } else {
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
      this.frameMesh.receiveShadow = false;
      this.frameMesh.castShadow = false;

      this.scene.add(this.frameMesh);

      if (backgroundUrl) {
        texLoader.load(backgroundUrl, (bgTexture) => {
          bgTexture.colorSpace = THREE.SRGBColorSpace;
          bgTexture.needsUpdate = true;

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

          this.fitBackgroundToFrame(
            frameTexture,
            this.frameMesh,
            this.backgroundMesh
          );
          this.render();
        });
      } else {
        this.render();
      }
    });
  }

  public updateTextures2d(frameUrl: string, backgroundUrl: string): void {
    const texLoader = new THREE.TextureLoader(this.loadingManager);

    texLoader.load(frameUrl, (frameTexture) => {
      frameTexture.colorSpace = THREE.SRGBColorSpace;

      const imgWidth = frameTexture.image.width;
      const imgHeight = frameTexture.image.height;
      const aspect = imgWidth / imgHeight;

      const canvas = this.renderer.domElement;
      const canvasAspect = canvas.clientWidth / canvas.clientHeight;

      let viewWidth: number;
      let viewHeight: number;

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
        texLoader.load(backgroundUrl, (bgTexture) => {
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

          this.fitBackgroundToFrame(
            frameTexture,
            this.frameMesh,
            this.backgroundMesh
          );
          this.render();
        });
      } else {
        this.render();
      }
    });
  }

  // ------------------------------------------------------
  // Resize handling
  // ------------------------------------------------------
  public onResize(container: HTMLElement): void {
    const width = container.clientWidth;
    const height = container.clientHeight;

    if (this.renderer) {
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.setSize(width, height, false);
    }

    if (this.camera && (this.camera as any).isPerspectiveCamera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }

    if (this.camera2d && (this.camera2d as any).isOrthographicCamera) {
      this.camera2d.left = width / -2;
      this.camera2d.right = width / 2;
      this.camera2d.top = height / 2;
      this.camera2d.bottom = height / -2;
      this.camera2d.updateProjectionMatrix();
    }

    // Recompute 2D plane sizes when the container changes so textures stay aligned
    this.resize2dGeometry();

    this.render();
  }

  // Keep 2D frame/background sized to the canvas after layout changes
  private resize2dGeometry(): void {
    if (!this.renderer || !this.camera2d || !this.frameMesh) return;

    const canvas = this.renderer.domElement;
    const canvasWidth = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight;
    if (!canvasWidth || !canvasHeight) return;

    const frameMaterial = this.frameMesh.material as THREE.MeshBasicMaterial;
    const frameTexture = frameMaterial?.map;
    const img = frameTexture?.image as HTMLImageElement | undefined;
    if (!frameTexture || !img || !img.width || !img.height) return;

    const aspect = img.width / img.height;
    const canvasAspect = canvasWidth / canvasHeight;

    let viewWidth: number;
    let viewHeight: number;

    if (aspect > canvasAspect) {
      viewWidth = canvasWidth;
      viewHeight = viewWidth / aspect;
    } else {
      viewHeight = canvasHeight;
      viewWidth = viewHeight * aspect;
    }

    this.frameMesh.geometry?.dispose();
    this.frameMesh.geometry = new THREE.PlaneGeometry(viewWidth, viewHeight);
    this.frameMesh.position.z = 0;

    if (this.backgroundMesh) {
      this.backgroundMesh.geometry?.dispose();
      this.backgroundMesh.geometry = new THREE.PlaneGeometry(
        viewWidth,
        viewHeight
      );
      this.backgroundMesh.position.z = -1;

      const bgMat = this.backgroundMesh.material as THREE.MeshBasicMaterial;
      if (bgMat?.map) {
        this.fitBackgroundToFrame(frameTexture, this.frameMesh, this.backgroundMesh);
      }
    }
  }

  // ------------------------------------------------------
  // Texture application: 3D blinds
  // ------------------------------------------------------
  private extractAverageColor(texture: THREE.Texture): THREE.Color {
    const img = texture.image as HTMLImageElement;
    if (!img || !img.width || !img.height) return new THREE.Color(0xffffff);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const data = ctx.getImageData(0, 0, img.width, img.height).data;

    let r = 0,
      g = 0,
      b = 0;
    const step = 4 * 50;

    for (let i = 0; i < data.length; i += step) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }

    const count = data.length / step;
    return new THREE.Color(r / count / 255, g / count / 255, b / count / 255);
  }

  public updateTextures(backgroundUrl: string): void {
    if (!backgroundUrl) return;

    const targetsReady =
      ((this.cube5Meshes && this.cube5Meshes.length > 0) ||
        (this.type === 'wood' && this.Wood && this.Wood.length > 0)) &&
      !!this.currentModelRoot;

    if (!targetsReady) {
      this.pendingTextureUrl = backgroundUrl;
      return;
    }

    const urlWithCacheBust = `${backgroundUrl}?t=${Date.now()}`;

    this.textureLoader.load(
      urlWithCacheBust,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      // Favor clarity: reduce blurring on magnification
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
      texture.needsUpdate = true;

        // Pattern-based blind types
        if (
          this.type === 'venetian' ||
          this.type === 'vertical' ||
          this.type === 'daynight' ||
          this.type === 'roman' ||
          this.type === 'rollerblinds' ||
          this.type === 'wood' ||
          this.type === 'generic'
          
        ) {
          if (!this.cube5Meshes || this.cube5Meshes.length === 0) {
            this.pendingTextureUrl = backgroundUrl;
            return;
          }

          const isRoller = this.type === 'rollerblinds';
          const shouldAnimate = isRoller ? !this.isAnimateOpen : this.isAnimateOpen;

          if (shouldAnimate) {
            this.stopAll();
            this.closeAnimate(true);
            this.setRollerState(isRoller);

            setTimeout(
              () => this.applyPatternToVenetian(texture, 1, isRoller),
              200
            );
          } else {
            this.applyPatternToVenetian(texture, 1, isRoller);
          }
          return;
        }

        // Generic fallback path
        if (this.cube5Meshes.length > 0) {
          const first = this.cube5Meshes[0];

          if (!first.geometry.attributes['uv']) {
            this.generatePlanarUVs(first.geometry);
          }

          const base =
            (first.material as THREE.MeshStandardMaterial) ||
            new THREE.MeshStandardMaterial();

          const shared = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: base.roughness ?? 0.4,
            side: THREE.DoubleSide,
            color: base.color ?? new THREE.Color(0xffffff),
            envMap: base.envMap,
            envMapIntensity: base.envMapIntensity,
            normalMap: base.normalMap,
            normalScale: base.normalScale,
            aoMap: base.aoMap,
            displacementMap: base.displacementMap
          });

          for (const mesh of this.cube5Meshes) {
            if (!mesh.geometry.attributes['uv']) {
              this.generatePlanarUVs(mesh.geometry);
            }

            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => m.dispose());
            } else if (mesh.material) {
              mesh.material.dispose();
            }

            mesh.material = shared;
            (mesh.material as THREE.Material).needsUpdate = true;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }

          this.textureMaterial = shared;
          this.render();
        } else {
          this.pendingTextureUrl = backgroundUrl;
        }
      },
      undefined,
      (err) => {
        console.error('Texture load error:', err);
      }
    );
  }

  private applyPatternToVenetian(
    texture: THREE.Texture,
    patternScale: number = 1,
    isRoller: boolean = false
  ): void {
    if (!this.cube5Meshes.length) return;

    // Wood: apply averaged color to wood parts (frame, valance, etc.)
    if (this.type === 'wood' && this.Wood.length > 0) {
      const baseColor = this.extractAverageColor(texture).convertSRGBToLinear();
      const woodProfile = this.getBlindMaterialProfile('wood');

      this.Wood.forEach((mesh) => {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else if (mesh.material) {
          (mesh.material as THREE.Material).dispose();
        }

        const mat = new THREE.MeshStandardMaterial({
          color: baseColor,
          roughness: woodProfile.roughness,
          metalness: woodProfile.metalness,
          side: THREE.DoubleSide
        });
        mesh.material = mat;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      });
    }

    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    texture.needsUpdate = true;

    this.scene.updateMatrixWorld(true);

    const slats = this.cube5Meshes.map((mesh) => {
      const bbox = new THREE.Box3().setFromObject(mesh);
      const originalMaterial = mesh.material as THREE.MeshStandardMaterial;
      return { mesh, bbox, originalMaterial };
    });

    const globalMinX = Math.min(...slats.map((s) => s.bbox.min.x));
    const globalMaxX = Math.max(...slats.map((s) => s.bbox.max.x));
    const globalMinY = Math.min(...slats.map((s) => s.bbox.min.y));
    const globalMaxY = Math.max(...slats.map((s) => s.bbox.max.y));

    const totalWidth = globalMaxX - globalMinX;
    const totalHeight = globalMaxY - globalMinY;

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

    const profile = this.getBlindMaterialProfile(this.type);

    for (const { mesh, originalMaterial } of slats) {
      const geom = mesh.geometry as THREE.BufferGeometry;
      const pos = geom.attributes['position'] as THREE.BufferAttribute;
      const uvs = new Float32Array(pos.count * 2);

      for (let i = 0; i < pos.count; i++) {
        const vtx = new THREE.Vector3(
          pos.getX(i),
          pos.getY(i),
          pos.getZ(i)
        );
        mesh.localToWorld(vtx);

        let u = (vtx.x - globalMinX) / totalWidth;
        let v = (vtx.y - globalMinY) / totalHeight;

        if (this.flipV) v = 1 - v;

        // Vertical blinds: rotate mapping 90° so stripes go along strip height
        if (this.type === 'vertical') {
          const temp = u;
          u = v;
          v = temp;
        }

        u = (u - 0.5) * uScale + uCenter;
        v = (v - 0.5) * vScale + vCenter;

        uvs[i * 2] = u;
        uvs[i * 2 + 1] = v;
      }

      geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      geom.attributes['uv'].needsUpdate = true;

      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((mat) => mat.dispose());
      } else {
        (mesh.material as THREE.Material).dispose();
      }

      const mat = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: profile.roughness,
        metalness: profile.metalness,
        color: originalMaterial?.color.convertSRGBToLinear() ?? new THREE.Color(0xffffff),
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: profile.emissiveIntensity,
        side: THREE.DoubleSide,
        transparent: profile.transparent ?? false,
        opacity: profile.opacity ?? 1
      });

      if (this.type === 'daynight') {
        mat.depthWrite = false;
      }

      mesh.material = mat;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      (mesh.material as THREE.Material).needsUpdate = true;
    }

    this.textureMaterial = this.cube5Meshes[0]
      .material as THREE.MeshStandardMaterial;

    console.log('Pattern applied with blind profile ✔', this.type);
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

    const targetsReady = this.cubeMesh && this.currentModelRoot;

    if (!targetsReady) {
      this.pendingTextureUrl = backgroundUrl;
      return;
    }

    const urlWithCacheBust = `${backgroundUrl}?t=${Date.now()}`;

    this.textureLoader.load(
      urlWithCacheBust,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
        texture.needsUpdate = true;

        const woodProfile = this.getBlindMaterialProfile('generic');

        if (Array.isArray(this.cubeMesh.material)) {
          this.cubeMesh.material.forEach((m) => m.dispose());
        } else if (this.cubeMesh.material) {
          (this.cubeMesh.material as THREE.Material).dispose();
        }

      const baseColor = this.extractAverageColor(texture).convertSRGBToLinear();

      this.cubeMesh.material = new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: woodProfile.roughness,
        metalness: woodProfile.metalness,
        side: THREE.DoubleSide
      });

        this.cubeMesh.castShadow = true;
        this.cubeMesh.receiveShadow = true;
      },
      undefined,
      (err) => {
        console.error('Texture load error:', err);
      }
    );
  }


  // ------------------------------------------------------
  // Camera helpers
  // ------------------------------------------------------
  public resetCamera(): void {
    if (this.camera && this.controls) {
      this.camera.position.copy(this.initialCameraPosition);
      this.controls.target.copy(this.initialControlsTarget);
      this.controls.update();
    }
  }

  // ------------------------------------------------------
  // Animation loop + rendering
  // ------------------------------------------------------
  public animate(): void {
    const loop = () => {
      if (this.controls) {
        this.controls.update();
      }

      if (this.mixer) {
        const delta = this.clock.getDelta();
        this.mixer.update(delta);
      }

      this.render();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    loop();
  }

  public stopAnimationLoop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
  }

  public setZoom(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
  }

  public enableZoom(enabled: boolean): void {
    this.isZooming = enabled;
  }

  private render(): void {
    if (!this.renderer || !this.scene) return;

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

        const worldX =
          this.camera2d.left +
          (lensX / width) * (this.camera2d.right - this.camera2d.left);
        const worldY =
          this.camera2d.top -
          (lensY / height) * (this.camera2d.top - this.camera2d.bottom);

        const zoomSize =
          (this.camera2d.right - this.camera2d.left) / this.zoomFactor;

        this.zoomCamera.left = worldX - zoomSize / 2;
        this.zoomCamera.right = worldX + zoomSize / 2;
        this.zoomCamera.top = worldY + zoomSize / 2;
        this.zoomCamera.bottom = worldY - zoomSize / 2;
        this.zoomCamera.updateProjectionMatrix();

        const viewportX = lensX - lensRadius;
        const viewportY = height - lensY - lensRadius;

        this.renderer.setViewport(
          viewportX,
          viewportY,
          lensRadius * 2,
          lensRadius * 2
        );
        this.renderer.setScissor(
          viewportX,
          viewportY,
          lensRadius * 2,
          lensRadius * 2
        );
        this.renderer.setScissorTest(true);

        this.renderer.render(this.scene, this.zoomCamera);
      }

      this.renderer.setScissorTest(false);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  // ------------------------------------------------------
  // 2D frame-hole detection and fitting
  // ------------------------------------------------------
  private detectTransparentRegion(
    image: HTMLImageElement,
    alphaThreshold = 10
  ) {
    const cacheKey = (image as any).currentSrc || (image as any).src;
    if (cacheKey && this.holeCache.has(cacheKey)) {
      return this.holeCache.get(cacheKey)!;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

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

    let result: {
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
      width: number;
      height: number;
      found: boolean;
    };
    if (!foundAny) {
      result = {
        minX: 0,
        minY: 0,
        maxX: image.width,
        maxY: image.height,
        width: image.width,
        height: image.height,
        found: false
      };
    } else {
      result = {
        minX,
        minY,
        maxX,
        maxY,
        width: image.width,
        height: image.height,
        found: true
      };
    }
    if (cacheKey) this.holeCache.set(cacheKey, result);
    return result;
  }

  private fitBackgroundToFrame(
    frameTexture: THREE.Texture,
    frameMesh: THREE.Mesh,
    backgroundMesh: THREE.Mesh
  ): void {
    const img = frameTexture.image as HTMLImageElement;
    if (!img || !img.width || !img.height) return;

    const hole = this.detectTransparentRegion(img, 40);
    if (!hole.found) {
      frameMesh.geometry.computeBoundingBox();
      const bbox = (frameMesh.geometry as any)
        .boundingBox as THREE.Box3 | undefined;
      if (bbox) {
        const planeWidth = bbox.max.x - bbox.min.x;
        const planeHeight = bbox.max.y - bbox.min.y;

        if (backgroundMesh.geometry) backgroundMesh.geometry.dispose();
        backgroundMesh.geometry = new THREE.PlaneGeometry(
          planeWidth,
          planeHeight
        );
        backgroundMesh.position.set(
          frameMesh.position.x,
          frameMesh.position.y,
          frameMesh.position.z - 0.01
        );
      }
      return;
    }

    frameMesh.geometry.computeBoundingBox();
    const bbox = (frameMesh.geometry as any)
      .boundingBox as THREE.Box3 | undefined;
    if (!bbox) return;

    const planeWidth = bbox.max.x - bbox.min.x;
    const planeHeight = bbox.max.y - bbox.min.y;

    const holePixelWidth = hole.maxX - hole.minX;
    const holePixelHeight = hole.maxY - hole.minY;
    const holeCenterX = (hole.minX + hole.maxX) / 2;
    const holeCenterY = (hole.minY + hole.maxY) / 2;

    const innerWidth = planeWidth * (holePixelWidth / hole.width);
    const innerHeight = planeHeight * (holePixelHeight / hole.height);

    const offsetXFromCenterPx = holeCenterX - hole.width / 2;
    const offsetYFromCenterPx = hole.height / 2 - holeCenterY;

    const offsetX = (offsetXFromCenterPx / hole.width) * planeWidth;
    const offsetY = (offsetYFromCenterPx / hole.height) * planeHeight;

    if (backgroundMesh.geometry) backgroundMesh.geometry.dispose();
    backgroundMesh.geometry = new THREE.PlaneGeometry(innerWidth, innerHeight);

    backgroundMesh.position.set(
      frameMesh.position.x + offsetX,
      frameMesh.position.y + offsetY,
      frameMesh.position.z - 0.01
    );

    backgroundMesh.updateMatrixWorld(true);
  }
}
