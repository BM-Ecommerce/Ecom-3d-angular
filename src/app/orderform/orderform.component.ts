import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy, ViewChild, ElementRef, AfterViewInit, SimpleChanges, HostListener, Inject, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { environment } from '../../environments/environment';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatExpansionModule } from '@angular/material/expansion';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from '../services/api.service';
import { ThreeService } from '../services/three.service';;
import { LoadingService } from '../services/loading.service';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { FormControl } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { Subject, forkJoin, Observable, of, from } from 'rxjs';
import { switchMap, mergeMap, map, tap, catchError, takeUntil, finalize, toArray, concatMap, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { HtmlTooltipDirective } from '../html-tooltip.directive';
import { FreesampleComponent } from "../freesample/freesample.component";
import { ConfiguratorComponent } from "../configurator/configurator.component";
import { CarouselModule } from 'ngx-owl-carousel-o';
import { RelatedproductComponent } from '../relatedproduct/relatedproduct.component';
import { MatButtonToggleChange } from '@angular/material/button-toggle';
import { DomSanitizer } from '@angular/platform-browser';
import { MatIconRegistry } from '@angular/material/icon';
import * as htmlToImage from 'html-to-image';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { ProductPreloadService } from '../services/product-preload.service';


// Interfaces (kept as you had them)
// Interfaces

interface JsonDataItem {
  id: number;
  labelname: string;
  value: any;
  valueid: any;
  type: number;
  optionid: any;
  optionvalue: any[];
  issubfabric: number;
  fieldtypeid: any;
  labelnamecode: string;
  fabricorcolor: number;
  widthfraction: any;
  widthfractiontext: any;
  dropfractiontext: any;
  dropfraction: any;
  showfieldonjob: number;
  showFieldOnCustomerPortal: number;
  optionquantity: any;
  globaledit: boolean;
  numberfraction: any;
  numberfractiontext: any;
  fieldInformation: any;
  editruleoverride: any;
  ruleoverride: any;
  fieldid: number;
  mandatory: number;
  fieldlevel?: number;
  fieldname: string;
  subchild?: ProductField[];
  optiondefault: any;
  optionsvalue?: any[];

}
interface ProductDetails {
  pei_id: number;
  pei_productid: number;
  pei_prospec: string;
  recipeid: number;
  pei_ecomProductName: string;
  pi_productdescription: string;
  pi_category: string;
  pi_producttype: string;
  pi_productgroup: string;
  pi_qtyperunit: number;
  pi_deafultimage: string;
  pi_frameimage: string;
  pi_productimage: string;
  pi_backgroundimage: string;
  pi_prodbannerimage: string;
  pei_ecommercestatus: number;
  netpricecomesfrom: string;
  costpricecomesfrom: string;
  pei_ecomFreeSample: boolean;
  pei_ecomsampleprice: number;
  label: string;
  minimum_price: number;
  single_view: boolean;
}
interface ProductField {
  fieldid: number;
  fieldname: string;
  labelnamecode: string;
  fieldtypeid: number;
  showfieldonjob: number;
  showfieldecomonjob: number;
  optiondefault?: string;
  optionsvalue?: any[];
  value?: string;
  selection?: any;
  mandatory?: any;
  valueid?: string;
  optionid?: any;
  level?: number;
  valuename?: string;
  hasprice?: boolean;
  parentFieldId?: number;
  masterparentfieldid?: number;
  allparentFieldId?: string;
  field_has_sub_option?: boolean;
  optionvalue?: any[];
  subchild?: ProductField[];
  optionquantity?: any;
  fieldlevel?: number;
  id?: number;
  labelname?: string;
  type?: number;
  // extras from PHP structure
  issubfabric?: any;
  fabricorcolor?: any;
  widthfraction?: string;
  widthfractiontext?: string;
  dropfractiontext?: string;
  dropfraction?: string;
  showFieldOnCustomerPortal?: any;
  globaledit?: boolean;
  numberfraction?: any;
  numberfractiontext?: string;
  fieldInformation?: any;
  editruleoverride?: any;
  ruleoverride?: any;
  numeric_setcondition?: any;
  numeric_minvalue?: any;
  numeric_maxvalue?: any;
}

interface ProductOption {
  subdatacount: number;
  optionid: string | number;
  optionname: string;
  optionimage: string;
  optionsvalue: any;
  fieldoptionlinkid: number;
  availableForEcommerce?: number;
  pricegroups: string;
  optionid_pricegroupid: string;
  pricegroupid: string;
  optioncode?: string;
  optionquantity?: any;
  unitcost?:any;
  hasprice?:any;
  forchildfieldoptionlinkid?: string;
}
interface SelectProductOption {
  optionvalue: number;
  fieldtypeid: number;
  optionqty?: number;
  fieldoptionlinkid?: number;
}

interface FractionOption {
  decimalvalue: string;
  name: string;
  id: number;
  frac_decimalvalue: string;
}

@Component({
  selector: 'app-orderform',
  templateUrl: './orderform.component.html',
  styleUrls: ['./orderform.component.css'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    RouterModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatButtonToggleModule,
    MatTabsModule,
    MatButtonModule,
    MatExpansionModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressBarModule,
    HtmlTooltipDirective,
    FreesampleComponent,
    ConfiguratorComponent,
    CarouselModule,
    RelatedproductComponent,
    NgxMatSelectSearchModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderformComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('visualizerCanvas', { static: false }) private canvasRef!: ElementRef<HTMLCanvasElement>;
  public loaderMode: 'overlay' | 'topbar' = 'overlay';
  public loaderEnabled = true;
  @ViewChild('visualizerContainer', { static: false }) private containerRef!: ElementRef<HTMLElement>;
  @ViewChild('zoomLens', { static: false }) private zoomLensRef!: ElementRef<HTMLElement>;
  @ViewChild('stickyEl', { static: false }) stickyEl!: ElementRef<HTMLElement>;
  @ViewChild('mainImg', { static: false }) private mainImgRef!: ElementRef<HTMLElement>;

  public isLooping: boolean = false;
  public patternRepeatEnabled = false;
  public patternRepeatScale = 1;
  public patternRepeatScaleInput = '1';
  isZooming = false;
  mainframe!: string;
  background_color_image_url!: string;
  private destroy$ = new Subject<void>();
  private patternRepeatChange$ = new Subject<void>();
  private readonly MAX_NESTING_LEVEL = 8;
  private resizeRaf: number | null = null;
  private mouseMoveRaf: number | null = null;
  private wheelListener?: (event: WheelEvent) => void;
  private priceGroupField?: ProductField;
  private supplierField?: ProductField;
  private qtyField?: ProductField;
  private unitField?: ProductField;
  // Form / UI state
  public productTitle: string = '';
  public related_products: any[] = [];
  isLoading = false;
  public showSkeleton = false;
  private isCanvasReady = false;
  private optionsLoaded = false;
  isSubmitting = false;
  errorMessage: string | null = null;
  jsondata: JsonDataItem[] = [];
  fullscreenColorFields: ProductField[] = [];
  colorOptionsMap: Record<number, ProductOption[]> = {};
  private derivedDirty = true;
  // Product data
  showFractions = false;
  product_details_arr: Record<string, string> = {};
  product_specs = '';
  shutter_product_details :any;
  ecomproductname = '';
  product_description = '';
  unit_type_data: any[] = [];
  parameters_arr: any[] = [];
  searchCtrl: { [key: number]: FormControl } = {};
  filteredOptions: { [key: number]: any[] } = {};
  pricedata: any[] = [];
  supplierOption: any;
  priceGroupOption: any;
  unitOption: any;
  productdescription: string = "";
  pei_prospec: string = "";
  isScrolled = false;
  unittypename = "";
  hasProspecContent = false;
hasDescriptionContent = false;
  relatedframeimage:string = ""
  netpricecomesfrom = "";
  is3DOn = true;
  recipeid: number = 0;
  category: number = 0;
  costpricecomesfrom = "";
  inchfractionselected: Number = 0;
  freesample: any;
  relatedproducts: any;
  freesameple_status!: number | boolean;
  product_id!: number | string;
  freesample_price!: number | string;
  shutterdata:any;
  colorurl: string="";
  shutter_type_name:string="";
  hinge_colorurl :  string ="";
  midrails: string="";
  no_of_panels: string="";
  slatsize : string="";
  tiltrod : string="";
  siteurl = environment.site;
  readonly frameColorKey = 'framecolour';
  readonly curtainColorKey = 'curtaincolour';
  selected_img_option:number = 0;
  selected_frame_option:number = 0;
  selected_curtain_option:number = 0;
  selected_color_option: any = null;
  selected_framecolor_option: any = null;
  selected_curtaincolor_option: any = null;
  selected_list_data:any = {};
  shutter_selected_img_options:any={};
  list_value:string = "list";
  shutter_color_list_value:string="list";
  shutter_hinge_color_list_value:string="list";
  hinge_color_field_names:any[] = ['hingecolors','hingecolour','hingecolours'];
  color_field_names:any[] = ['colours','colour','color'];
  enableSelectSearch: boolean = true;
  showDimensionsToggle: boolean = false;
  dimensionMode: 'on' | 'off' = 'on'; 
  isFullscreen: boolean = false;
  isFullscreenMobile: boolean = false;
  private isBackgroundSelectedInCarousel = false;
  private isBackgroundZoomEnabled = false;
  public enableFrameThumbnails = true;
  public fullCanvasZoomFactor =1;
  private previousZoomFactor: number | null = null;
  
  private prevIs3DOn: boolean = false;

  private updateShowDimensionsToggle(): void {
    try {
      // Show the toggle whenever either dimension has a value OR user turned dimensions on
      this.showDimensionsToggle = (this.dimensionMode === 'on') || (this.width > 0 || this.drop > 0);
      this.cd.markForCheck();
    } catch { /* ignore */ }
  }

  private updateSkeletonState(): void {
    this.showSkeleton = !this.optionsLoaded;
    this.cd.markForCheck();
  }

  private markCanvasReady(): void {
    if (this.isCanvasReady) return;
    this.isCanvasReady = true;
    this.updateSkeletonState();
  }

  private resolveCartProductId(params?: any): string {
    const candidates = [
      this.route.snapshot.params['cart_productid'],
      params?.cart_productid,
      this.route.snapshot.queryParams['cart_productid'],
      this.routeParams?.cart_productid,
      environment.cart_productid
    ];

    for (const candidate of candidates) {
      const value = String(candidate ?? '').trim();
      if (value) {
        return value;
      }
    }

    return '';
  }

  get_freesample() {
    this.freesample = {
      "status": this?.freesameple_status,
      "cart_productid": this.resolveCartProductId(),
      "product_id": this.product_id,
      "type": "free_sample",
      "free_sample_price": this?.freesample_price,
      "form_data": this?.orderitemdata(false, true),
      "cartproductName": this?.buildProductTitle(this.ecomproductname, this.fabricname, this.colorname),
      "priceData": this?.pricedata,
      "vatpercentage": this?.vatpercentage ?? "",
      "vatname": this?.vatname ?? "",
      "api_url": this?.routeParams?.site,
      "current_url": window?.location.href,
      "productname": this?.productname,
      "catagory_id": this?.fabricFieldType,
      "color_id": this.colorid,
      "fabric_id": this.fabricid,
      "pei_ecomImage": this.background_color_image_url,
      "currencySymbol": this.currencySymbol
    }
  }
  get_relatedproduct_data() {
    this.relatedproducts = {
      fabricid: this.fabricid,            
      colorid: this.colorid || 0,         
      routeParams: this.routeParams,      
      fabricFieldType: this.fabricFieldType,  
      siteurl: this.siteurl,
      relatedframeimage:this.relatedframeimage,
      currencySymbol:this.currencySymbol,         
      product_id: this.product_id,
      ecomproductname:this.ecomproductname        
    };
  }
  inchfraction_array: FractionOption[] = [
    {
      "name": "1/32",
      "id": 1,
      "decimalvalue": "0.03125",
      "frac_decimalvalue": "0.03125"
    },
    {
      "name": "1/16",
      "id": 2,
      "decimalvalue": "0.0625",
      "frac_decimalvalue": "0.0625"
    },
    {
      "name": "3/32",
      "id": 3,
      "decimalvalue": "0.09375",
      "frac_decimalvalue": "0.09375"
    },
    {
      "name": "1/8",
      "id": 4,
      "decimalvalue": "0.125",
      "frac_decimalvalue": "0.125"
    },
    {
      "name": "5/32",
      "id": 5,
      "decimalvalue": "0.15625",
      "frac_decimalvalue": "0.15625"
    },
    {
      "name": "3/16",
      "id": 6,
      "decimalvalue": "0.1875",
      "frac_decimalvalue": "0.1875"
    }

  ];
  color_arr: Record<string, any> = {};
  min_width: number | null = null;
  max_width: number | null = null;
  min_drop: number | null = null;
  max_drop: number | null = null;
  width = 0;
  drop = 0;
  vatpercentage = 0;
  vatname = "";
  widthField: any = 0;
  dropField: any = 0;
  fabricFieldType: any = 0;
  fabricLabelName: any = "";
  colorLabelName: any = "";
  FrameLabelName: any = "";
  CurtainLabelName: any = "";
  ecomsampleprice = 0;
  ecomFreeSample = '0';
  delivery_duration = '';
  visualizertagline = '';
  productname = '';
  product_list_page_link = '';
  fabricname = '';
  colorname = '';
  frame_default_url = "";
  hide_frame = false;
  product_img_array: any[] = [];
  product_deafultimage: Record<string, any> = {};
  fabric_linked_color_data: Record<string, any> = {};
  productlisting_frame_url = '';
  sample_img_frame_url = '';
  v4_product_visualizer_page = '';
  fieldscategoryname = '';
  productslug = '';
  iconname= "roller-blinds";
  fabricid:any = 0;
  colorid:any = 0;
  matmapid = 0;
  rulescount = 0;
  formulacount = 0;
  pricegroup_id = 0;
  supplier_id: number | null = null;
  currencySymbol: string = '£';
  public isMobile = false;
  public skeletonRows = Array.from({ length: 6 }, (_, i) => i);
  // Form controls
  orderForm: FormGroup;
  previousFormValue: any;
  apiUrl = '';
  img_file_path_url = '';
  imgpath = environment.apiUrl+'/api/public/storage/attachments/'+environment.apiName+'/material/colour/';
  frame_path = environment.apiUrl +'/api/public/storage/';
  parameters_data: ProductField[] = [];
  option_data: Record<number, ProductOption[]> = {};
  selected_option_data: SelectProductOption[] = [];
  accordionData: { label: string, value: any }[] = [];
  routeParams: any;
  listingReturnUrl: string = '';
  unittype: number = 1;
  pricegroup: string = "";
  show_image_icons = false;
  has3DModel = false;
  chosenAccessoriesFieldId:number = 0;
  chosenAccessoriesOptionId:string = "";
  public grossPrice: string | null = null;
  public isCalculatingPrice = true;
  grossPricenum: number = 0;
  private priceUpdate = new Subject<void>();
  private rulesorderitem: any[] = [];
  public showFramesInMobile = false;
  customOptions: any = {
      loop: false,
      mouseDrag: true,
      touchDrag: true,
      autoWidth: false,
      pullDrag: true,
      dots: false,
      navSpeed: 700,
      navText: ['<', '>'],
      nav: false,
      // Explicit sizing so Owl doesn't split stage into 3 equal widths that look like autoWidth
      items: 5,
      responsive: {
        0: { items: 2 },
        480: { items: 3 },
        768: { items: 4 },
        1024: { items: 5 }
      }
    };
  constructor(
    private apiService: ApiService,
    private productPreloadService: ProductPreloadService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private cd: ChangeDetectorRef,
    private threeService: ThreeService,
    private http: HttpClient,
    @Inject(LoadingService) public loading: LoadingService,
    private matIconRegistry: MatIconRegistry,
    private sanitizer: DomSanitizer,
    private ngZone: NgZone
  ) {
    // initial minimal group; will be replaced in initializeFormControls
    this.orderForm = this.fb.group({
      unit: ['', Validators.required],
      widthfraction: [''],
      dropfraction: [''],
      qty: [1, [Validators.required, Validators.min(1)]]
    });
    this.previousFormValue = this.orderForm.value;
    this.updateProductTitle();
  }

  // Composed frame thumbnails cache for frame cards
  private composedFrameThumbsMap: Record<string, string> = {};
  private composingFrameKeys = new Set<string>();

  ngOnInit(): void {
    this.updateIsMobile();
    this.registerProductIcon();
    // Expose loader mode for template conditions
    this.loaderMode = environment.loaderMode;
    this.loaderEnabled = environment.loaderEnabled;
    this.patternRepeatChange$
      .pipe(debounceTime(200), takeUntil(this.destroy$))
      .subscribe(() => {
        this.threeService.setPatternRepeatEnabled(this.patternRepeatEnabled);
        this.threeService.setPatternRepeatScale(this.patternRepeatScale);

        if (this.is3DOn && this.background_color_image_url) {
          this.threeService.updateTextures(this.background_color_image_url);
        } else if (!this.is3DOn) {
          this.update2DTexturesForSelection();
        }
        this.cd.markForCheck();
      });
    const queryParams = this.route.snapshot.queryParams;
    const currentNavigation = this.router.getCurrentNavigation();
    const navigationState = currentNavigation?.extras?.state;
    const backLinkFromState = navigationState?.['listingReturnUrl'] || history.state?.listingReturnUrl;
    if (typeof backLinkFromState === 'string' && backLinkFromState.trim()) {
      this.listingReturnUrl = backLinkFromState.trim();
    }
    // Check if running on localhost
    const isLocalhost = window.location.hostname === 'localhost';
    const pathParams = this.route.snapshot.params;

    if (pathParams && pathParams['product_id']) {
      // WordPress path-based integration
      this.img_file_path_url = environment.apiUrl + '/api/public/';
      this.route.params.pipe(
        takeUntil(this.destroy$)
      ).subscribe(paramsFromRoute => {
        const params = {
          ...paramsFromRoute,
          cart_productid: this.resolveCartProductId(paramsFromRoute),
          api_url: environment.apiUrl,
          api_key: environment.apiKey,
          api_name: environment.apiName,
          site: environment.site
        };
        this.fetchInitialData(params);
      });
    } else if (isLocalhost) {
      this.img_file_path_url = environment.apiUrl + '/api/public/';
      this.route.queryParams.pipe(
        takeUntil(this.destroy$)
      ).subscribe(queryParams => {
        const params = {
          ...queryParams,
          cart_productid: this.resolveCartProductId(queryParams),
          api_url: environment.apiUrl,
          api_key: environment.apiKey,
          api_name: environment.apiName,
          site: environment.site
        };
        this.fetchInitialData(params);
      });


    }
    // Price updates remain the same
    this.priceUpdate.pipe(
      debounceTime(500),
      tap(() => {
        this.grossPrice = null;
        this.cd.markForCheck();
        this.rulesorderitem = this.orderitemdata(true);
      }),
      switchMap(() => this.getPrice()),
      takeUntil(this.destroy$)
    ).subscribe(res => {
      if (res && res.fullpriceobject) {
        this.isCalculatingPrice = true;
        const { grossprice } = res.fullpriceobject;
        this.pricedata = res.fullpriceobject;
        this.currencySymbol = this.normalizeCurrencySymbol(res.currencysymbol);
        this.grossPrice = `${this.currencySymbol}${Number(grossprice).toFixed(2)}`;
        this.grossPricenum = Number(grossprice);
      } else {
        this.isCalculatingPrice = false;
        this.grossPrice = null;
        this.pricedata = [];
        this.grossPricenum = 0;
      }
      this.cd.markForCheck();
    });
    this.get_freesample();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.patternRepeatChange$.complete();
    if (this.resizeRaf !== null) {
      cancelAnimationFrame(this.resizeRaf);
      this.resizeRaf = null;
    }
    if (this.mouseMoveRaf !== null) {
      cancelAnimationFrame(this.mouseMoveRaf);
      this.mouseMoveRaf = null;
    }
    if (this.wheelListener && this.containerRef?.nativeElement) {
      this.containerRef.nativeElement.removeEventListener('wheel', this.wheelListener);
    }
  }

  private normalizeCurrencySymbol(symbol: unknown): string {
    const raw = String(symbol ?? '').trim();
    if (!raw) {
      return this.currencySymbol || '£';
    }

    // Handle common encoding/entity variants from backend responses.
    const normalized = raw
      .replace(/&pound;?/gi, '£')
      .replace(/\u00c2£/g, '£')
      .replace(/Â£/g, '£');

    return normalized || this.currencySymbol || '£';
  }

  ngAfterViewInit(): void {
    // Initialization is handled by setupVisualizer() which is called after data fetch.
    // We also need to ensure the animation loop in three.service is started.
    // A better place for this might be after the first textures are loaded.
    this.ngZone.runOutsideAngular(() => {
      const el = this.containerRef?.nativeElement;
      if (!el) return;
      const handler = (event: WheelEvent) => this.onMouseWheel(event);
      // Passive false so preventDefault stops outer page scroll when zooming in the hole
      el.addEventListener('wheel', handler, { passive: false });
      this.wheelListener = handler;
    });
  }
  
  onAnimate() {
    this.threeService.toggleAnimate();
    this.registerProductIcon();
  }
  get isAnimateOpen(): boolean {
    return this.threeService.isAnimateOpen;
  }
  get hideAnimation(): boolean{
    return this.threeService.hideAnimation;
  }
  onStopAnimate(): void {
    this.threeService.stopAll();
  }
  onLoopAnimate(): void {
   this.threeService.loopAnimate();
  }
  
public onToggleLoopAnimate(): void {

  if (this.isLooping) {
    this.threeService.stopAll();
    this.isLooping = false;
  } else {
    this.threeService.loopAnimate();
    this.isLooping = true;
  }
}
  private setupVisualizer(productname: string): void {
    if (!this.canvasRef || !this.containerRef) return;

    const modelInfo = this.resolveModelInfo(productname);
    this.has3DModel = !!modelInfo;
    this.show_image_icons = this.has3DModel && this.category !== 2;

    if (this.is3DOn && this.has3DModel && modelInfo) {
      this.threeService.initialize(this.canvasRef, this.containerRef.nativeElement);
      this.applyPatternRepeatSettings();
      this.threeService.loadGltfModel(
        modelInfo.url,
        modelInfo.type,
        () => this.disable3DForMissingModel()
      );

      // Seed dimension overlays and respect current toggle (no auto-on/off)
      this.threeService.setDimensions(this.width, this.drop);
      this.threeService.setUnitLabel(this.getUnitLabel());
      this.updateShowDimensionsToggle();
      this.threeService.enableDimensions(this.dimensionMode === 'on');

    } else if (this.has3DModel && modelInfo) {
      this.setup2DVisualizer();
    } else {
      this.disable3DForMissingModel();
    }
    this.ngZone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.ngZone.run(() => this.markCanvasReady());
        });
      });
    });
    setTimeout(() => this.onWindowResize(), 0);
  }

  private setup2DVisualizer(): void {
    this.threeService.initialize2d(this.canvasRef, this.containerRef.nativeElement);
    this.applyPatternRepeatSettings();
    this.update2DTexturesForSelection();
    this.ngZone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.ngZone.run(() => this.markCanvasReady());
        });
      });
    });
  }

  private disable3DForMissingModel(): void {
    this.is3DOn = false;
    this.has3DModel = false;
    this.show_image_icons = false;
    this.setup2DVisualizer();
    this.cd.markForCheck();
    setTimeout(() => this.onWindowResize(), 0);
  }

  private resolveModelInfo(productname: string): { url: string; type: 'rollerblinds' | 'venetian' | 'vertical' | 'wood' | 'daynight' | 'roman' | 'generic' } | null {
    const name = (productname || '').toLowerCase();
    if (name.includes('perfect fit roller')) {
      return { url: 'assets/perfectfitroller.glb', type: 'rollerblinds' };
    }
    if (name.includes('roller blinds')) {
      return { url: 'assets/rollerblinds.glb', type: 'rollerblinds' };
    }
    if (name.includes('venetian')) {
      return { url: 'assets/venetianblinds.glb', type: 'venetian' };
    }
    if (name.includes('vertical')) {
      return { url: 'assets/verticalblinds.glb', type: 'vertical' };
    }
    if (name.includes('wood')) {
      return { url: 'assets/woodenblinds.glb', type: 'wood' };
    }
    if (name.includes('day and night')) {
      return { url: 'assets/daynight.glb', type: 'daynight' };
    }
    if (name.includes('roman')) {
      return { url: 'assets/romanblinds.glb', type: 'roman' };
    }
    if (name.includes('door')) {
      return { url: 'assets/rollerdoor.glb', type: 'generic' };
    }
    return null;
  }

  toggle3D() {
    if (!this.has3DModel) {
      this.is3DOn = false;
      return;
    }
    // In fullscreen, enforce 3D mode and ignore 2D toggle
    if (this.isFullscreen) {
      if (!this.is3DOn) {
        this.is3DOn = true;
        this.setupVisualizer(this.productname);
        if (this.background_color_image_url) {
          this.threeService.updateTextures(this.background_color_image_url);
        }
      }
      return;
    }
    this.is3DOn = !this.is3DOn;
    this.setupVisualizer(this.productname);
    if (this.is3DOn && this.background_color_image_url) {
      this.threeService.updateTextures(this.background_color_image_url);
    }
     this.registerProductIcon();
    if (this.is3DOn) {
      if (this.mainImgRef?.nativeElement) {
        this.mainImgRef.nativeElement.style.removeProperty('height');
      }
    } else {
      this.update2DContainerHeightFromFrame();
    }
    setTimeout(() => this.onWindowResize(), 0);
  }

  onPatternRepeatToggle(): void {
    this.patternRepeatEnabled = !this.patternRepeatEnabled;
    this.applyPatternRepeatSettings();
    this.cd.markForCheck();
  }

  onPatternRepeatScaleChange(event: any): void {
    const rawStr = `${event?.target?.value ?? event ?? ''}`;
    if (!rawStr) {
      this.patternRepeatScale = 1;
      this.patternRepeatScaleInput = '';
      this.patternRepeatEnabled = true;
      this.applyPatternRepeatSettings();
      this.cd.markForCheck();
      return;
    }

    const parsed = parseFloat(rawStr);
    const value = Number.isFinite(parsed) ? Math.max(1, parsed) : 1;
    this.patternRepeatScale = value;
    this.patternRepeatScaleInput = `${value}`;
    this.patternRepeatEnabled = true;
    this.applyPatternRepeatSettings();
    this.cd.markForCheck();
  }

  setPatternRepeatScale(value: number): void {
    const next = !value || value <= 0 ? 1 : Math.max(1, value);
    this.patternRepeatScale = next;
    this.patternRepeatScaleInput = `${next}`;
    this.patternRepeatEnabled = true;
    this.applyPatternRepeatSettings();
    this.cd.markForCheck();
  }

  private applyPatternRepeatSettings(): void {
    this.patternRepeatChange$.next();
  }
  
  private isNativeFullscreen(): boolean {
    const d: any = document as any;
    return !!(document.fullscreenElement || d.webkitFullscreenElement || d.msFullscreenElement);
  }

  toggleFullscreen(): void {
    const entering = !this.isNativeFullscreen();
    const wrapper = this.containerRef?.nativeElement || document.getElementById('configurator-root');
    if (entering) {
      this.prevIs3DOn = this.is3DOn;
      if (!this.is3DOn) {
        this.is3DOn = true;
        this.setupVisualizer(this.productname);
        if (this.background_color_image_url) {
          this.threeService.updateTextures(this.background_color_image_url);
        }
      }
      const el: any = wrapper;
      if (el && el.requestFullscreen) el.requestFullscreen();
      else if (el && el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else if (el && el.msRequestFullscreen) el.msRequestFullscreen();
    } else {
      const d: any = document as any;
      if (document.exitFullscreen) document.exitFullscreen();
      else if (d.webkitExitFullscreen) d.webkitExitFullscreen();
      else if (d.msExitFullscreen) d.msExitFullscreen();
      // will sync in fullscreenchange listener
    }
    setTimeout(() => this.onWindowResize(), 0);
  }

  @HostListener('document:fullscreenchange')
  onFullscreenChange(): void {
    this.isFullscreen = this.isNativeFullscreen();
    this.isFullscreenMobile = window.matchMedia('(max-width: 768px)').matches;
    if (this.isFullscreen) {
      this.refreshFullscreenTexture();
    }
    if (!this.isFullscreen) {
      if (this.prevIs3DOn !== this.is3DOn) {
        this.is3DOn = this.prevIs3DOn;
        this.setupVisualizer(this.productname);
      }
    }
    setTimeout(() => this.onWindowResize(), 0);
  }
  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.resizeRaf !== null) return;
    this.resizeRaf = this.ngZone.runOutsideAngular(() =>
      requestAnimationFrame(() => {
        this.resizeRaf = null;
        this.ngZone.run(() => this.performResize());
      })
    ) as any;
  }

  private performResize(): void {
    this.updateIsMobile();
    if (this.containerRef) {
      this.threeService.onResize(this.containerRef.nativeElement);
    }
    if (!this.is3DOn) {
      this.update2DContainerHeightFromFrame();
    }
  }

  private updateIsMobile(): void {
    try {
      this.isMobile = window.innerWidth < 768;
    } catch {
      this.isMobile = false;
    }
  }

  private normalizeFieldName(name?: string): string {
    return (name || '').replace(/\s+/g, '').toLowerCase();
  }

  private markDerivedDirty(): void {
    this.derivedDirty = true;
  }

  private refreshDerivedCollections(): void {
    const fields = (this.parameters_data || []).filter((field) => {
      const level = field.level ?? field.fieldlevel;
      const normalizedName = this.normalizeFieldName(field.fieldname);

      const isCurtainOrFrame =
        field.fieldtypeid === 3 &&
        (normalizedName === this.curtainColorKey || normalizedName === this.frameColorKey);

      const matchesFullscreenRule =
        (field.fieldtypeid === 5 && level === 2) ||
        field.fieldtypeid === 20 ||
        isCurtainOrFrame;

      return field.showfieldecomonjob == 1 && matchesFullscreenRule;
    });

    const map: Record<number, ProductOption[]> = {};
    (this.parameters_data || []).forEach((field) => {
      map[field.fieldid] = this.option_data[field.fieldid] || field.optionsvalue || [];
    });

    this.fullscreenColorFields = fields;
    this.colorOptionsMap = map;
    this.derivedDirty = false;
  }

  get fullscreenColorFieldsView(): ProductField[] {
    if (this.derivedDirty) {
      this.refreshDerivedCollections();
    }
    return this.fullscreenColorFields;
  }

  colorOptionsFor(field: ProductField): ProductOption[] {
    if (this.derivedDirty) {
      this.refreshDerivedCollections();
    }
    return this.colorOptionsMap[field.fieldid] || [];
  }

  isFullscreenOptionActive(field: ProductField, option: ProductOption): boolean {
    const normalizedName = this.normalizeFieldName(field.fieldname);
    if (field.fieldtypeid === 3) {
      const optionId = Number(option.optionid) || 0;
      if (normalizedName === this.frameColorKey) {
        return this.selected_frame_option === optionId;
      }
      if (normalizedName === this.curtainColorKey) {
        return this.selected_curtain_option === optionId;
      }
    }
    const level = field.level ?? field.fieldlevel;
    if ((field.fieldtypeid === 5 && level === 2) || field.fieldtypeid === 20) {
      return this.selected_img_option === option.optionid;
    }
    return this.selected_img_option === option.optionid;
  }

  onFullscreenColorSelect(option: any, field: ProductField): void {
    this.onImageClick(option, field);
    const url = this.resolveTextureUrl(option);
    const normalizedName = this.normalizeFieldName(field.fieldname);

    if (!url || !this.is3DOn) {
      return;
    }

    if (field.fieldtypeid === 3 && normalizedName === this.frameColorKey) {
      this.selected_frame_option = Number(option.optionid) || 0;
      this.threeService.updateFrame(url);
      return;
    }

    if (field.fieldtypeid === 3 && normalizedName === this.curtainColorKey) {
      this.selected_curtain_option = Number(option.optionid) || 0;
    }

    const level = field.level ?? field.fieldlevel;
    if ((field.fieldtypeid === 5 && level === 2) || field.fieldtypeid === 20) {
      this.selected_img_option = option.optionid;
      this.selected_color_option = option;
    }

    this.threeService.updateTextures(url);
  }

  private refreshFullscreenTexture(): void {
    const url = this.resolveTextureUrl(this.selected_color_option);
    if (url) {
      this.threeService.updateTextures(url);
    }
  }

  private resolveTextureUrl(option?: any): string {
    if (option?.optionimage) {
      return this.apiUrl + '/api/public' + option.optionimage;
    }
    if (this.background_color_image_url) {
      return this.background_color_image_url;
    }
    return '';
  }

  // Adjusts the 2D container height on mobile/tablet to match the frame image aspect ratio
  private update2DContainerHeightFromFrame(): void {
    try {
      if (!this.mainframe || this.is3DOn) return;
      // Only apply on mobile/tablet
    
      const hostEl = this.mainImgRef?.nativeElement;
      if (!hostEl) return;
      const img = new Image();
      const frameSrc = this.mainframe;
      img.onload = () => {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h) return;
        const aspect = w / h;
        const containerWidth = hostEl.clientWidth || this.containerRef?.nativeElement?.clientWidth || 0;
        if (!containerWidth) return;
        const targetHeight = Math.max(1, Math.round(containerWidth / aspect));
        hostEl.style.height = `${targetHeight}px`;
        // Ensure renderer/camera pick up new size
        if (this.containerRef) {
          this.threeService.onResize(this.containerRef.nativeElement);
        }
        this.cd.markForCheck();
      };
      img.src = frameSrc;
    } catch { /* ignore */ }
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  private detectTransparentRegion(
    image: HTMLImageElement,
    alphaThreshold = 10
  ) {
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

    if (!foundAny) {
      return {
        minX: 0,
        minY: 0,
        maxX: image.width,
        maxY: image.height,
        width: image.width,
        height: image.height,
        found: false,
      };
    }

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: image.width,
      height: image.height,
      found: true,
    };
  }

  private async composeFrameAndBackground(
    frameUrl: string,
    backgroundUrl: string
  ): Promise<string | null> {
    try {
      const [frameImg, bgImg] = await Promise.all([
        this.loadImage(frameUrl),
        this.loadImage(backgroundUrl)
      ]);

      const hole = this.detectTransparentRegion(frameImg, 40);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      canvas.width = frameImg.width;
      canvas.height = frameImg.height;

      const holeW = (hole.maxX - hole.minX) || frameImg.width;
      const holeH = (hole.maxY - hole.minY) || frameImg.height;
      const scale = Math.max(holeW / bgImg.width, holeH / bgImg.height);
      const drawW = bgImg.width * scale;
      const drawH = bgImg.height * scale;
      const dx = hole.minX + (holeW - drawW) / 2;
      const dy = hole.minY + (holeH - drawH) / 2;

      ctx.drawImage(bgImg, 0, 0, bgImg.width, bgImg.height, dx, dy, drawW, drawH);
      ctx.drawImage(frameImg, 0, 0);

      try {
        return canvas.toDataURL('image/png');
      } catch {
        return null;
      }
    } catch {
      return null;
    }
  }
  zoomIn(): void {
    if (this.is3DOn) {
      this.threeService.zoomIn();
    }
  }
  openAnimate() {
    this.threeService.openAnimate();
  }

  closeAnimate() {
    this.threeService.closeAnimate();
  }
  zoomOut(): void {
    if (this.is3DOn) {
      this.threeService.zoomOut();
    }
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.canUse2DZoom()) {
      if (this.isZooming) {
        this.isZooming = false;
        this.ngZone.runOutsideAngular(() => this.threeService.enableZoom(false));
      }
      return;
    }
    const rect = this.containerRef.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (!this.threeService.isPointInZoomHole(x, y)) {
      if (this.isZooming) {
        this.isZooming = false;
        this.ngZone.runOutsideAngular(() => this.threeService.enableZoom(false));
      }
      return;
    }

    if (!this.isZooming) {
      this.isZooming = true;
      this.ngZone.runOutsideAngular(() => this.threeService.enableZoom(true));
    }

    if (this.mouseMoveRaf !== null) return;
    this.mouseMoveRaf = this.ngZone.runOutsideAngular(() =>
      requestAnimationFrame(() => {
        this.mouseMoveRaf = null;
        this.threeService.setZoom(x, y);
      })
    ) as any;
  }

  onMouseWheel(event: WheelEvent): void {
    if (!this.canUse2DZoom()) return;
    const rect = this.containerRef.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (!this.threeService.isPointInZoomHole(x, y)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const direction = event.deltaY < 0 ? 1 : -1;
    this.ngZone.runOutsideAngular(() => this.threeService.adjustZoomFactor(direction));
  }

  onMouseEnter(): void {
    if (!this.canUse2DZoom()) {
      this.isZooming = false;
      this.ngZone.runOutsideAngular(() => this.threeService.enableZoom(false));
      return;
    }
    if (!this.is3DOn) {
      this.isZooming = false;
      this.ngZone.runOutsideAngular(() => this.threeService.enableZoom(false));
    }
  }

  onMouseLeave(): void {
    if (!this.canUse2DZoom()) {
      this.isZooming = false;
      this.ngZone.runOutsideAngular(() => this.threeService.enableZoom(false));
      return;
    }
    if (!this.is3DOn) {
      this.isZooming = false;
      this.ngZone.runOutsideAngular(() => this.threeService.enableZoom(false));
    }
  }

  public get showBackgroundZoomPrompt(): boolean {
    return !this.is3DOn && this.isBackgroundSelectedInCarousel && !this.isBackgroundZoomEnabled;
  }

  public get isBackgroundSelected(): boolean {
    return this.isBackgroundSelectedInCarousel;
  }

  enableBackgroundZoom(event?: Event): void {
    event?.stopPropagation();
    if (this.is3DOn || !this.isBackgroundSelectedInCarousel) return;
    this.isBackgroundZoomEnabled = true;
    this.setFullCanvasZoomState(true);
    this.cd.markForCheck();
  }

  onVisualizerClick(event: MouseEvent): void {
    if (this.is3DOn || !this.isBackgroundSelectedInCarousel) return;
    event.stopPropagation();
    if (this.isBackgroundZoomEnabled) {
      this.isBackgroundZoomEnabled = false;
      this.isZooming = false;
      this.ngZone.runOutsideAngular(() => this.threeService.enableZoom(false));
      this.setFullCanvasZoomState(false);
    } else {
      this.isBackgroundZoomEnabled = true;
      this.setFullCanvasZoomState(true);
    }
    this.cd.markForCheck();
  }
  private fetchInitialData(params: any): void {
    this.isLoading = true;
    this.isCanvasReady = false;
    this.optionsLoaded = false;
    this.updateSkeletonState();
    this.errorMessage = null;
    const preloadedProductData = this.productPreloadService.consume(params?.product_id);
    const productData$ = preloadedProductData
      ? of(preloadedProductData)
      : this.apiService.getProductData(params);

    productData$.pipe(
      takeUntil(this.destroy$),
      switchMap((productData: any) => {
        if (productData.result?.EcomProductlist?.length > 0) {
          const data: ProductDetails = productData.result.EcomProductlist[0];
          this.shutter_product_details = productData.result.ShutterProductDetails;
          this.ecomproductname = data.pei_ecomProductName;
          this.productname = data.label;
          this.productslug = this.productname.toLowerCase().replace(/ /g, '-');
          this.updateProductTitle();
          if(this.productslug.toLowerCase().includes('roller')){
            this.iconname ="roller-blinds";
          }else if(this.productslug.toLowerCase().includes('vertical')){
            this.iconname ="vertical-blinds";
          }else if(this.productslug.toLowerCase().includes('venetian') || this.productslug.toLowerCase().includes('fauxwood')){
            this.iconname ="venetian-blinds";
          }else{
            this.iconname ="roller-blinds";
          }
          this.registerProductIcon();
            
          this.productdescription = data.pi_productdescription;
          this.pei_prospec = data.pei_prospec;
          this.hasProspecContent = this.hasContent(this.pei_prospec);
          this.hasDescriptionContent = this.hasContent(this.productdescription);
          this.category = Number(data.pi_category);
          if (this.category == 5) {
            this.fabricFieldType = 21
          } else if (this.category == 4) {
            this.fabricFieldType = 20;
          } else if (this.category == 3) {
            this.fabricFieldType = 5;
          }
          this.recipeid = data.recipeid;
          this.freesameple_status = data?.pei_ecomFreeSample ?? 0;
          this.product_id = params?.product_id ?? this.route.snapshot.params['product_id'],
          this.freesample_price = data?.pei_ecomsampleprice ?? 0;
          this.get_freesample();
          this.relatedframeimage =  data?.pi_frameimage ?? "";
         
          let productBgImages: string[] = [];
          try {
            productBgImages = JSON.parse(data.pi_backgroundimage || '[]');
          } catch (e) {
            console.error('Error parsing pi_backgroundimage:', e);
            productBgImages = [];
          }

          let productDefaultImage: any = {};
          let ecomProductName = '';
          try {
            productDefaultImage = JSON.parse(data.pi_deafultimage || '{}');
            ecomProductName = data.pei_ecomProductName;
          } catch (e) {
            console.error('Error parsing pi_deafultimage:', e);
            productDefaultImage = {};
            ecomProductName = "";
          }
          let frameImages: string[] = [];
          try {
            frameImages = JSON.parse(data.pi_frameimage || '[]');
          } catch (e) {
            console.error('Error parsing pi_frameimage:', e);
            frameImages = [];
          }

          const defaultImageSettings = productDefaultImage?.defaultimage || {};
          const defaultFrameFilename = defaultImageSettings?.backgrounddefault || '';
          const frameDefaultFilename = defaultImageSettings?.framedefault || '';
          let frameFullUrl = '';
          frameImages.forEach(imgPath => {
            const isDefault = frameDefaultFilename && imgPath.includes(frameDefaultFilename);

            const pathParts = imgPath.split('/');
            const filename = pathParts.pop() || '';
            const encodedFilename = encodeURIComponent(filename);
            const encodedImgPath = [...pathParts, encodedFilename].join('/');

            const fullUrl = this.img_file_path_url + encodedImgPath;

            if (isDefault) {
              this.relatedframeimage = fullUrl;
            }
          });

          this.product_img_array = productBgImages.map(imgFilename => {
            const isDefault = defaultFrameFilename && imgFilename.includes(defaultFrameFilename);
            const pathParts = imgFilename.split('/');
            const filename = pathParts.pop() || '';
            const encodedFilename = encodeURIComponent(filename);
            const encodedImgPath = [...pathParts, encodedFilename].join('/');
            const imageUrl = this.img_file_path_url + encodedImgPath;

            if (isDefault) {
              this.frame_default_url = imageUrl;
              this.mainframe = imageUrl;
            }
            return { image_url: imageUrl, is_default: isDefault };
          });

          if (!this.mainframe && this.product_img_array.length > 0) {
            const firstImage = this.product_img_array[0];
            this.frame_default_url = firstImage.image_url;
            this.mainframe = firstImage.image_url;
            firstImage.is_default = true;
          }

          // Precompute composed thumbnails
          this.prepareFrameThumbnails();
          this.setupVisualizer(ecomProductName);
        }
        return this.apiService.getProductParameters(params, this.recipeid);
      }),
      switchMap((data: any) => {
        if (data && data[0]) {
          const response = data[0];
          this.parameters_data = response.data || [];
          this.markDerivedDirty();
          this.apiUrl = params.api_url;
          this.routeParams = params;
        this.chosenAccessoriesFieldId = this.routeParams.fabric_id;
        this.chosenAccessoriesOptionId = this.routeParams.pricing_group;
          this.netpricecomesfrom = response.netpricecomesfrom;
          this.costpricecomesfrom = response.costpricecomesfrom;
          this.initializeFormControls();
          this.priceGroupField = this.parameters_data.find(f => f.fieldtypeid === 13);
          this.supplierField = this.parameters_data.find(f => f.fieldtypeid === 17);
          this.qtyField = this.parameters_data.find(f => f.fieldtypeid === 14);
          this.widthField = this.parameters_data.find(f => [7, 8, 11, 31].includes(f.fieldtypeid));
          this.dropField = this.parameters_data.find(f => [9, 10, 12, 32].includes(f.fieldtypeid));
          this.unitField = this.parameters_data.find(f => f.fieldtypeid === 34);
          this.get_freesample();
		      this.show_image_icons = true;
          if(2 == this.category){
                this.show_image_icons = false;
          }
          return forkJoin({
            optionData: this.loadOptionData(params),
            minMaxData: this.apiService.getminandmax(
              this.routeParams,
              this.routeParams.color_id,
              this.unittype,
              this.routeParams.pricing_group,
              this.fabricFieldType
            ),
            recipeList: this.apiService.getRecipeList(params),
            FractionList: this.apiService.getFractionList(params)
          });
        }

        this.errorMessage = 'Invalid product data received';
        return of(null);
      }),
      tap((results: any) => {
        if (results) {
          this.optionsLoaded = true;
          this.updateSkeletonState();
          this.parameters_data.forEach(field => {
            const control = this.orderForm.get(`field_${field.fieldid}`);
            if (control && field.ruleoverride === 0) {
              control.disable();
            } else if (control) {
              control.enable();
            }
            if (control && this.qtyField && field.fieldid === this.qtyField.fieldid) {
              this.updateFieldValues(this.qtyField, 1, 'fetchInitialDataqty');
              control.setValue(1, { emitEvent: false });
            }
          });

          const minmaxdata = results.minMaxData?.data;
          this.min_width = minmaxdata?.widthminmax?.min ?? null;
          this.min_drop = minmaxdata?.dropminmax?.min ?? null;
          this.max_width = minmaxdata?.widthminmax?.max ?? null;
          this.max_drop = minmaxdata?.dropminmax?.max ?? null;

          if (results.recipeList?.[0]?.data?.[0]) {
            const recipe = results.recipeList[0].data[0];
            this.rulescount = recipe.rulescount;
            this.formulacount = recipe.formulacount;
          }
          if (results.FractionList?.result) {
            const fraction = results.FractionList.result;
            this.unittypename = fraction.fractioname;
            this.inchfractionselected = fraction.inchfractionselected;
            this.unittype = fraction.unitypeid;
            if (fraction.inchfraction) {
              this.inchfraction_array = fraction.inchfraction;
              this.showFractions = true;
            }
            if (this.unitField && this.unitField.optionsvalue) {
              const selectedunitOption = this.unitField.optionsvalue.find(opt => `${opt.optionid}` === `${this.unittype}`);
              this.updateFieldValues(this.unitField, selectedunitOption, 'updateunittype');
            }
          }
        }
      }),
      catchError(err => {
        console.error('Error fetching product data:', err);
        this.optionsLoaded = true;
        this.updateSkeletonState();
        // Navigate to 404 page on product data load failure
        try {
          this.router.navigate(['/', '404']);
        } catch (e) {
          // fallback to local error message if navigation fails
          this.errorMessage = 'Failed to load product data. Please try again.';
        }
        return of(null);
      }),
      finalize(() => {
        this.isLoading = false;
        this.optionsLoaded = true;
        this.updateSkeletonState();
      })
    ).subscribe();
  }




  private initializeFormControls(): void {

    const formControls: Record<string, any> = {
      unit: ['mm', Validators.required],
      widthfraction: [0],
      dropfraction: [0],
      qty: [1, [Validators.required, Validators.min(1)]]
    };

    this.parameters_data.forEach(field => {
      field.level = 1;
      if (field.showfieldecomonjob == 1) {
        const validators = [];
        if (field.mandatory == 1) {
          validators.push(Validators.required);
        }

        if (this.get_field_type_name(field.fieldtypeid) === 'number' && field.numeric_setcondition == 1) {
          if (field.numeric_minvalue !== null && field.numeric_minvalue !== undefined) {
            validators.push(Validators.min(field.numeric_minvalue));
          }
          if (field.numeric_maxvalue !== null && field.numeric_maxvalue !== undefined) {
            validators.push(Validators.max(field.numeric_maxvalue));
          }
        }

        formControls[`field_${field.fieldid}`] = [
          field.value || '',
          validators
        ];
      }
    });

    this.orderForm = this.fb.group(formControls);
    this.previousFormValue = this.orderForm.value;
    //console.log('parameters_data after form initialization:', JSON.parse(JSON.stringify(this.parameters_data)));
    this.orderForm.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(values => {
      this.onFormChanges(values, this.routeParams);
    });
    this.parameters_data.forEach(field => {
      const typeName = this.get_field_type_name(field.fieldtypeid);
      if (["list", "materials"].includes(typeName)) {
        const id = field.fieldid;

        if (!this.searchCtrl[id]) {
          this.searchCtrl[id] = new FormControl('');
        }

        if (!this.filteredOptions[id]) {
          this.filteredOptions[id] = this.option_data[id] || [];
        }

        // Bind search to filter current option_data once it loads
        this.searchCtrl[id].valueChanges
          .pipe(
            debounceTime(150),
            map(v => (v || '').toString().toLowerCase().trim()),
            distinctUntilChanged(),
            takeUntil(this.destroy$)
          )
          .subscribe(term => {
            const all = this.option_data[id] || [];
            if (!this.enableSelectSearch) {
              this.filteredOptions[id] = [...all];
              this.cd.markForCheck();
              return;
            }
            this.filteredOptions[id] = term === '' ? [...all] : all.filter(
              opt => (opt?.optionname || '').toLowerCase().includes(term)
            );
            this.cd.markForCheck();
          });
      }
    });
  }

  /**
   * Load top-level option data for fields that require it (3,5,20 etc.)
   */
  private loadOptionData(params: any): Observable<any> {
    return this.apiService.filterbasedlist(params, '', '', '', this.pricegroup, this.colorid, this.fabricid, this.unittype, this.fabricFieldType).pipe(
      takeUntil(this.destroy$),
      switchMap((filterData: any) => {

        // if no optionarray, return empty responses
        if (!filterData?.[0]?.data?.optionarray) return of([]);

        const filterresponseData = filterData[0].data;
        const optionRequests: Observable<any>[] = [];

        this.parameters_data.forEach((field: ProductField) => {
          // top-level select-like fields that need optionlist fetch
          if ([3, 5, 20, 21].includes(field.fieldtypeid)) {
            let matrial = 0;
            let filter = '';

            if (field.fieldtypeid === 3) {
              matrial = 0;
              filter = filterresponseData.optionarray[field.fieldid];
            } else if (field.fieldtypeid === 5) {
              console.log(field);
              this.fabricLabelName = field.fieldname;
              matrial = 1;
              filter = filterresponseData.coloridsarray;
            } else if (field.fieldtypeid === 20) {
              this.colorLabelName = field.fieldname;
              matrial = 2;
              filter = filterresponseData.coloridsarray;
            } else if (field.fieldtypeid === 21) {
              this.fabricLabelName = field.fieldname;
              matrial = 0;
              filter = filterresponseData.coloridsarray;
            }

            optionRequests.push(
              this.apiService.getOptionlist(
                params,
                1,
                field.fieldtypeid,
                matrial,
                field.fieldid,
                filter,
                this.recipeid
              ).pipe(
                map((optionData: any) => ({ fieldId: field.fieldid, optionData })),
                catchError(err => {
                  console.error(`Error loading options for field ${field.fieldid}:`, err);
                  return of(null);
                })
              )
            );
          } else if ([14, 34, 17, 13, 4].includes(field.fieldtypeid)) {
            // fields that don't need external option fetch but need default value set
            const control = this.orderForm.get(`field_${field.fieldid}`);
            if (control) {
              let valueToSet: any = '';

              if (field.fieldtypeid === 14) {
                valueToSet = 1;
              } else if (field.fieldtypeid === 17) {
                this.supplier_id = (field.optiondefault !== undefined && field.optiondefault !== null && field.optiondefault !== '')
                  ? Number(field.optiondefault)
                  : (Array.isArray(field.optionsvalue) && field.optionsvalue.length > 0 ? Number(field.optionsvalue[0].id || field.optionsvalue[0].optionid || 0) : null);
                valueToSet = this.supplier_id ?? '';
              } else {
                valueToSet = (field.optiondefault !== undefined && field.optiondefault !== null && field.optiondefault !== '')
                  ? Number(field.optiondefault)
                  : '';
              }

              control.setValue(valueToSet, { emitEvent: false });
              if (field.fieldtypeid === 34) {
                this.unittype = valueToSet;
              } else if (field.fieldtypeid === 13) {
                this.pricegroup = valueToSet;
              }
              if (field.fieldtypeid === 17) {
                this.supplierOption = field.optionsvalue;
              } else if (field.fieldtypeid === 13) {
                this.priceGroupOption = field.optionsvalue;
              } else if (field.fieldtypeid === 34) {
                this.unitOption = field.optionsvalue;
              }
              if (field && field.optionsvalue) {
                const selectedOption = field.optionsvalue.find(opt => `${opt.optionid}` === `${valueToSet}`);
                this.updateFieldValues(field, selectedOption, ' defaultunittpyeprictypesupplier');
              }
            }
          }
        });

        return optionRequests.length > 0
          ? forkJoin(optionRequests).pipe(map(responses => responses.filter(r => r !== null)))
          : of([]);
      }),
      map((responses: any[]) => {
        responses.forEach((response: { fieldId: number, optionData: any }) => {
          const field = this.parameters_data.find(f => f.fieldid === response.fieldId);
          if (!field) return;

          const options = response.optionData?.[0]?.data?.[0]?.optionsvalue;
          const filteredOptions = Array.isArray(options)
            ? options.filter((option: any) => option.availableForEcommerce !== 0)
            : [];

          if (filteredOptions.length === 0) {
            // remove control if no options available
            if (this.orderForm.contains(`field_${field.fieldid}`)) {
              this.orderForm.removeControl(`field_${field.fieldid}`);
            }
            return;
          }

          this.option_data[field.fieldid] = filteredOptions;
          this.markDerivedDirty();
          // Recompute filteredOptions using current search term (if any)
          const existingSearch = this.enableSelectSearch
            ? (this.searchCtrl[field.fieldid]?.value || '').toString().toLowerCase().trim()
            : '';
          const all = filteredOptions || [];
          this.filteredOptions[field.fieldid] = existingSearch === ''
            ? [...all]
            : all.filter((opt: any) => (opt?.optionname || '').toLowerCase().includes(existingSearch));
          this.cd.markForCheck();
          const control = this.orderForm.get(`field_${field.fieldid}`);

          if (control) {
            let valueToSet: any;
            // Set option default in Accessories type on page load.
            if('single_view' != this.routeParams?.fabric && 2 == this.category && this.chosenAccessoriesFieldId == field.fieldid){
                field.optiondefault = this.chosenAccessoriesOptionId;
            }
            if (field.fieldtypeid === 3 && field.selection == 1) {
              valueToSet = field.optiondefault
                ? field.optiondefault.toString().split(',').filter((val: string) => val !== '').map(Number)
                : [];
            } else if (field.fieldtypeid === 20) {
              valueToSet = +params.color_id || '';
            } else if (field.fieldtypeid === 5 || field.fieldtypeid === 21) {
              valueToSet = +params.fabric_id || '';
            } else {
              valueToSet = (field.optiondefault !== undefined && field.optiondefault !== null && field.optiondefault !== '')
                ? Number(field.optiondefault)
                : '';
            }
            control.setValue(valueToSet, { emitEvent: false });
            if (valueToSet !== null && valueToSet !== '' && valueToSet !== undefined) {
              setTimeout(() => this.handleOptionSelectionChange(params, field, valueToSet, true), 0);
            }
          }
        });

        this.parameters_data = this.parameters_data.filter((field: ProductField) => {
          if ([34, 17, 13, 4].includes(field.fieldtypeid)) {
            return Array.isArray(field.optionsvalue) && field.optionsvalue.length > 0;
          } else if ([3, 5, 20, 21].includes(field.fieldtypeid)) {
            return this.option_data[field.fieldid]?.length > 0;
          }
          return true;
        });
        this.markDerivedDirty();

        return true;
      }),
      catchError(err => {
        console.error('Error in option data loading:', err);
        return of(null);
      })
    );
  }

  /**
   * Called whenever a field's option selection changes (top-level or subfield).
   * Responsible for clearing existing subfields and re-loading as necessary.
   */
  private handleOptionSelectionChange(params: any, field: ProductField, value: any, isInitial: boolean = false): void {

    if (!field) return;
    this.removeSelectedOptionData([field]);
    if (value === null || value === undefined || value === '') {
      if ((field.fieldtypeid === 5 && field.level == 1) || (field.fieldtypeid === 21 && field.level == 1)) {
        this.fabricid = 0;
        this.colorid = 0;
        this.updateMinMaxValidators(false);
        this.background_color_image_url = "";
        this.invalidateFrameThumbnails();
        this.setupVisualizer(this.productname);
        this.syncBackgroundImageInCarousel();
      }
      if ((field.fieldtypeid === 5 && field.level == 2) || field.fieldtypeid === 20 || (field.fieldtypeid === 21 && field.level == 2)) {
        this.colorid = 0;
        this.updateMinMaxValidators(false);
        this.background_color_image_url = "";
        this.invalidateFrameThumbnails();
        this.setupVisualizer(this.productname);
        this.syncBackgroundImageInCarousel();
      }
      if(field.fieldtypeid === 5 ||  field.fieldtypeid === 20){
        this.get_relatedproduct_data();
      }
      this.updateFieldValues(field, null, 'valueChangedToEmpty');
      this.clearExistingSubfields(field.fieldid, field.allparentFieldId);
      this.get_freesample();
      this.setShutterObject(field,null);
   
      return;
    }

    this.clearExistingSubfields(field.fieldid, field.allparentFieldId);

    const options = this.option_data[field.fieldid];
    if (!options || options.length === 0) return;

    if (Array.isArray(value)) {
      const selectedOptions = options.filter(opt => value.includes(opt.optionid));
      if (selectedOptions.length === 0) return;

      from(selectedOptions).pipe(
        mergeMap(option => this.processSelectedOption(params, field, option)),
        toArray(),
        takeUntil(this.destroy$)
      ).subscribe(() => {
        // Accessories Type.
        if('single_view' != this.routeParams?.fabric && 2 == this.category){
            const selected_accessories_data = this.option_data[this.chosenAccessoriesFieldId];
            if(selected_accessories_data.length > 0){
                var chosen_accessories_list:any = [];
                if(selected_accessories_data){
                  chosen_accessories_list = selected_accessories_data.filter(opt => opt.optionid == this.chosenAccessoriesOptionId);
                }
                if(chosen_accessories_list[0].optionimage){
                  this.threeService.updateTextures2d(this.apiUrl + '/api/public' + chosen_accessories_list[0].optionimage, ""); 
                }else{
                  this.threeService.updateTextures2d("assets/no-image.jpg", "");
                }
          }
      }
        if(this.category == 5){
          const chosenOptions = selectedOptions.length ? selectedOptions[selectedOptions.length - 1] : null;
          this.setShutterObject(field,chosenOptions);
        }
        this.updateFieldValues(field, selectedOptions, 'Array.isArrayOptions');
        this.cd.markForCheck();
      });

    } else {
      const selectedOption = options.find(opt => `${opt.optionid}` === `${value}`);
      if (!selectedOption) return;
      
      const canUpdate = !isInitial || (field.optiondefault && params.color_id);
      const normalizedFieldName = this.normalizeFieldName(field.fieldname);
      const isMaterialField = (field.fieldtypeid === 5 || field.fieldtypeid === 21) && field.level == 1;

      if (!isInitial && isMaterialField) {
        this.colorid = 0;
        this.colorname = '';
        this.background_color_image_url = '';
        this.invalidateFrameThumbnails();
        this.resetFrameToDefault();
        this.setupVisualizer(this.productname);
        this.syncBackgroundImageInCarousel();
      }

      if ((field.fieldtypeid === 5 && field.level == 1) || (field.fieldtypeid === 21 && field.level == 1)) {
        this.fabricid = value;
        this.fabricname = selectedOption.optionname;
        this.updateProductTitle();
      }
      if ((field.fieldtypeid === 5 && field.level == 2) || field.fieldtypeid === 20 || (field.fieldtypeid === 21 && field.level == 2)) {
        this.colorid = value;
        this.colorname = selectedOption.optionname;
        this.updateProductTitle();
      }
      if (canUpdate && (field.fieldtypeid === 5 && field.level == 2 || field.fieldtypeid === 20) && selectedOption.optionimage) {
        this.background_color_image_url = this.apiUrl + '/api/public' + selectedOption.optionimage;
        this.get_freesample();
        if (this.is3DOn) {
          this.threeService.updateTextures(this.background_color_image_url);
        } else {
          this.update2DTexturesForSelection();
        }
        this.invalidateFrameThumbnails();
        this.prepareFrameThumbnails();
        this.syncBackgroundImageInCarousel();
      }

      if (canUpdate && field.fieldtypeid === 3 && normalizedFieldName === this.curtainColorKey && selectedOption.optionimage) {
        this.selected_curtain_option = Number(selectedOption.optionid) || 0;
        this.threeService.updateTextures(this.apiUrl + '/api/public' + selectedOption.optionimage);
        this.CurtainLabelName = field.fieldname;
      }
      if (canUpdate && field.fieldtypeid === 3 && normalizedFieldName === this.frameColorKey && selectedOption.optionimage) {
        this.selected_frame_option = Number(selectedOption.optionid) || 0;
        this.threeService.updateFrame(this.apiUrl + '/api/public' + selectedOption.optionimage);
        this.FrameLabelName = field.fieldname;
      }
      // Accessories Type.
      if('single_view' != this.routeParams?.fabric && 2 == this.category){
            const selected_accessories_data = this.option_data[this.chosenAccessoriesFieldId];
            if(selected_accessories_data.length > 0){
                var chosen_accessories_list:any = [];
                if(selected_accessories_data){
                  chosen_accessories_list = selected_accessories_data.filter(opt => opt.optionid == this.chosenAccessoriesOptionId);
                }
                if(chosen_accessories_list[0].optionimage){
                  this.threeService.updateTextures2d(this.apiUrl + '/api/public' + chosen_accessories_list[0].optionimage, ""); 
                }else{
                  this.threeService.updateTextures2d("assets/no-image.jpg", "");
                }
          }
      }
      const shouldUpdatePriceGroup = (field.fieldtypeid === 5 && field.level == 1 && selectedOption.pricegroupid) || field.fieldtypeid === 20 || (field.fieldtypeid === 21 && field.level == 1);
      let preSublist$ = of(null);

      if (shouldUpdatePriceGroup) {
        this.pricegroup = selectedOption.pricegroupid;
        if (this.priceGroupField) {
          const control = this.orderForm.get(`field_${this.priceGroupField.fieldid}`);
          if (control) {
            control.setValue(this.pricegroup, { emitEvent: false });

            const selectedOption = this.priceGroupOption.find((opt: { optionid: any; }) => `${opt.optionid}` === `${this.pricegroup}`);
            this.updateFieldValues(this.priceGroupField, selectedOption, 'pricegrouponColor');
          } else {
            if (this.priceGroupField.optionsvalue) {
              const selectedOption = this.priceGroupField.optionsvalue.find(opt => `${opt.optionid}` === `${this.pricegroup}`)
              this.updateFieldValues(this.priceGroupField, selectedOption, 'pricegrouponColor');
            }
          }
        }
        preSublist$ = this.apiService.filterbasedlist(params, '', String(field.fieldtypeid), String(field.fieldid), this.pricegroup, this.colorid, this.fabricid, this.unittype, this.fabricFieldType)
          .pipe(
            tap((filterData: any) => {
              this.supplier_id = filterData[0].data.selectsupplierid;
              if (this.supplierField) {
                const control = this.orderForm.get(`field_${this.supplierField.fieldid}`);
                if (control) {
                  control.setValue(Number(this.supplier_id), { emitEvent: false });
                  const selectedOption = this.supplierOption.find((opt: { optionid: any; }) => `${opt.optionid}` === `${this.supplier_id}`);
                  this.updateFieldValues(this.supplierField, selectedOption, 'suppieronColor');
                } else {
                  if (this.supplierField.optionsvalue) {
                    const selectedOption = this.supplierField.optionsvalue.find(opt => `${opt.optionid}` === `${this.supplier_id}`)
                    this.updateFieldValues(this.supplierField, selectedOption, 'suppieronColor');
                  }
                }
              }
            })
          );
      }

      preSublist$
        .pipe(
          switchMap(() => this.processSelectedOption(params, field, selectedOption)),
          takeUntil(this.destroy$)
        )
        .subscribe(() => {
          if (!shouldUpdatePriceGroup) {
            this.updateFieldValues(field, selectedOption, 'restOption');
          }

          if ((field.fieldtypeid === 5 && field.level == 1) || (field.fieldtypeid === 21 && field.level == 1)) {
            this.fabricid = value;
            this.fabricname = selectedOption.optionname;
            this.updateMinMaxValidators(false);
            this.updateFieldValues(field, selectedOption, 'updatefabric');
          }
          if ((field.fieldtypeid === 5 && field.level == 2) || field.fieldtypeid === 20 || (field.fieldtypeid === 21 && field.level == 2)) {
            this.colorid = value;
            this.colorname = selectedOption.optionname;
            this.updateFieldValues(field, selectedOption, 'updatecolor');
            this.updateMinMaxValidators(true);
          }

          this.freesample = { ...this.freesample, fabricid: this.fabricid, color_id: this.colorid };
          if(field.fieldtypeid === 5 ||  field.fieldtypeid === 20){
             this.get_relatedproduct_data();
          }
          if(this.category == 5){
             this.setShutterObject(field,selectedOption);
             this.setShutterImage();
          }
          this.cd.markForCheck();
        });
    }
    if(2 == this.category && 'single_view' != this.routeParams?.fabric){
      this.updateProductTitle();
    }
  }
  buildVisualizerUrl(product: any) {
    const slug1 = product.productname.toLowerCase().replace(/ /g, '-');
    const slug2 = (product.fabricname + '-' + product.colorname)
                    .toLowerCase().replace(/ /g, '-');
    const cartProductId = this.resolveCartProductId();

    return `${this.siteurl}/visualizer/${this.product_id}/${slug1}/${slug2}/${product.fd_id}/${product.cd_id}/${product.groupid}/${product.supplierid}/${cartProductId}`;
  }
  get canGoBackToListing(): boolean {
    const isListingCategory = this.category === 3 || this.category === 4;
    if (!isListingCategory) {
      return false;
    }

    if (this.listingReturnUrl) {
      return true;
    }
    const productId = this.route.snapshot.params['product_id'] || this.routeParams?.product_id || this.product_id;
    return !!productId;
  }

  goBackToListing(): void {
    if (this.listingReturnUrl) {
      if (typeof window !== 'undefined' && window.history.length > 1) {
        window.history.back();
      } else {
        this.router.navigateByUrl(this.listingReturnUrl);
      }
      return;
    }

    this.router.navigate(this.getListingRouteCommands());
  }

  private getListingRouteCommands(): any[] {
    const productId = this.route.snapshot.params['product_id'] || this.routeParams?.product_id || this.product_id;
    const routeProductSlug = this.route.snapshot.params['product'] || this.routeParams?.product;
    const productSlug = this.toRouteSlug(routeProductSlug || this.productslug || this.productname || this.ecomproductname);
    const cartProductId = this.resolveCartProductId();

    if (productId && cartProductId) {
      return ['/listing', productId, productSlug, cartProductId];
    }
    if (productId) {
      return ['/listing', productId, productSlug];
    }
    return ['/'];
  }

  private toRouteSlug(value: string): string {
    const normalized = String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return normalized || 'product';
  }
  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/no-image.jpg';
  }
  private updateMinMaxValidators(color: boolean): void {
    this.min_width = null;
    this.max_width = null;
    this.min_drop = null;
    this.max_drop = null;
    if (color) {
      var colorid = String(this.colorid);
    } else {
      var colorid = "";
    }
    this.apiService.getminandmax(this.routeParams, colorid, this.unittype, Number(this.pricegroup), this.fabricFieldType)
      .pipe(takeUntil(this.destroy$))
      .subscribe(minmaxdata => {
        const data = minmaxdata?.data;
        this.min_width = data?.widthminmax?.min ?? null;
        this.min_drop = data?.dropminmax?.min ?? null;
        this.max_width = data?.widthminmax?.max ?? null;
        this.max_drop = data?.dropminmax?.max ?? null;
        if (this.widthField) {
          const widthControl = this.orderForm.get(`field_${this.widthField.fieldid}`);
          if (widthControl) {
            const widthValidators = [Validators.required];
            if (this.min_width != null) {
              widthValidators.push(Validators.min(this.min_width));
            }
            if (this.max_width != null) {
              widthValidators.push(Validators.max(this.max_width));
            }
            widthControl.setValidators(widthValidators);
            widthControl.updateValueAndValidity();
          }
        }

        if (this.dropField) {
          const dropControl = this.orderForm.get(`field_${this.dropField.fieldid}`);
          if (dropControl) {
            const dropValidators = [Validators.required];
            if (this.min_drop != null) {
              dropValidators.push(Validators.min(this.min_drop));
            }
            if (this.max_drop != null) {
              dropValidators.push(Validators.max(this.max_drop));
            }
            dropControl.setValidators(dropValidators);
            dropControl.updateValueAndValidity();
          }
        }
      });
  }
  onFrameChange(selectedFrame: any): void {
    if (!selectedFrame) return;

    if (selectedFrame?.is_background) {
      this.isBackgroundSelectedInCarousel = true;
      this.isBackgroundZoomEnabled = false;
      this.isZooming = false;
      this.ngZone.runOutsideAngular(() => this.threeService.enableZoom(false));
      this.setFullCanvasZoomState(false);
      this.update2DTexturesForSelection();
      this.syncBackgroundImageInCarousel();
      this.cd.markForCheck();
      return;
    }

    const newFrameUrl = selectedFrame?.image_url;
    if (!newFrameUrl) return;

    this.isBackgroundSelectedInCarousel = false;
    this.isBackgroundZoomEnabled = false;
    this.isZooming = false;
    this.ngZone.runOutsideAngular(() => this.threeService.enableZoom(false));
    this.setFullCanvasZoomState(false);
    this.mainframe = newFrameUrl;

    this.product_img_array.forEach(img => {
      img.is_default = (img.image_url === newFrameUrl);
    });

    this.update2DTexturesForSelection();
    this.syncBackgroundImageInCarousel();
  }

  private getFrameItems(): any[] {
    return [...(this.product_img_array || [])];
  }

  private getCurrentFrameIndex(frames: any[]): number {
    if (!frames.length) return -1;
    if (this.isBackgroundSelectedInCarousel) {
      const backgroundIndex = frames.findIndex(frame => frame?.is_background);
      if (backgroundIndex >= 0) return backgroundIndex;
    }
    if (this.mainframe) {
      const index = frames.findIndex(frame => frame?.image_url === this.mainframe);
      if (index >= 0) return index;
    }
    const defaultIndex = frames.findIndex(frame => frame?.is_default);
    return defaultIndex >= 0 ? defaultIndex : 0;
  }

  private switchFrameByStep(step: number): void {
    const frames = this.getFrameItems();
    if (frames.length < 2) return;
    const currentIndex = this.getCurrentFrameIndex(frames);
    const startIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (startIndex + step + frames.length) % frames.length;
    this.onFrameChange(frames[nextIndex]);
  }

  onPrevFrameClick(event?: MouseEvent): void {
    event?.stopPropagation();
    this.switchFrameByStep(-1);
  }

  onNextFrameClick(event?: MouseEvent): void {
    event?.stopPropagation();
    this.switchFrameByStep(1);
  }
  public getFrameImageUrl(product_img: any): string {
    const frameUrl = product_img?.image_url || '';
    if (!frameUrl) return '';

    const bgUrl = this.background_color_image_url;
    if (!bgUrl) return frameUrl;

    const key = `${frameUrl}::${bgUrl}`;
    const composed = this.composedFrameThumbsMap[key];
    if (composed) return composed;

    if (!this.composingFrameKeys.has(key)) {
      this.composingFrameKeys.add(key);
      this.composeFrameAndBackground(frameUrl, bgUrl)
        .then((dataUrl) => {
          if (dataUrl) this.composedFrameThumbsMap[key] = dataUrl;
        })
        .catch(() => { /* ignore */ })
        .finally(() => {
          this.composingFrameKeys.delete(key);
          this.cd.markForCheck();
        });
    }
    return frameUrl;
  }
  public getRawFrameUrl(product_img: any): string {
    return product_img?.image_url || '';
  }
  public isSelectedFrame(product_img: any): boolean {
    if (this.isBackgroundSelectedInCarousel) {
      return !!product_img?.is_background;
    }
    return product_img?.is_default || false;
  }

  private composeKey(frameUrl: string, bgUrl: string): string {
    return `${frameUrl}::${bgUrl}`;
  }

  private invalidateFrameThumbnails(): void {
    this.composedFrameThumbsMap = {};
    this.composingFrameKeys.clear();
  }

  private prepareFrameThumbnails(): void {
    if (!this.enableFrameThumbnails) return;
    if (!this.background_color_image_url || !this.product_img_array?.length) return;
    const bg = this.background_color_image_url;
    for (const img of this.product_img_array) {
      const frame = img?.image_url;
      if (!frame) continue;
      const key = this.composeKey(frame, bg);
      if (this.composedFrameThumbsMap[key] || this.composingFrameKeys.has(key)) continue;
      this.composingFrameKeys.add(key);
      this.composeFrameAndBackground(frame, bg)
        .then((dataUrl) => {
          if (dataUrl) this.composedFrameThumbsMap[key] = dataUrl;
        })
        .catch(() => { /* ignore */ })
        .finally(() => {
          this.composingFrameKeys.delete(key);
          this.cd.markForCheck();
        });
    }
  }

  private syncBackgroundImageInCarousel(): void {
    if (!this.enableFrameThumbnails) return;
    const existingIndex = this.product_img_array.findIndex(img => img?.is_background);

    if (!this.background_color_image_url) {
      this.isBackgroundSelectedInCarousel = false;
      this.isBackgroundZoomEnabled = false;
      this.setFullCanvasZoomState(false);
      if (existingIndex >= 0) {
        const updated = [...this.product_img_array];
        updated.splice(existingIndex, 1);
        this.product_img_array = updated;
        this.cd.markForCheck();
      }
      return;
    }

    const backgroundEntry = {
      image_url: this.background_color_image_url,
      is_default: false,
      is_background: true
    };

    if (existingIndex >= 0) {
      const updated = [...this.product_img_array];
      updated[existingIndex] = { ...updated[existingIndex], ...backgroundEntry };
      this.product_img_array = updated;
    } else {
      this.product_img_array = [...this.product_img_array, backgroundEntry];
    }
    this.cd.markForCheck();
  }

  private resetFrameToDefault(): void {
    const fallback = this.frame_default_url || this.product_img_array?.[0]?.image_url || '';
    if (!fallback) return;

    this.isBackgroundSelectedInCarousel = false;
    this.isBackgroundZoomEnabled = false;
    this.setFullCanvasZoomState(false);
    this.mainframe = fallback;
    this.product_img_array = (this.product_img_array || []).map(img => ({
      ...img,
      is_default: img?.image_url === fallback
    }));
  }

  private update2DTexturesForSelection(): void {
    if (!this.threeService) return;
    const useBackgroundOnly = this.isBackgroundSelectedInCarousel;
    const frameUrl = useBackgroundOnly ? this.background_color_image_url : this.mainframe;
    if (!frameUrl) return;
    const backgroundUrl = useBackgroundOnly ? '' : this.background_color_image_url;
    this.threeService.setZoomHoleEnabled(!useBackgroundOnly);
    this.threeService.setFullCanvasZoom(false);
    this.threeService.updateTextures2d(frameUrl, backgroundUrl || '');
    this.update2DContainerHeightFromFrame();
    // After container resizes based on frame, refit background into frame hole
    setTimeout(() => this.threeService.refit2d(), 0);
  }

  private canUse2DZoom(): boolean {
    if (this.is3DOn) return false;
    if (this.isBackgroundSelectedInCarousel) {
      return this.isBackgroundZoomEnabled;
    }
    return true;
  }

  private setFullCanvasZoomState(enabled: boolean): void {
    const container = this.containerRef?.nativeElement;
    if (enabled && container) {
      if (this.previousZoomFactor === null) {
        this.previousZoomFactor = this.threeService.getZoomFactor();
      }
      this.threeService.setZoomFactor(this.fullCanvasZoomFactor);
      const rect = container.getBoundingClientRect();
      this.threeService.setZoom(rect.width / 2, rect.height / 2);
      this.isZooming = true;
      this.ngZone.runOutsideAngular(() => this.threeService.enableZoom(true));
    } else {
      if (this.previousZoomFactor !== null) {
        this.threeService.setZoomFactor(this.previousZoomFactor);
        this.previousZoomFactor = null;
      }
      this.isZooming = false;
      this.ngZone.runOutsideAngular(() => this.threeService.enableZoom(false));
    }
    this.threeService.setFullCanvasZoom(enabled);
  }

  /**
   * If an option itself has subdata, fetch them (sublist) and add subfields.
   */
  private processSelectedOption(params: any, parentField: ProductField, option: ProductOption): Observable<any> {
    if (!option?.subdatacount || option.subdatacount <= 0) return of(null);

    const parentLevel = parentField.level || 1;
    if (parentLevel >= this.MAX_NESTING_LEVEL) return of(null);

    return this.apiService.sublist(
      params,
      parentLevel + 1,
      parentField.fieldtypeid,
      option.fieldoptionlinkid,
      option.optionid,
      parentField.masterparentfieldid,
      this.supplier_id,
      this.recipeid
    ).pipe(
      takeUntil(this.destroy$),
      switchMap((subFieldResponse: any) => {
        const sublist = subFieldResponse?.[0]?.data;
        if (!Array.isArray(sublist)) return of(null);

        // filter to only fields that we know how to handle
        const relevant = sublist.filter((subfield: ProductField) =>
          [3, 5, 20, 21, 18, 6].includes(subfield.fieldtypeid)
        );

        if (relevant.length === 0) return of(null);

        return from(relevant).pipe(
          mergeMap(subfield => this.processSubfield(params, subfield, parentField, parentLevel + 1)),
          toArray()
        );
      }),
      catchError(err => {
        console.error('Error processing selected option:', err);
        return of(null);
      })
    );
  }

  /**
   * Insert subfield into parameters_data (if not already present), add form control, and load its options.
   */
  private processSubfield(
    params: any,
    subfield: ProductField,
    parentField: ProductField,
    level: number
  ): Observable<any> {
    const apiChildren = subfield.subchild;
    const subfieldForState = { ...subfield, subchild: [] as ProductField[] };

    subfieldForState.parentFieldId = parentField.fieldid;
    subfieldForState.level = level;
    subfieldForState.masterparentfieldid = parentField.masterparentfieldid || parentField.fieldid;
    subfieldForState.allparentFieldId = parentField.allparentFieldId
      ? `${parentField.allparentFieldId},${subfieldForState.fieldid}`
      : `${parentField.fieldid},${subfieldForState.fieldid}`;

    const alreadyExistsFlat = this.parameters_data.some(f => f.fieldid === subfieldForState.fieldid && f.allparentFieldId === subfieldForState.allparentFieldId);
    if (alreadyExistsFlat) {
      return of(null); // Do not process or add if it already exists in the flat list
    }

    // Add to the flat list
    const parentIndex = this.parameters_data.findIndex(f => f.fieldid === parentField.fieldid && f.allparentFieldId === parentField.allparentFieldId);
    if (parentIndex !== -1) {
      this.parameters_data.splice(parentIndex + 1, 0, subfieldForState);
    } else {
      this.parameters_data.push(subfieldForState);
    }

    // Add to the nested subchild array of the parent, only if not already present
    if (!parentField.subchild) {
      parentField.subchild = [];
    }
    const alreadyExistsNested = parentField.subchild.some(f => f.fieldid === subfieldForState.fieldid && f.allparentFieldId === subfieldForState.allparentFieldId);
    if (!alreadyExistsNested) {
      parentField.subchild.push(subfieldForState);
    }

    this.addSubfieldFormControlSafe(subfieldForState);

    const children$: Observable<any> = (Array.isArray(apiChildren) && apiChildren.length > 0)
      ? from(apiChildren).pipe(
        concatMap((child: ProductField) => this.processSubfield(params, child, subfieldForState, level + 1)),
        toArray()
      )
      : of(null);

    const options$: Observable<any> = subfieldForState.field_has_sub_option
      ? this.loadSubfieldOptions(params, subfieldForState)
      : of(null);

    return children$.pipe(
      switchMap(() => options$),
      catchError(err => {
        console.error('Error in processSubfield:', err);
        this.removeFieldSafely(subfieldForState.fieldid, subfieldForState.allparentFieldId);
        return of(null);
      })
    );
  }

  /**
   * Load options for a subfield using filterbasedlist + getOptionlist
   */
  private loadSubfieldOptions(params: any, subfield: ProductField): Observable<any> {
    return this.apiService.filterbasedlist(params, '', String(subfield.fieldtypeid), String(subfield.fieldid), this.pricegroup, this.colorid, this.fabricid, this.unittype, this.fabricFieldType).pipe(
      takeUntil(this.destroy$),
      switchMap((filterData: any) => {
        if (!filterData?.[0]?.data?.optionarray) return of(null);

        const filterresponseData = filterData[0].data;

        if ([3, 5, 20, 21].includes(subfield.fieldtypeid)) {
          let matrial = 0;
          let filter = '';

          if (subfield.fieldtypeid === 3) {
            matrial = 0;
            filter = filterresponseData.optionarray[subfield.fieldid];
          } else if (subfield.fieldtypeid === 5 || subfield.fieldtypeid === 20 || subfield.fieldtypeid === 21) {
            matrial = 2;
            this.colorLabelName = subfield.labelnamecode;
            filter = filterresponseData.coloridsarray;
          }

          return this.apiService.getOptionlist(
            params,
            subfield.level,
            subfield.fieldtypeid,
            matrial,
            subfield.fieldid,
            filter,
            this.recipeid
          ).pipe(
            takeUntil(this.destroy$),
            map((optionData: any) => {
              const options = optionData?.[0]?.data?.[0]?.optionsvalue || [];
              const filteredOptions = Array.isArray(options)
                ? options.filter((opt: any) =>
                  opt.availableForEcommerce === undefined || opt.availableForEcommerce === 1
                )
                : [];

              if (filteredOptions.length === 0) {
                // If no options, remove the subfield and return null
                this.removeFieldSafely(subfield.fieldid);
                return null;
              }
              
              this.option_data[subfield.fieldid] = filteredOptions;
              this.markDerivedDirty();
              // Preserve existing search control when reloading same subfield; otherwise create
              if (!this.searchCtrl[subfield.fieldid]) {
                this.searchCtrl[subfield.fieldid] = new FormControl('');
              }
              const currentTerm = this.enableSelectSearch
                ? (this.searchCtrl[subfield.fieldid].value || '').toString().toLowerCase().trim()
                : '';
              const allSub = this.option_data[subfield.fieldid] || [];
              this.filteredOptions[subfield.fieldid] = currentTerm === ''
                ? [...allSub]
                : allSub.filter((opt: any) => (opt?.optionname || '').toLowerCase().includes(currentTerm));

              this.searchCtrl[subfield.fieldid].valueChanges
                .pipe(
                  debounceTime(150),
                  map(v => (v || '').toString().toLowerCase().trim()),
                  distinctUntilChanged(),
                  takeUntil(this.destroy$)
                )
                .subscribe(term => {
                  const all = this.option_data[subfield.fieldid] || [];
                  if (!this.enableSelectSearch) {
                    this.filteredOptions[subfield.fieldid] = [...all];
                    this.cd.markForCheck();
                    return;
                  }
                  this.filteredOptions[subfield.fieldid] = term === '' ? [...all] : all.filter(opt =>
                    (opt?.optionname || '').toLowerCase().includes(term)
                  );
                  this.cd.markForCheck();
                });
              // set default value safely (without emitting)
              const control = this.orderForm.get(`field_${subfield.fieldid}`);
              if (control) {
                let valueToSet: any;
                if (subfield.fieldtypeid === 3 && subfield.selection == 1) {
                  valueToSet = subfield.optiondefault
                    ? subfield.optiondefault.toString().split(',').filter((val: string) => val !== '').map(Number)
                    : [];
                } else if (subfield.fieldtypeid === 5 && subfield.level == 2) {
                  valueToSet = +params.color_id || '';
                } else {
                  valueToSet = (subfield.optiondefault !== undefined && subfield.optiondefault !== null && subfield.optiondefault !== '')
                    ? Number(subfield.optiondefault)
                    : '';
                }

                control.setValue(valueToSet, { emitEvent: false });

                if (valueToSet !== null && valueToSet !== '' && valueToSet !== undefined) {
                  // small microtask to avoid synchronous reentrancy issues
                  setTimeout(() => this.handleOptionSelectionChange(params, subfield, valueToSet, true), 0);
                }
              }

              return filteredOptions;
            }),
            catchError(err => {
              console.error('Error loading subfield options:', err);
              this.removeFieldSafely(subfield.fieldid);
              return of(null);
            })
          );
        }

        // if not a handled fieldtype, just return null
        return of(null);
      }),
      catchError(err => {
        console.error('Error fetching subfield filter data:', err);
        this.removeFieldSafely(subfield.fieldid);
        return of(null);
      })
    );
  }

  /**
   * Add a control only if it doesn't already exist.
   */
  private addSubfieldFormControlSafe(subfield: ProductField): void {
    const controlName = `field_${subfield.fieldid}`;

    if (this.orderForm.get(controlName)) {
      return;
    }

    const formControl = this.fb.control(
      subfield.value || '',
      subfield.mandatory == 1 ? [Validators.required] : []
    );

    this.orderForm.addControl(controlName, formControl);
  }
  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.checkScroll();
  }
  private checkScroll() {
    if (!this.stickyEl) return;
    // true when the top of the element is at or above the viewport top
    this.isScrolled = this.stickyEl.nativeElement.getBoundingClientRect().top <= 0;
  }
  /**
   * Remove a field from parameters_data and the form safely.
   */
  private removeFieldSafely(fieldId: number, fieldPath?: string): void {
    if (!fieldPath) {
      const field = this.parameters_data.find(f => f.fieldid === fieldId);
      if (!field) return;
      fieldPath = field.allparentFieldId || fieldId.toString();
    }

    this.parameters_data = this.parameters_data.filter(
      f => !(f.fieldid === fieldId && f.allparentFieldId === fieldPath)
    );
    this.markDerivedDirty();

    const controlName = `field_${fieldId}`;
    if (this.orderForm.contains(controlName)) {
      this.orderForm.removeControl(controlName);
    }

    if (this.option_data[fieldId]) {
      delete this.option_data[fieldId];
      this.markDerivedDirty();
    }

    this.cd.markForCheck();
  }

  private clearExistingSubfields(parentFieldId: number, parentPath?: string): void {
    // 1. Determine the parent path
    if (!parentPath) {
      const parent = this.parameters_data.find(f => f.fieldid === parentFieldId);
      if (!parent) return;
      parentPath = parent.allparentFieldId || parent.fieldid.toString();
    }

    // 2. Special handling for main field (has no parentFieldId)
    const isMainField = !this.parameters_data.some(f =>
      f.fieldid === parentFieldId && f.parentFieldId
    );

    // 3. Find fields to remove - different matching for main vs nested fields
    const fieldsToRemove = this.parameters_data.filter(f => {
      if (!f.allparentFieldId) return false;

      if (isMainField) {
        // For main field, match either:
        // - Direct children: allparentFieldId === "mainId"
        // - Descendants: allparentFieldId.startsWith("mainId,")
        return f.allparentFieldId === parentPath ||
          f.allparentFieldId.startsWith(`${parentPath},`);
      } else {
        // For nested fields, only match proper descendants
        return f.allparentFieldId.startsWith(`${parentPath},`);
      }
    });

    if (fieldsToRemove.length === 0) return;

    this.removeSelectedOptionData(fieldsToRemove);

    // 4. Remove from flat list
    this.parameters_data = this.parameters_data.filter(f =>
      !fieldsToRemove.some(toRemove =>
        toRemove.fieldid === f.fieldid &&
        toRemove.allparentFieldId === f.allparentFieldId
      )
    );
    this.markDerivedDirty();

    // 5. Clean nested structure
    this.cleanNestedStructure(parentFieldId, fieldsToRemove, isMainField);

    // 6. Remove form controls and clean up
    fieldsToRemove.forEach(field => {
      const controlName = `field_${field.fieldid}`;
      if (this.orderForm.contains(controlName)) {
        this.orderForm.removeControl(controlName);
      }
      delete this.option_data[field.fieldid];
      delete this.filteredOptions[field.fieldid];
      delete this.searchCtrl[field.fieldid];
    });

    this.markDerivedDirty();
    this.cd.markForCheck();
  }

  private cleanNestedStructure(parentFieldId: number, fieldsToRemove: ProductField[], isMainField: boolean) {
    const fieldsToRemoveSet = new Set(fieldsToRemove.map(f => f.fieldid));

    // Handle main field specially
    if (isMainField) {
      const mainField = this.parameters_data.find(f => f.fieldid === parentFieldId);
      if (mainField?.subchild) {
        mainField.subchild = mainField.subchild.filter(child =>
          !fieldsToRemoveSet.has(child.fieldid)
        );
      }
      return;
    }

    // Recursive cleaner for nested fields
    const cleanSubchild = (field: ProductField) => {
      if (!field.subchild) return;

      field.subchild = field.subchild.filter(child =>
        !fieldsToRemoveSet.has(child.fieldid)
      );

      field.subchild.forEach(cleanSubchild);
    };

    this.parameters_data.forEach(cleanSubchild);
  }

  /**
   * Update field's value, valueid and optionsvalue, used after selection processing.
   */

  private updateFieldValues(field: ProductField, selectedOption: any = [], fundebug: string = ""): void {
    const fieldInState = this.parameters_data.find(
      f => f.fieldid === field.fieldid && f.allparentFieldId === field.allparentFieldId
    );
 
    const targetField = fieldInState || field;
    const control = this.orderForm.get(`field_${targetField.fieldid}`);
    const currentValue = control ? control.value : null;

    const resetDefaults = () => {
      targetField.id = targetField.fieldid ?? '';
      targetField.labelname = targetField.fieldname ?? '';
      targetField.type = targetField.fieldtypeid ?? '';
      targetField.optionid = '';
      targetField.optionvalue = [];
      targetField.optionquantity = '';
      targetField.valueid = '';
      targetField.optiondefault = targetField.optiondefault ?? '';
      targetField.issubfabric = targetField.issubfabric ?? '';
      targetField.labelnamecode = targetField.labelnamecode ?? '';
      targetField.fabricorcolor = targetField.fabricorcolor ?? '';
      targetField.widthfraction = '';
      targetField.widthfractiontext = '';
      targetField.dropfraction = '';
      targetField.dropfractiontext = '';
      targetField.showfieldonjob = targetField.showfieldonjob ?? '';
      targetField.showFieldOnCustomerPortal = targetField.showFieldOnCustomerPortal ?? '';
      targetField.globaledit = false;
      targetField.numberfraction = targetField.numberfraction ?? '';
      targetField.numberfractiontext = '';
      targetField.mandatory = targetField.mandatory ?? '';
      targetField.fieldInformation = targetField.fieldInformation ?? '';
      targetField.editruleoverride = targetField.editruleoverride ?? '';
    };

    resetDefaults();
    if (selectedOption) {
      const processOption = (opt: any) => {

        const transformedOption = {
          optionvalue: Number(opt.optionid),
          fieldtypeid: field.fieldtypeid,
          optionqty: field.optionquantity || 1,
          fieldoptionlinkid: opt.fieldoptionlinkid,
          fieldid: field.fieldid
        };

        const index = this.selected_option_data.findIndex(
          o => o.fieldoptionlinkid === transformedOption.fieldoptionlinkid
        );

        if (index > -1) {
          this.selected_option_data[index] = transformedOption;
        } else {
          this.selected_option_data.push(transformedOption);
        }
      };

      if (Array.isArray(selectedOption)) {
        selectedOption.forEach(opt => processOption(opt));
      } else {
        processOption(selectedOption);
      }
    }
    if (currentValue === null || currentValue === undefined || currentValue === '' ||
      (Array.isArray(currentValue) && currentValue.length === 0)) {
  
      if (field.fieldtypeid == 34 || field.fieldtypeid == 17 || field.fieldtypeid == 13) {
        targetField.labelname = targetField.fieldname ?? '';
        targetField.valueid = selectedOption?.fieldoptionlinkid ? String(selectedOption.fieldoptionlinkid) : '';
        targetField.optionid = String(selectedOption.optionid);
        targetField.value = String(selectedOption.optionid);
        targetField.optionvalue = [selectedOption];
        targetField.optionquantity = '1';
        targetField.valuename = String(selectedOption.optionname);
      } else {
        targetField.value = '';
        targetField.valueid = '';
        targetField.optionid = '';
        targetField.optionvalue = [];
        targetField.optionquantity = '';
      }

    } else if (selectedOption !== null) {
      if (Array.isArray(selectedOption)) {
        if ([14, 34, 17, 13, 4].includes(field.fieldtypeid)) {
          const ids = selectedOption.map(opt => String(opt.optionid)).join(',');
          targetField.value = ids;
          targetField.optiondefault = ids;
          targetField.optionquantity = '';
          targetField.valueid =
            field.fieldtypeid === 13
              ? selectedOption.map(opt => String(opt.id)).join(',')
              : field.fieldtypeid === 34
                ? ids
                : '';
        } else {
          targetField.value = selectedOption.map(opt => opt.optionname).join(', ');
          targetField.valueid = selectedOption.map(opt => String(opt.fieldoptionlinkid)).join(',');
          targetField.optionquantity = selectedOption.map(() => '1').join(',');
        }

        targetField.labelname = selectedOption.map(opt => opt.optionname).join(', ');
        targetField.optionid = selectedOption.map(opt => String(opt.optionid)).join(',');
        targetField.optionvalue = selectedOption;
      }

      else if (selectedOption && selectedOption.optionname) {
        targetField.labelname = targetField.fieldname ?? '';
        targetField.valueid = selectedOption?.fieldoptionlinkid ? String(selectedOption.fieldoptionlinkid) : '';

        targetField.optionid = String(selectedOption.optionid);
        if ([17, 13,34].includes(field.fieldtypeid)) {
          targetField.value = String(selectedOption.optionid);
          targetField.valuename = String(selectedOption.optionname);
        } else {
          targetField.value = String(selectedOption.optionname);
        }
        targetField.optionvalue = [selectedOption];
        targetField.optionquantity = '1';
      }
      else {
        targetField.value = String(selectedOption) ?? '';
      }
    };

    let fractionValue: any;
    const selectedUnitOption = this.unitOption?.find(
      (opt: { optionid: any }) => `${opt.optionid}` === `${this.unittype}`
    );

    const unitName =
      (this.unitOption && selectedUnitOption?.optionname) || this.unittypename || 'unit';

    if (this.widthField && [7, 8, 11, 31, 34].includes(targetField.fieldtypeid)) {
      if (this.showFractions) {
        fractionValue = Number(this.orderForm.get('widthfraction')?.value) || 0;
        const selectedInchesOption = this.inchfraction_array.find(
          (opt) => String(opt.decimalvalue) === String(fractionValue)
        );

        if (selectedInchesOption) {
          this.widthField.widthfraction = `${selectedInchesOption?.id || 0}_${unitName}_${this.inchfractionselected}_${fractionValue}`;
          this.widthField.widthfractiontext = selectedInchesOption.name;
        } else {
          this.widthField.widthfraction = `0_${unitName}_${this.inchfractionselected}_0`;
        }
      } else {
        this.widthField.widthfraction = `0_${unitName}_${this.inchfractionselected}_0`;
      }
    }

    if (this.dropField && [9, 10, 12, 32, 34].includes(targetField.fieldtypeid)) {
      if (this.showFractions) {
        fractionValue = Number(this.orderForm.get('dropfraction')?.value) || 0;
        const selectedInchesOption = this.inchfraction_array.find(
          (opt) => String(opt.decimalvalue) === String(fractionValue)
        );

        if (selectedInchesOption) {
          this.dropField.dropfraction = `${selectedInchesOption?.id || 0}_${unitName}_${this.inchfractionselected}_${fractionValue}`;
          this.dropField.dropfractiontext = selectedInchesOption.name;
        } else {
          this.dropField.dropfraction = `0_${unitName}_${this.inchfractionselected}_0`;
        }
      } else {
        this.dropField.dropfraction = `0_${unitName}_${this.inchfractionselected}_0`;
      }
    }

    const effectiveLevel = field.level ?? field.fieldlevel;
    if ((field.fieldtypeid === 5 && effectiveLevel === 2) || field.fieldtypeid === 20) {
      this.selected_img_option = targetField.optionid;
      const pickedOption = Array.isArray(selectedOption)
        ? selectedOption[selectedOption.length - 1]
        : selectedOption;
      this.selected_color_option = pickedOption || null;
    }

    if(field.fieldtypeid == 3){
      // Shutter
      if(this.category == 5){
          const chosen_field_name = this.normalizeFieldName(field.fieldname);
          if(this.hinge_color_field_names.includes(chosen_field_name)){
            this.shutter_selected_img_options.hingecolour = Number(targetField.optionid) || 0;
          }
          if(this.color_field_names.includes(chosen_field_name)){
            this.shutter_selected_img_options.color = Number(targetField.optionid) || 0;
          }
     }else{
       const chosen_field_name = this.normalizeFieldName(field.fieldname);
        if(chosen_field_name === this.frameColorKey){
          this.selected_frame_option = Number(targetField.optionid) || 0;
           const pickedOption = Array.isArray(selectedOption)
          ? selectedOption[selectedOption.length - 1]
          : selectedOption;
         this.selected_framecolor_option = pickedOption || null;
        }
        if(chosen_field_name === this.curtainColorKey){
          this.selected_curtain_option = Number(targetField.optionid) || 0;
            const pickedOption = Array.isArray(selectedOption)
          ? selectedOption[selectedOption.length - 1]
          : selectedOption;
          this.selected_curtaincolor_option = pickedOption || null;
        }
     }
    }
     // Accessories
     if(field.fieldtypeid == 3 && this.category == 2){
        this.selected_list_data[field.fieldid] = this.accessoriesImageSelectedData(field,targetField);
     }
    this.get_freesample()
  }

  /**
   * Called on valueChanges; detects changed field_x controls and triggers handlers.
   */
  onFormChanges(values: any, params: any): void {
    this.isCalculatingPrice = false;
    if (!this.previousFormValue) {
      this.previousFormValue = { ...values };
      return;
    }
    if (values['widthfraction'] !== this.previousFormValue['widthfraction'] && this.widthField) {
      let mainWidth = Number(this.orderForm.get('field_' + this.widthField.fieldid)?.value) || 0;
      let fractionValue = Number(values['widthfraction']) || 0;
      const totalWidth = mainWidth + fractionValue;
      this.width = totalWidth;
      this.updateFieldValues(this.widthField, mainWidth, 'Totalwidth');
      this.threeService.setDimensions(this.width, this.drop);
      this.updateShowDimensionsToggle();
    }
    if (values['dropfraction'] !== this.previousFormValue['dropfraction'] && this.dropField) {
      let mainDrop = Number(this.orderForm.get('field_' + this.dropField.fieldid)?.value) || 0;
      let fractionValue = Number(values['dropfraction']) || 0;
      const totalDrop = mainDrop + fractionValue;
      this.drop = totalDrop;
      this.updateFieldValues(this.dropField, mainDrop, 'TotalDrop');
      this.threeService.setDimensions(this.width, this.drop);
      this.updateShowDimensionsToggle();
    }
    for (const key in values) {
      if (!key.startsWith('field_')) continue;

      if (values[key] !== this.previousFormValue[key]) {
        const fieldId = parseInt(key.replace('field_', ''), 10);
        const field = this.parameters_data.find(f => f.fieldid === fieldId);
   
        if (field && [3, 5, 20, 21].includes(field.fieldtypeid)) {
          // Trigger selection change handler
          this.handleOptionSelectionChange(params, field, values[key], false);
        } else if (field && field.fieldtypeid === 34) {
          this.handleUnitTypeChange(values[key], params);
          this.handleRestOptionChange(params, field, values[key]);
        } else if (field && [14, 18, 6, 29].includes(field.fieldtypeid)) {
          this.handleRestChange(params, field, values[key]);
        } else if (field && [7, 8, 11, 31].includes(field.fieldtypeid)) {
          this.handleWidthChange(params, field, values[key]);
        } else if (field && [9, 10, 12, 32].includes(field.fieldtypeid)) {
          this.handleDropChange(params, field, values[key]);
        } else if (field) {
          this.handleRestOptionChange(params, field, values[key]);
        }
      }
      //console.log('parameters_data after form updated:', JSON.parse(JSON.stringify(this.parameters_data)));
    }
    this.previousFormValue = { ...values };
    this.priceUpdate.next();
    this.updateAccordionData();
  }
  private removeSelectedOptionData(fields: ProductField[]): void {
    const allLinkIdsToRemove = new Set<number>();

    fields.forEach(field => {
      if (field.fieldtypeid === 3) {
        const controlName = `field_${field.fieldid}`;
        const previousValue = this.previousFormValue ? this.previousFormValue[controlName] : undefined;

        if (previousValue !== null && previousValue !== undefined && previousValue !== '') {
          const options = this.option_data[field.fieldid];
          if (options) {
            const previousValues = Array.isArray(previousValue) ? previousValue : [previousValue];
            previousValues.forEach(val => {
              const selectedOption = options.find(opt => `${opt.optionid}` === `${val}`);
              if (selectedOption && selectedOption.fieldoptionlinkid) {
                allLinkIdsToRemove.add(selectedOption.fieldoptionlinkid);
              }
            });
          }
        }
      }
    });

    if (allLinkIdsToRemove.size > 0) {
      this.selected_option_data = this.selected_option_data.filter(
        item => !item.fieldoptionlinkid || !allLinkIdsToRemove.has(item.fieldoptionlinkid)
      );
      this.markDerivedDirty();
    }
  }
  hasContent(htmlOrText: string | undefined): boolean {
    if (!htmlOrText) return false; // empty or undefined

    // Create a temporary div to parse HTML if present
    const div = document.createElement('div');
    div.innerHTML = htmlOrText;

    // Get the text content (ignores HTML tags) and trim it
    const text = div.textContent ?? '';
    return text.trim().length > 0; // true only if there is real text
  }
  private handleWidthChange(params: any, field: ProductField, value: any): void {
    let fractionValue = 0;

    if (this.showFractions) {
      fractionValue = Number(this.orderForm.get('widthfraction')?.value) || 0;
    }

    const totalWidth = Number(value) + fractionValue;
    this.width = totalWidth;
    this.updateFieldValues(field, value, 'Totalwidth');
    this.threeService.setDimensions(this.width, this.drop);
    // Only update toggle visibility; do not auto-change mode
    this.updateShowDimensionsToggle();
  }
  getUnitLabel(): string {
    const selected = this.unitOption?.find(
      (o: { optionid: number; optionname: string }) => o.optionid === this.unittype
    );
    const label = selected?.optionname || this.unittypename || '';
    return label === 'Inches' ? 'inch' : label;
  }
  private handleDropChange(params: any, field: ProductField, value: any): void {
    let fractionValue = 0;

    if (this.showFractions) {
      fractionValue = Number(this.orderForm.get('dropfraction')?.value) || 0;
    }

    const totalDrop = Number(value) + fractionValue;
    this.drop = totalDrop;
    this.updateFieldValues(field, value, 'TotalDrop');
    this.threeService.setDimensions(this.width, this.drop);
    // Only update toggle visibility; do not auto-change mode
    this.updateShowDimensionsToggle();
  }

  toggleDimensions(event?: MatButtonToggleChange) {
    const mode = (event?.value ?? this.dimensionMode) as 'on' | 'off';
    this.dimensionMode = mode;
    this.threeService.enableDimensions(mode === 'on');
    this.updateShowDimensionsToggle();
  }
  private handleRestOptionChange(params: any, field: ProductField, value: any): void {
    if (value === null || value === undefined || value === '') {
      return;
    }

    const options = field.optionsvalue;
    if (!options || options.length === 0) return;

    const selectedOption = options.find(opt => `${opt.optionid}` === `${value}`);

    if (!selectedOption) return;

    this.updateFieldValues(field, [selectedOption], 'handleRestOptionChange');
  }
  private handleRestChange(params: any, field: ProductField, value: any): void {
    this.updateFieldValues(field, value, 'handleRestChange');
  }
  handleUnitTypeChange(value: any, params: any): void {
    const unitValue = typeof value === 'string' ? parseInt(value, 10) : value;
    // Capture current fraction contributions before changing flags/controls
    const prevWidthFraction = Number(this.orderForm.get('widthfraction')?.value) || 0;
    const prevDropFraction = Number(this.orderForm.get('dropfraction')?.value) || 0;

    this.unittype = unitValue;
    this.showFractions = (unitValue === 4);
    this.updateMinMaxValidators(true);
    if (this.is3DOn) {
      this.threeService.setUnitLabel(this.getUnitLabel());
      this.threeService.setDimensions(this.width, this.drop);
    }
    if (unitValue !== 4) {
      if (prevWidthFraction) {
        this.width = Math.max(0, (Number(this.width) || 0) - prevWidthFraction);
      }
      if (prevDropFraction) {
        this.drop = Math.max(0, (Number(this.drop) || 0) - prevDropFraction);
      }

      this.orderForm.get('widthfraction')?.setValue(0, { emitEvent: false });
      this.orderForm.get('dropfraction')?.setValue(0, { emitEvent: false });

      if (this.widthField) {
        this.widthField.widthfraction = '';
        this.widthField.widthfractiontext = '';
      }
      if (this.dropField) {
        this.dropField.dropfraction = '';
        this.dropField.dropfractiontext = '';
      }
    }
    this.apiService.getFractionData(params, unitValue).pipe(
      takeUntil(this.destroy$),
      catchError(err => {
        console.error('Error fetching fraction data:', err);
        this.inchfraction_array = [];
        return of(null);
      })
    ).subscribe((FractionData: any) => {
      this.inchfractionselected = FractionData?.result?.inchfractionselected || 0;
      if (FractionData?.result?.inchfraction) {
        this.inchfraction_array = FractionData.result.inchfraction.map((item: any) => ({
          name: item.name,
          id: item.id,
          decimalvalue: item.decimalvalue,
          frac_decimalvalue: item.decimalvalue
        }));
      } else {
        this.showFractions = false;
        this.inchfraction_array = [];
      }
      this.updateAccordionData();
      this.cd.markForCheck();
    });
  }
  private cleanSubchild(fields: any[]): any[] {
    return fields
      .filter(field => !!field.allparentFieldId) // keep only items with allparentFieldId
      .map(field => ({
        ...field,
        subchild: field.subchild && field.subchild.length
          ? this.cleanSubchild(field.subchild) // recurse deeper
          : []
      }));
  }
  onSubmit(): void {
    if (this.orderForm.invalid) {
      this.markFormGroupTouched(this.orderForm);
      return;
    }
    if (this.grossPricenum <= 0) {
      this.errorMessage = 'The price could not be calculated. Please review your selections.';
      this.isSubmitting = false;
      this.cd.markForCheck();
      return;
    }
    this.jsondata = this.orderitemdata(false);
    //console.log(this.jsondata);
   

    const cartProductId = this.resolveCartProductId();
    if (!this.routeParams || !this.routeParams.site || !cartProductId) {
      this.errorMessage = 'Missing required route parameters for cart submission.';
      this.isSubmitting = false;
      this.cd.markForCheck();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;
    let visualizerImage: string | undefined;
    if (this.category === 5) {
      visualizerImage = (document.getElementById('previewImageField') as HTMLInputElement).value;
    } else {
      visualizerImage = this.threeService.getCanvasDataURL(); // string already
    }

    this.apiService.addToCart(this.jsondata, cartProductId,Number(this.product_id), environment.site,
      this.buildProductTitle(this.ecomproductname, this.fabricname, this.colorname),
      this.pricedata,
      this.vatpercentage,
      this.vatname,
      window.location.href,
      this.productname,
      this.fabricFieldType,
      visualizerImage,
      'add_to_cart',
      this.colorid,
      this.fabricid
    ).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.isSubmitting = false;
        this.cd.markForCheck();
      })
    ).subscribe({
      next: (response) => {
        if (response.success) {
          Swal.fire({
            title: 'Added to Cart!',
            text: 'Your product has been added successfully.',
            icon: 'success',
            showConfirmButton: false,
            timer: 3000,
            background: '#fefefe',
            color: '#333',
            customClass: {
              popup: 'small-toast'
            }
          }).then(() => {
            window.location.href = environment.site + '/cart';
          });

        } else {
          this.errorMessage = response.message || 'An unknown error occurred while adding to cart.';
        }
      },
      error: (err) => {
        this.errorMessage = err.message || 'Failed to add product to cart. Please try again.';
        console.error('Add to cart error:', err);
      }
    });
  }

  public buildProductTitle(
    ecomproductname: string,
    fabricname: string,
    colorname: string
  ): string {
    let extras = '';
    if (fabricname && colorname) {
      extras = `${fabricname} ${colorname}`;
    } else if (fabricname) {
      extras = fabricname;
    } else if (colorname) {
      extras = colorname;
    }
    if(2 == this.category && 'single_view' != this.routeParams?.fabric){
      extras = this.routeParams?.fabric.replace(/-/g, ' ');
    }
    return extras ? `${ecomproductname} - ${extras}` : ecomproductname;
  }

  private updateProductTitle(): void {
    this.productTitle = this.buildProductTitle(this.ecomproductname, this.fabricname, this.colorname);
  }
  private getVat(): Observable<any> {
    return this.apiService.getVat(
      this.routeParams
    );
  }
  private getPrice(): Observable<any> {
    // Accessories type
    if(2 == this.category){
       this.fabricid = "";
       this.colorid = "";
    }

    return this.getVat().pipe(
      switchMap(vatResponse => {
        const vatPercentage = vatResponse?.data ?? '';
        const selectedTax = vatResponse?.taxlist?.find(
          (tax: any) => tax.id === vatResponse?.vatselected
        );
        this.vatpercentage = vatPercentage;
        this.vatname = selectedTax ? selectedTax.name : vatResponse?.defaultsalestaxlabel;

        const fetchPrice = (rulesResponse?: any, formulaResponse?: any) => {
          return this.apiService.getPrice(
            this.routeParams,
            this.width,
            this.drop,
            this.unittype,
            this.supplier_id,
            this.widthField?.fieldtypeid ?? "",
            this.dropField?.fieldtypeid ?? "",
            this.pricegroup,
            vatPercentage,
            this.selected_option_data,
            this.fabricid,
            this.colorid,
            this.netpricecomesfrom,
            this.costpricecomesfrom,
            formulaResponse?.productionmaterialcostprice,
            formulaResponse?.productionmaterialnetprice,
            formulaResponse?.productionmaterialnetpricewithdiscount,
            this.fabricFieldType
          );
        };

        if (this.rulescount > 0) {
          return this.apiService.calculateRules(
            this.routeParams,
            this.width,
            this.drop,
            this.unittype,
            this.supplier_id,
            this.widthField?.fieldtypeid ?? "",
            this.dropField?.fieldtypeid ?? "",
            this.pricegroup,
            vatPercentage,
            this.selected_option_data,
            this.fabricid,
            this.colorid,
            this.rulesorderitem,
            0,
            this.fabricFieldType,
            this.recipeid
          ).pipe(
            switchMap(rulesResponse => {
              const rulesresponse = rulesResponse as any;

              if (rulesresponse?.ruleresults?.length) {
                rulesresponse.ruleresults.forEach((ruleObj: any) => {
                  const fieldid = +Object.keys(ruleObj)[0];
                  const ruleArray = ruleObj[fieldid];

                  ruleArray.forEach((rule: any) => {
                    const { optionid, optionvalue } = rule;

                    const control = this.orderForm.get(`field_${fieldid}`);
                    const field = this.parameters_data.find(f => f.fieldid === fieldid);

                    if (!control || !field) return;

                    if (optionid && optionvalue && this.option_data[field.fieldid]) {
                      const numericOptionId = Number(optionid);
                      const options = this.option_data[field.fieldid] || field.optionsvalue || [];
                      const selectedOption = options.find(
                        (opt: any) => Number(opt.optionid) === numericOptionId
                      );

                      if (selectedOption) {
                        control.setValue(numericOptionId, { emitEvent: false });
                        this.updateFieldValues(field, selectedOption, 'rules update select');
                      }
                    } else if (optionvalue && optionid !== 0) {
                      control.setValue(optionid, { emitEvent: false });
                      this.updateFieldValues(field, optionvalue, 'rules update text');
                    }
                    this.updateAccordionData();
                  });
                });
              }

              if (this.formulacount > 0) {
                return this.apiService.calculateRules(
                  this.routeParams,
                  this.width,
                  this.drop,
                  this.unittype,
                  this.supplier_id,
                  this.widthField?.fieldtypeid ?? "",
                  this.dropField?.fieldtypeid ?? "",
                  this.pricegroup,
                  vatPercentage,
                  this.selected_option_data,
                  this.fabricid,
                  this.colorid,
                  this.rulesorderitem,
                  1,
                  this.fabricFieldType,
                  this.recipeid
                ).pipe(
                  switchMap(formulaResponse => fetchPrice(rulesResponse, formulaResponse))
                );
              }

              return fetchPrice(rulesResponse);
            })
          );
        }

        else if (this.formulacount > 0) {
          return this.apiService.calculateRules(
            this.routeParams,
            this.width,
            this.drop,
            this.unittype,
            this.supplier_id,
            this.widthField?.fieldtypeid ?? "",
            this.dropField?.fieldtypeid ?? "",
            this.pricegroup,
            vatPercentage,
            this.selected_option_data,
            this.fabricid,
            this.colorid,
            this.rulesorderitem,
            1,
            this.fabricFieldType,
            this.recipeid
          ).pipe(
            switchMap(formulaResponse => fetchPrice(undefined, formulaResponse))
          );
        }
        else {
          return fetchPrice();
        }
      }),
      catchError(error => {
        console.error('Error getting VAT or Price', error);
        return of({ price: 0, vat: '' });
      })
    );
  }


  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
  public get_field_type_name(chosen_field_type_id: any): string {
    const field_types: Record<string, string> = {
      '3': 'list',
      '5': 'materials',
      '6': 'number',
      '7': 'width_with_fraction',
      '8': 'width_with_fraction',
      '9': 'drop_with_fraction',
      '10': 'drop_with_fraction',
      '11': 'width_with_fraction',
      '12': 'drop_with_fraction',
      '13': 'pricegroup',
      '14': 'qty',
      '17': 'supplier',
      '18': 'text',
      '31': 'width_with_fraction',
      '32': 'drop_with_fraction',
      '34': 'unit_type',
      '21': 'materials',
      '25': 'accessories_list',
      '20': 'materials',
      '4': 'list',
      '29': 'text'
    };

    return field_types[chosen_field_type_id] || '';
  }

  trackByFieldId(index: number, field: ProductField): number {
    return field.fieldid;
  }

  trackByOptionId(index: number, opt: any): any {
    return opt?.optionid ?? index;
  }

  trackByProductImage(index: number, img: any): any {
    return img?.id ?? img?.optionid ?? img?.pi_frameimage ?? index;
  }

  trackByAccordion(index: number, item: { label: string, value: any }): any {
    return item?.label ?? index;
  }

  trackByFraction(index: number, frac: FractionOption): any {
    return frac?.id ?? frac?.decimalvalue ?? index;
  }

  trackByIndex(index: number): number {
    return index;
  }

  // Public API: toggle search globally
  setSearchEnabled(flag: boolean): void {
    this.enableSelectSearch = !!flag;
    // Reset current filters to full list and clear search terms without emitting
    Object.keys(this.filteredOptions || {}).forEach(k => {
      const id = Number(k);
      const all = this.option_data?.[id] || [];
      this.filteredOptions[id] = [...all];
      if (this.searchCtrl?.[id]) {
        this.searchCtrl[id].setValue('', { emitEvent: false });
      }
    });
    this.cd.markForCheck();
  }


  incrementQty(): void {
    const qtyControl = this.orderForm.get('qty');
    if (qtyControl) {
      qtyControl.setValue(qtyControl.value + 1);
    }
  }

  decrementQty(): void {
    const qtyControl = this.orderForm.get('qty');
    if (qtyControl && qtyControl.value > 1) {
      qtyControl.setValue(qtyControl.value - 1);
    }
  }

  resetCamera(): void {
    if (this.is3DOn) {
      this.threeService.resetCamera();
    }
  }

  private updateAccordionData(): void {
    this.accordionData = [];
    this.parameters_data.forEach(field => {
      if (field.showfieldecomonjob == 1) {
        const control = this.orderForm.get('field_' + field.fieldid);
        if (control && control.value && (typeof control.value !== 'string' || control.value.trim() !== '') && (!Array.isArray(control.value) || control.value.length > 0)) {
          const value = control.value;
          let displayValue: any;

          // Special handling for width and drop fields
          if (field.fieldtypeid === 11 || field.fieldtypeid === 7 || field.fieldtypeid === 31) { // width types
            const fractionControl = this.orderForm.get('widthfraction');
            if (fractionControl && fractionControl.value) {
              const fractionOption = this.inchfraction_array.find(opt => opt.decimalvalue == fractionControl.value);
              displayValue = `${value} ${fractionOption ? fractionOption.name : ''}`;
            } else {
              displayValue = value;
            }
          } else if (field.fieldtypeid === 12 || field.fieldtypeid === 9 || field.fieldtypeid === 32) { // drop types
            const fractionControl = this.orderForm.get('dropfraction');
            if (fractionControl && fractionControl.value) {
              const fractionOption = this.inchfraction_array.find(opt => opt.decimalvalue == fractionControl.value);
              displayValue = `${value} ${fractionOption ? fractionOption.name : ''}`;
            } else {
              displayValue = value;
            }
          } else {
            const allOptions = this.option_data[field.fieldid] || field.optionsvalue;

            if (allOptions && Array.isArray(allOptions) && allOptions.length > 0) {
              if (Array.isArray(value)) {
                displayValue = value
                  .map(val => {
                    const option = allOptions.find(opt => opt.optionid == val);
                    return option ? option.optionname : val;
                  })
                  .join(', ');
              } else {
                const option = allOptions.find(opt => opt.optionid == value);
                displayValue = option ? option.optionname : value;
              }
            } else {
              displayValue = value;
            }
          }

          if (displayValue && (typeof displayValue !== 'string' || displayValue.trim() !== '')) {
            this.accordionData.push({ label: field.fieldname, value: displayValue });
          }
        }
      }
    });
    this.cd.markForCheck();
  }
  private orderitemdata(isForRulesCalculation: boolean = false, freesample: boolean = false): any[] {
    return this.parameters_data.map(t => {
      const isSpecialType = isForRulesCalculation && [34, 17, 13].includes(+t.fieldtypeid);
      var valueint = isSpecialType ? t.valuename || null : t.value || null;
      if (freesample) {
        if ([7, 8, 11, 31, 9, 10, 12, 32].includes(+t.fieldtypeid)) {
          valueint = "0";
        } else if (+t.fieldtypeid == 3) {
          valueint = "";
        }
      }

      const i = {
        id: +t.fieldid,
        labelname: t.fieldname,
        value: valueint,
        valueid: t.valueid || null,
        type: t.fieldtypeid,
        optionid: t.optionid || null,
        optionvalue: t.optionvalue || [],
        optionquantity: t.optionquantity || null,
        issubfabric: t.issubfabric ?? 0,
        labelnamecode: t.labelnamecode,
        fabricorcolor: t.fabricorcolor || 0,
        widthfraction: t.widthfraction || null,
        widthfractiontext: t.widthfractiontext || null,
        dropfraction: t.dropfraction || null,
        dropfractiontext: t.dropfractiontext || null,
        showfieldonjob: t.showfieldonjob,
        subchild: t.subchild || [],
        showFieldOnCustomerPortal: t.showFieldOnCustomerPortal,
        globaledit: !1,
        numberfraction: t.numberfraction || null,
        numberfractiontext: t.numberfractiontext || null,
        fieldlevel: t.fieldlevel,
        mandatory: t.mandatory,
        fieldInformation: t.fieldInformation || null,
        ruleoverride: t.ruleoverride,
        optiondefault: t.optiondefault || t.optionid || null,
        optionsvalue: t.optionvalue || [],
        editruleoverride: 1 === t.editruleoverride ? 1 : 0,
        fieldtypeid: t.fieldtypeid,
        fieldid: t.fieldid,
        fieldname: t.fieldname
      } as any;;
      if (isForRulesCalculation) {
        i.quantity = t.optionquantity || null;
        i.fractionValue = 0;
      }
      i.subchild = this.cleanSubchild(i.subchild);
      return i;
    });
  }	 
getClassNameAccessories(field: any,list_field:boolean = false): string {
    if('single_view' != this.routeParams?.fabric && list_field && 2 == this.category && field.fieldid == this.chosenAccessoriesFieldId){
       return 'hide_section';
    } 
    if('single_view' != this.routeParams?.fabric && 2 == this.category && field.masterparentfieldid != this.chosenAccessoriesFieldId){
      return 'hide_section';
    }
    return '';
  }
  hideFrameImage():boolean{
    if('single_view' != this.routeParams?.fabric && 2 == this.category){
      return true;
    }
    return false;
  }

  private setShutterObject(field:any,selectedOption:any): any {
    if(21 == field.fieldtypeid){
      if (Array.isArray(this.shutter_product_details)) {
          const shutter_type = this.shutter_product_details.find(
            d => String(d.shuttertypeid) === String(field.optionid)
          );
          if(shutter_type?.shuttertypes && shutter_type?.shuttertypename){
              this.shutter_type_name = shutter_type.shuttertypename;
          }
      }
    }
    const chosen_field_name = field.fieldname.replace(/\s+/g, '').toLowerCase();
    // Color URL
    if(this.color_field_names.includes(chosen_field_name)){
        this.colorurl = selectedOption ? this.apiUrl + '/api/public' + selectedOption?.optionimage:'assets/default-shutter-img.png';
    }
   // Hinge Color URL
    if(this.hinge_color_field_names.includes(chosen_field_name)){
          this.hinge_colorurl = selectedOption ? this.apiUrl + '/api/public' + selectedOption?.optionimage:'';
    }
    // Midrails
    if('midrails' == chosen_field_name){
       this.midrails = field.value;
    }
    // Number of panels
    if('noofpanel' == chosen_field_name){
       this.no_of_panels = field.value;
    }
    // Slat size
    if('slatsize' == chosen_field_name){
       this.slatsize = field.value;
    }
    // Tilt rod
    if('tiltrod' == chosen_field_name){
       this.tiltrod = field.value;
    }
    
    this.shutterdata = {
      "colorurl"             : this.colorurl,
      "shutter_type_name"    : this.shutter_type_name,
      "hinge_colorurl"       : this.hinge_colorurl,
      "no_of_panels"         : this.no_of_panels,
      "midrails"             : this.midrails,
      "slatsize"             : this.slatsize,
      "tiltrod"              : this.tiltrod,
    };
  }
  onImageClick(option: any, field: any) {
    // Accessories type
    if(this.category == 2){
        // Set list data before image selection.
        this.selected_list_data[field.fieldid] = this.accessoriesImageSelectedData(field,option);
        this.accessoriesImageSelectedData(field,option,true);
    }else{
      // Except Accessories type
      if (field.selection === 1) {
        // Multi-select → array always
        const currentValue = this.orderForm.get(`field_${field.fieldid}`)?.value || [];
        this.orderForm.get(`field_${field.fieldid}`)?.setValue([...currentValue, option.optionid]);
      } else {
        const control = this.orderForm.get(`field_${field.fieldid}`);
        if (control){
          if (control.value === option.optionid) {
              control.setValue(null);
          } else {
              control.setValue(option.optionid);
          }
        }
      }
    }
  }
  registerProductIcon() {
    if (!this.iconname) {
      return;
    }
    ['up', 'down'].forEach(state => {
      const iconName = `${this.iconname}-${state}`;
      const path = `assets/icons/${iconName}.svg`;
      this.matIconRegistry.addSvgIcon(
        iconName,
        this.sanitizer.bypassSecurityTrustResourceUrl(path)
      );
    });
  }
  accessoriesImageSelectedData(field:any,option:any,set_value = false){
    const control = this.orderForm.get(`field_${field.fieldid}`);
        if (!control) return [];
        // Initialize the changed value
        let changed_val: any[] = [];
        if (field.selection === 1) {
          // Multi-select → toggle option in array
          const currentValue: any[] = control.value || [];
          const newValue = [...currentValue]; // copy array
          const index = newValue.indexOf(option.optionid);
          if (index === -1) {
            // Add if not present
            newValue.push(option.optionid);
          } else {
            // Remove if already present
            newValue.splice(index, 1);
          }
          if(set_value){
            control.setValue(newValue);
          }
          changed_val = newValue;
        } else {
          // Single-select → toggle value
          if (control.value === option.optionid) {
            // Deselect if clicked again
            if(set_value){
              control.setValue(null);
            }
            changed_val = [];
          } else {
            if(set_value){
              control.setValue(option.optionid);
            }
            changed_val = [option.optionid]; // store as array for consistency
          }
        }
        return changed_val;
  }
  isColorSection(field:any,is_color_list_toggle = false):boolean{
    if('list' == this.list_value && !is_color_list_toggle){
        return false;        
    }
    if(field.fieldtypeid == 5 && field.fieldlevel == 2){
      return true;
    }
    if (field.fieldtypeid === 20 && field.fieldlevel == 1) {
      return true;
    }
    return false;
  }
  toggle_list_view(event: MatButtonToggleChange){
    this.list_value = 'image' == event.value ? 'image' : 'list';
  }
  isShutterColorSection(field:any,is_list_toggle = false):boolean{
    if(this.category != 5){
      return false;
    }
    const chosen_field_name = field.fieldname.replace(/\s+/g, '').toLowerCase();
    if (this.color_field_names.includes(chosen_field_name)){
      if(this.shutter_color_list_value && 'list' == this.shutter_color_list_value && !is_list_toggle){
          return false;
      }
      return true;
    }
    if(this.hinge_color_field_names.includes(chosen_field_name)){
      if(this.shutter_hinge_color_list_value && 'list' == this.shutter_hinge_color_list_value && !is_list_toggle){
          return false;
      }
      return true;
    }
    return false;
  }
  toggle_shutter_color_list_view(field:any,event: MatButtonToggleChange){
    const chosen_field_name = field.fieldname.replace(/\s+/g, '').toLowerCase();
    if (this.color_field_names.includes(chosen_field_name)){
      this.shutter_color_list_value = 'image' == event.value ? 'image' : 'list';
    }
    if (this.hinge_color_field_names.includes(chosen_field_name)){
      this.shutter_hinge_color_list_value = 'image' == event.value ? 'image' : 'list';
    }
  }
  shutter_color_list_view(field:any):string{
    const chosen_field_name = field.fieldname.replace(/\s+/g, '').toLowerCase();
    if(this.shutter_color_list_value && this.color_field_names.includes(chosen_field_name)){
      return this.shutter_color_list_value;
    }

    if(this.shutter_hinge_color_list_value && this.hinge_color_field_names.includes(chosen_field_name)){
      return this.shutter_hinge_color_list_value;
    }
    return 'list';
  }
  is_shutter_color_list_view(field:any,option:any):boolean{
    if(this.category != 5){
      return false;
    }

    const chosen_field_name = field.fieldname.replace(/\s+/g, '').toLowerCase();
    if(this.shutter_selected_img_options.hingecolour && this.hinge_color_field_names.includes(chosen_field_name)){
      return this.shutter_selected_img_options.hingecolour == option.optionid;
    }
    if(this.shutter_selected_img_options.color && this.color_field_names.includes(chosen_field_name)){
      return this.shutter_selected_img_options.color == option.optionid;
    }
    return false;
  }
  is_accessories_list_view(field:any,option:any):boolean{
    if (this.category !== 2) return false;
    const value = this.selected_list_data[field.fieldid];
    // If no value, return false
    if (!value) return false;

    if (Array.isArray(value)) {
        // Ensure all elements are defined before calling toString
        return value.some(v => v != null && v.toString() === option.optionid.toString());
      } else {
        return value != null && value.toString() === option.optionid.toString();
      }
  }
  isAccessoriesListSection(field:any):boolean{
    if(2 != this.category){
      return false;
    }
    return 'image' == this.list_value;
  }
  showListViewButton():boolean{  
    if(2 == this.category){
      return true;
    }
    return false;
  }
  setShutterImage() {
    const element = document.getElementById('shutterspreview');
    if (!element) return;
    htmlToImage.toPng(element, { pixelRatio: 2 })
      .then((dataUrl: string) => {
        const hiddenField = document.getElementById('previewImageField') as HTMLInputElement;
        if (hiddenField) {
          hiddenField.value = dataUrl;
        }

        console.log("Hidden field updated with image URL");
      })
      .catch(error => {
        console.error("Image conversion failed", error);
      });
  }
}
