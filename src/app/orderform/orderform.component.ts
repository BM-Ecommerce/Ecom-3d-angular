import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy, ViewChild, ElementRef, AfterViewInit, SimpleChanges, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { environment } from '../../environments/environment';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatExpansionModule } from '@angular/material/expansion';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ApiService } from '../services/api.service';
import { ThreeService } from '../services/three.service';;
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { Subject, forkJoin, Observable, of, from } from 'rxjs';
import { switchMap, mergeMap, map, tap, catchError, takeUntil, finalize, toArray, concatMap, debounceTime } from 'rxjs/operators';
import {MatTabsModule} from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HtmlTooltipDirective } from '../html-tooltip.directive';



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
  ruleoverride:any;
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
  hasprice?:boolean;
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
  optionid_pricegroupid:string;
  pricegroupid:string;
  optioncode?: string;
  optionquantity?: any;
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
  frac_decimalvalue:string;
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
    HtmlTooltipDirective
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderformComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('visualizerCanvas', { static: false }) private canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('visualizerContainer', { static: false }) private containerRef!: ElementRef<HTMLElement>;
  @ViewChild('zoomLens', { static: false }) private zoomLensRef!: ElementRef<HTMLElement>;
  @ViewChild('stickyEl', { static: false }) stickyEl!: ElementRef<HTMLElement>;


  isZooming = false;
  mainframe!: string;
  background_color_image_url!: string;
  private destroy$ = new Subject<void>();
  private readonly MAX_NESTING_LEVEL = 8;
  private priceGroupField?: ProductField;
  private supplierField?: ProductField;
  private qtyField?: ProductField;
  private unitField?: ProductField;
  // Form / UI state
  public productTitle: string = '';
  isLoading = false;
  isSubmitting = false;
  errorMessage: string | null = null;
  jsondata: JsonDataItem[] = [];  
  // Product data
  showFractions = false;
  product_details_arr: Record<string, string> = {};
  product_specs = '';
  ecomproductname ='';
  product_description = '';
  unit_type_data: any[] = [];
  parameters_arr: any[] = [];
  pricedata:any[] = [];
  supplierOption: any;
  priceGroupOption: any;
  unitOption: any;
  productdescription:string = "";
  pei_prospec:string = "";
  isScrolled = false;
  unittypename = "";
  netpricecomesfrom ="";
  is3DOn = false;
  costpricecomesfrom ="";
  inchfractionselected:Number = 0;
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
  fabricFieldType: any =0;
  ecomsampleprice = 0;
  ecomFreeSample = '0';
  delivery_duration = '';
  visualizertagline = '';
  productname = '';
  product_list_page_link = '';
  fabricname = '';
  colorname ='';
  frame_default_url ="";
  hide_frame = false;
  product_img_array: any[] = [];
  product_deafultimage: Record<string, any> = {};
  fabric_linked_color_data: Record<string, any> = {};
  productlisting_frame_url = '';
  sample_img_frame_url = '';
  v4_product_visualizer_page = '';
  fieldscategoryname = '';
  productslug = '';
  fabricid = 0;
  colorid = 0;
  matmapid = 0;
  rulescount = 0;
  formulacount  = 0;
  pricegroup_id = 0;
  supplier_id: number | null = null;
  currencySymbol: string = '£';
  // Form controls
  orderForm: FormGroup;
  previousFormValue: any;
  apiUrl = '';
  img_file_path_url = '';
  // Data arrays
  parameters_data: ProductField[] = [];
  option_data: Record<number, ProductOption[]> = {};
  selected_option_data: SelectProductOption[] = [];
  accordionData: { label: string, value: any }[] = [];
  routeParams: any;
  unittype: number = 1;
  pricegroup: string = "";
  public grossPrice: string | null = null;
  public isCalculatingPrice = true;
  grossPricenum:number = 0;
  private priceUpdate = new Subject<void>();
  private rulesorderitem: any[] = [];
  constructor(
    private apiService: ApiService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private cd: ChangeDetectorRef,
    private threeService: ThreeService,
    private http: HttpClient,
  ) {
    // initial minimal group; will be replaced in initializeFormControls
    this.orderForm = this.fb.group({
        unit: ['', Validators.required],
        widthfraction: [''],
        dropfraction: [''],
        qty: [1, [Validators.required, Validators.min(1)]]
      });
    this.previousFormValue = this.orderForm.value;
  }
  
ngOnInit(): void {
  const queryParams = this.route.snapshot.queryParams;
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
            api_url: environment.apiUrl,
            api_key: environment.apiKey,
            api_name: environment.apiName,
            site: environment.site
        };
        this.fetchInitialData(params);
    });

 
  } else {
    // Production: get token from query param and call API
    const token = queryParams['token'];
    if (!token) {
      console.error('Visualizer token is missing');
      return;
    }

    const apiUrl = window.location.origin;

    this.http.get(`${apiUrl}/wp-json/blindmatrix/v1/get_visualizer_data?token=${token}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.img_file_path_url = data.api_url + '/api/public/';
          this.fetchInitialData(data);
        },
        error: (err) => {
          console.error('Invalid or expired visualizer token', err);
        }
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
      this.currencySymbol = res.currencysymbol;
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
}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewInit(): void {
    // Initialization is handled by setupVisualizer() which is called after data fetch.
    // We also need to ensure the animation loop in three.service is started.
    // A better place for this might be after the first textures are loaded.
  }

  private setupVisualizer(productname: string): void {
    if (!this.canvasRef || !this.containerRef) return;

    if (this.is3DOn) {
      this.threeService.initialize(this.canvasRef, this.containerRef.nativeElement);

      if (productname.toLowerCase().includes('roller blinds')) {
        this.threeService.loadGltfModel('assets/rollerblinds.gltf', 'rollerblinds');
      } else if (
        productname.toLowerCase().includes('venetian') ||
        productname.toLowerCase().includes('fauxwood')
      ) {
        this.threeService.loadGltfModel('assets/venetianblinds.gltf', 'venetian');
      } else {
        this.threeService.loadGltfModel('assets/rollerdoor.gltf', 'rollerdoor');
      }

    } else {
      this.threeService.initialize2d(this.canvasRef, this.containerRef.nativeElement);
      if (this.mainframe) {
        this.threeService.createObjects(this.mainframe, this.background_color_image_url);
      }
    }
  }

  toggle3D() {
    this.is3DOn = !this.is3DOn;
    this.setupVisualizer(this.productname);
    if (this.is3DOn && this.background_color_image_url) {
      this.threeService.updateTextures(this.background_color_image_url);
    }
  }
  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.containerRef) {
      this.threeService.onResize(this.containerRef.nativeElement);
    }
  }
zoomIn(): void {
  if (this.is3DOn) {
    this.threeService.zoomIn();
  }
}

zoomOut(): void {
    if (this.is3DOn) {
      this.threeService.zoomOut();
    }
  }
  
  onMouseMove(event: MouseEvent): void {
    if (!this.is3DOn) {
      const rect = this.containerRef.nativeElement.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      this.threeService.setZoom(x, y);
    }
  }

  onMouseEnter(): void {
    if (!this.is3DOn) {
      this.threeService.enableZoom(true);
    }
  }

  onMouseLeave(): void {
    if (!this.is3DOn) {
      this.threeService.enableZoom(false);
    }
  }
private fetchInitialData(params: any): void {
  this.isLoading = true;
  this.errorMessage = null;

  this.apiService.getProductData(params).pipe(
    takeUntil(this.destroy$),
    switchMap((productData: any) => {
      if (productData.result?.EcomProductlist?.length > 0) {
        const data: ProductDetails = productData.result.EcomProductlist[0];
        this.ecomproductname = data.pei_ecomProductName;
        this.productname = data.label;
        this.productdescription = data.pi_productdescription;
        this.pei_prospec = data.pei_prospec;

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

        const defaultImageSettings = productDefaultImage?.defaultimage || {};
        const defaultFrameFilename = defaultImageSettings?.backgrounddefault || '';

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

        this.setupVisualizer(ecomProductName);
      }
      return this.apiService.getProductParameters(params);
    }),
    switchMap((data: any) => {
      if (data && data[0]) {
        const response = data[0];
        this.parameters_data = response.data || [];
        this.apiUrl = params.api_url;
        this.routeParams = params;
        this.netpricecomesfrom = response.netpricecomesfrom;
        this.costpricecomesfrom = response.costpricecomesfrom;
        this.initializeFormControls();
        this.priceGroupField = this.parameters_data.find(f => f.fieldtypeid === 13);
        this.supplierField   = this.parameters_data.find(f => f.fieldtypeid === 17);
        this.qtyField        = this.parameters_data.find(f => f.fieldtypeid === 14);
        this.widthField      = this.parameters_data.find(f => [7, 8, 11, 31].includes(f.fieldtypeid));
        this.dropField       = this.parameters_data.find(f => [9, 10, 12, 32].includes(f.fieldtypeid));
        this.unitField       = this.parameters_data.find(f => f.fieldtypeid === 34);
        this.fabricFieldType = this.parameters_data.find(f => [20, 21, 5].includes(f.fieldtypeid));

        return forkJoin({
          optionData: this.loadOptionData(params),
          minMaxData: this.apiService.getminandmax(
            this.routeParams,
            this.routeParams.color_id,
            this.unittype,
            this.routeParams.pricing_group
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
        this.parameters_data.forEach(field => {
          const control = this.orderForm.get(`field_${field.fieldid}`);
           if (control && field.ruleoverride === 0) {
                control.disable();  
              } else if(control) {
                control.enable();  
              }
          if (control && this.qtyField && field.fieldid === this.qtyField.fieldid) {
            this.updateFieldValues(this.qtyField, 1, 'fetchInitialDataqty');
            control.setValue(1, { emitEvent: false });
          }
        });

        const minmaxdata = results.minMaxData?.data;
        this.min_width = minmaxdata?.widthminmax?.min ?? null;
        this.min_drop  = minmaxdata?.dropminmax?.min ?? null;
        this.max_width = minmaxdata?.widthminmax?.max ?? null;
        this.max_drop  = minmaxdata?.dropminmax?.max ?? null;

        if (results.recipeList?.[0]?.data?.[0]) {
          const recipe = results.recipeList[0].data[0];
          this.rulescount = recipe.rulescount;
          this.formulacount = recipe.formulacount;
        }
       if (results.FractionList?.result) {
          const fraction = results.FractionList.result;
          this.unittypename = fraction.fractioname;
          this.inchfractionselected = fraction.inchfractionselected;
          this.unittype  = fraction.unitypeid;
          if(fraction.inchfraction){
            this.inchfraction_array = fraction.inchfraction;
            this.showFractions = true;
          }
          if(this.unitField && this.unitField.optionsvalue){
           const selectedunitOption = this.unitField.optionsvalue.find(opt => `${opt.optionid}` === `${this.unittype}`);
           this.updateFieldValues(this.unitField, selectedunitOption,'updateunittype');
          }
        }
      }
    }),
    catchError(err => {
      console.error('Error fetching product data:', err);
      this.errorMessage = 'Failed to load product data. Please try again.';
      return of(null);
    }),
    finalize(() => {
      this.isLoading = false;
      this.cd.markForCheck();
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
  }

  /**
   * Load top-level option data for fields that require it (3,5,20 etc.)
   */
  private loadOptionData(params: any): Observable<any> {
    return this.apiService.filterbasedlist(params, '','','',this.pricegroup,this.colorid,this.fabricid,this.unittype).pipe(
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
              matrial = 1;
              filter = filterresponseData.coloridsarray;
            } else if (field.fieldtypeid === 20) {
              matrial = 2;
              filter = filterresponseData.coloridsarray;
            }else if (field.fieldtypeid === 21) {
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
                filter
              ).pipe(
                map((optionData: any) => ({ fieldId: field.fieldid, optionData })),
                catchError(err => {
                  console.error(`Error loading options for field ${field.fieldid}:`, err);
                  return of(null);
                })
              )
            );
          } else if ([14, 34, 17, 13,4].includes(field.fieldtypeid)) {
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
              }else if(field.fieldtypeid === 13){
                this.pricegroup = valueToSet;
              }
              if(field.fieldtypeid === 17){
                this.supplierOption = field.optionsvalue;
              }else if(field.fieldtypeid === 13){
                 this.priceGroupOption =field.optionsvalue;
              }else if(field.fieldtypeid === 34){
                  this.unitOption =field.optionsvalue;
              }
              if(field && field.optionsvalue){
                const selectedOption = field.optionsvalue.find(opt => `${opt.optionid}` === `${valueToSet}`);
                this.updateFieldValues(field, selectedOption,' defaultunittpyeprictypesupplier');
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
          const control = this.orderForm.get(`field_${field.fieldid}`);

          if (control) {
            let valueToSet: any;

            if (field.fieldtypeid === 3 && field.selection == 1) {
              valueToSet = field.optiondefault
                ? field.optiondefault.toString().split(',').filter((val: string) => val !== '').map(Number)
                : [];
            } else if (field.fieldtypeid === 20) {
              valueToSet = +params.color_id || '';
            } else if (field.fieldtypeid === 5) {
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
          if ([34, 17, 13,4].includes(field.fieldtypeid)) {
            return Array.isArray(field.optionsvalue) && field.optionsvalue.length > 0;
          } else if ([3, 5, 20,21].includes(field.fieldtypeid)) {
            return this.option_data[field.fieldid]?.length > 0;
          }
          return true;
        });

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
      if((field.fieldtypeid === 5 && field.level == 1) || (field.fieldtypeid === 21 && field.level == 1 )){
        this.fabricid  = 0;
        this.colorid = 0;
        this.updateMinMaxValidators(false);
      }
      if ((field.fieldtypeid === 5 && field.level == 2) || field.fieldtypeid === 20 || (field.fieldtypeid === 21 && field.level == 2 )) {
        this.colorid = 0;
        this.updateMinMaxValidators(false);
      }
      this.updateFieldValues(field, null, 'valueChangedToEmpty');
      this.clearExistingSubfields(field.fieldid, field.allparentFieldId);
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
    
        this.updateFieldValues(field, selectedOptions,'Array.isArrayOptions');
        this.cd.markForCheck();
      });

    } else {
      const selectedOption = options.find(opt => `${opt.optionid}` === `${value}`);
      if (!selectedOption) return;
      
      const canUpdate = !isInitial || (field.optiondefault && params.color_id);

      if (canUpdate && (field.fieldtypeid === 5 && field.level == 2 || field.fieldtypeid === 20) && selectedOption.optionimage) {
        this.background_color_image_url = this.apiUrl + '/api/public' + selectedOption.optionimage;
        if (this.is3DOn) {
          this.threeService.updateTextures(this.background_color_image_url);
        } else {
          this.threeService.updateTextures2d(this.mainframe, this.background_color_image_url);
        }
      }
      
      if (canUpdate && (field.fieldtypeid === 3 && field.fieldname == "Curtain Colour" ) && selectedOption.optionimage) {
            
          this.threeService.updateTextures(this.apiUrl + '/api/public' + selectedOption.optionimage);
      }
      if (canUpdate && (field.fieldtypeid === 3 && field.fieldname == "Frame Colour" ) && selectedOption.optionimage) {
            
          this.threeService.updateFrame(this.apiUrl + '/api/public' + selectedOption.optionimage);
      }
      this.processSelectedOption(params, field, selectedOption).pipe(
        takeUntil(this.destroy$)
      ).subscribe(() => {
        if ((field.fieldtypeid === 5 && field.level == 1 && selectedOption.pricegroupid) || field.fieldtypeid === 20 || (field.fieldtypeid === 21 && field.level == 1)) {
        
          this.pricegroup = selectedOption.pricegroupid;
          if (this.priceGroupField) {
            const control = this.orderForm.get(`field_${this.priceGroupField.fieldid}`);
            if (control) {
               control.setValue(this.pricegroup, { emitEvent: false});
             
              const selectedOption = this.priceGroupOption.find((opt: { optionid: any; }) => `${opt.optionid}` === `${this.pricegroup}`);
              this.updateFieldValues(this.priceGroupField, selectedOption,'pricegrouponColor');
            }else{
                if( this.priceGroupField.optionsvalue){
                  const selectedOption =   this.priceGroupField.optionsvalue.find(opt => `${opt.optionid}` === `${this.pricegroup}`)
                  this.updateFieldValues(this.priceGroupField, selectedOption,'pricegrouponColor');
                }
            }
          }
          this.apiService.filterbasedlist(params, '', String(field.fieldtypeid), String(field.fieldid),this.pricegroup,this.colorid,this.fabricid,this.unittype)
          .pipe(takeUntil(this.destroy$))
          .subscribe((filterData: any) => {
              this.supplier_id = filterData[0].data.selectsupplierid;
              if (this.supplierField) {
                const control = this.orderForm.get(`field_${this.supplierField.fieldid}`);
                if (control) {
                  control.setValue(Number(this.supplier_id), { emitEvent: false });
                  const selectedOption = this.supplierOption.find((opt: { optionid: any; }) => `${opt.optionid}` === `${this.supplier_id}`);
                  this.updateFieldValues(this.supplierField, selectedOption,'suppieronColor');
                }else{
                  if( this.supplierField.optionsvalue){
                    const selectedOption =   this.supplierField.optionsvalue.find(opt => `${opt.optionid}` === `${this.supplier_id}`)
                    this.updateFieldValues(this.supplierField, selectedOption,'suppieronColor');
                  }
                }
              }
          });
        }else{
           this.updateFieldValues(field, selectedOption,'restOption');
        }
       
        if((field.fieldtypeid === 5 && field.level == 1) || (field.fieldtypeid === 21 && field.level == 1) ){
          this.fabricid  = value;
          this.fabricname = selectedOption.optionname;
          this.updateMinMaxValidators(false);
          this.updateFieldValues(field, selectedOption,'updatefabric');
        }
       if ((field.fieldtypeid === 5 && field.level == 2) || field.fieldtypeid === 20  || (field.fieldtypeid === 21 && field.level == 2)) {
          this.colorid = value;
          this.colorname = selectedOption.optionname;
          this.updateFieldValues(field, selectedOption,'updatecolor');
          this.updateMinMaxValidators(true);
        }

        this.cd.markForCheck();
      });
    }
  }

    private updateMinMaxValidators(color :boolean): void {
    this.min_width = null;
    this.max_width = null;
    this.min_drop = null;
    this.max_drop = null;
    if(color){
      var colorid =  String(this.colorid);
    }else{
      var colorid =  "";
    }
    this.apiService.getminandmax(this.routeParams, colorid, this.unittype, Number(this.pricegroup))
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
  onFrameChange(newFrameUrl: string): void {
    this.mainframe = newFrameUrl;

    this.product_img_array.forEach(img => {
      img.is_default = (img.image_url === newFrameUrl);
    });

    if (this.threeService) {
      this.threeService.updateTextures2d(this.mainframe, this.background_color_image_url);
    }
  }
  public getFrameImageUrl(product_img: any): string {
    return product_img?.image_url || '';
  }
  public isSelectedFrame(product_img: any): boolean {
    return product_img?.is_default || false;
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
      this.supplier_id
    ).pipe(
      takeUntil(this.destroy$),
      switchMap((subFieldResponse: any) => {
        const sublist = subFieldResponse?.[0]?.data;
        if (!Array.isArray(sublist)) return of(null);

        // filter to only fields that we know how to handle
        const relevant = sublist.filter((subfield: ProductField) =>
          [3, 5, 20, 21,18,6].includes(subfield.fieldtypeid)
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
    return this.apiService.filterbasedlist(params, '', String(subfield.fieldtypeid), String(subfield.fieldid),this.pricegroup,this.colorid,this.fabricid,this.unittype).pipe(
      takeUntil(this.destroy$),
      switchMap((filterData: any) => {
        if (!filterData?.[0]?.data?.optionarray) return of(null);

        const filterresponseData = filterData[0].data;

        if ([3, 5, 20,21].includes(subfield.fieldtypeid)) {
          let matrial = 0;
          let filter = '';

          if (subfield.fieldtypeid === 3) {
            matrial = 0;
            filter = filterresponseData.optionarray[subfield.fieldid];
          } else if (subfield.fieldtypeid === 5 || subfield.fieldtypeid === 20 || subfield.fieldtypeid === 21) {
            matrial = 2;
            filter = filterresponseData.coloridsarray;
          } 

          return this.apiService.getOptionlist(
            params,
            subfield.level,
            subfield.fieldtypeid,
            matrial,
            subfield.fieldid,
            filter
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

  const controlName = `field_${fieldId}`;
  if (this.orderForm.contains(controlName)) {
    this.orderForm.removeControl(controlName);
  }

  if (this.option_data[fieldId]) {
    delete this.option_data[fieldId];
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

  // 5. Clean nested structure
  this.cleanNestedStructure(parentFieldId, fieldsToRemove, isMainField);

  // 6. Remove form controls and clean up
  fieldsToRemove.forEach(field => {
    const controlName = `field_${field.fieldid}`;
    if (this.orderForm.contains(controlName)) {
      this.orderForm.removeControl(controlName);
    }
    delete this.option_data[field.fieldid];
  });

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

private updateFieldValues(field: ProductField,selectedOption: any = [],fundebug: string = ""): void {
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
  if ( selectedOption ) {
  const processOption = (opt: any) => {
   
    const transformedOption = {
      optionvalue: Number(opt.optionid),
      fieldtypeid: field.fieldtypeid,
      optionqty: field.optionquantity || 1,
      fieldoptionlinkid: opt.fieldoptionlinkid,
      fieldid:field.fieldid
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
    if(field.fieldtypeid == 34 || field.fieldtypeid == 17 || field.fieldtypeid == 13){
      targetField.labelname = targetField.fieldname ?? '';
      targetField.valueid = selectedOption?.fieldoptionlinkid ? String(selectedOption.fieldoptionlinkid): '';
      targetField.optionid = String(selectedOption.optionid);
      targetField.value = String(selectedOption.optionid);
      targetField.optionvalue = [selectedOption];
      targetField.optionquantity = '1';
      targetField.valuename = String(selectedOption.optionname);
    }else{
      targetField.value = '';
      targetField.valueid = '';
      targetField.optionid = '';
      targetField.optionvalue = [];
      targetField.optionquantity = '';
    }
    
  }else if (selectedOption !== null) {
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
      
      targetField.valueid = selectedOption?.fieldoptionlinkid ? String(selectedOption.fieldoptionlinkid): '';

      targetField.optionid = String(selectedOption.optionid);
      if ([17, 13].includes(field.fieldtypeid)) {
        targetField.value = String(selectedOption.optionid);
        targetField.valuename = String(selectedOption.optionname);
      }else{
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

  if (this.widthField && [7,8, 11, 31, 34].includes(targetField.fieldtypeid)) {
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

  if (this.dropField && [9,10,12, 32, 34].includes(targetField.fieldtypeid)) {
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
    }
    if (values['dropfraction'] !== this.previousFormValue['dropfraction'] && this.dropField) {
      let mainDrop = Number(this.orderForm.get('field_' + this.dropField.fieldid)?.value) || 0;
      let fractionValue = Number(values['dropfraction']) || 0;
      const totalDrop = mainDrop + fractionValue;
      this.drop = totalDrop;
      this.updateFieldValues(this.dropField, mainDrop, 'TotalDrop');
    }
    for (const key in values) {
      if (!key.startsWith('field_')) continue;

      if (values[key] !== this.previousFormValue[key]) {
        const fieldId = parseInt(key.replace('field_', ''), 10);
        const field = this.parameters_data.find(f => f.fieldid === fieldId);

        if (field && [3, 5, 20,21].includes(field.fieldtypeid)) {
          // Trigger selection change handler
          this.handleOptionSelectionChange(params, field, values[key], false);
        } else if (field && field.fieldtypeid === 34) {
          this.handleUnitTypeChange(values[key], params);
          this.handleRestOptionChange(params, field, values[key]);
        }else if(field  && [14, 18, 6,29].includes(field.fieldtypeid)){
           this.handleRestChange(params, field, values[key]);
        }else if(field  && [ 7,8,11,31].includes(field.fieldtypeid)){
           this.handleWidthChange(params, field, values[key]);
        }else if(field  && [9,10,12,32].includes(field.fieldtypeid)){
           this.handleDropChange(params, field, values[key]);
        }else if(field) {
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
    this.updateFieldValues(field, value,'Totalwidth');
  }
  private handleDropChange(params: any, field: ProductField, value: any): void {
    let fractionValue = 0;
    
    if (this.showFractions) {
      fractionValue = Number(this.orderForm.get('dropfraction')?.value) || 0;
    }

    const totalDrop = Number(value) + fractionValue;
    this.drop = totalDrop;
    this.updateFieldValues(field, value,'TotalDrop');
  }
  
  private handleRestOptionChange(params: any, field: ProductField, value: any): void {
    if (value === null || value === undefined || value === '') {
      return;
    }

    const options = field.optionsvalue;
    if (!options || options.length === 0) return;

    const selectedOption = options.find(opt => `${opt.optionid}` === `${value}`);
     
    if (!selectedOption) return;

    this.updateFieldValues(field, [selectedOption],'handleRestOptionChange');
  }
  private handleRestChange(params: any, field: ProductField, value: any): void {
      this.updateFieldValues(field, value,'handleRestChange');
  }
  handleUnitTypeChange(value: any, params: any): void {
    const unitValue = typeof value === 'string' ? parseInt(value, 10) : value;
    this.unittype =  unitValue;
    this.showFractions = (unitValue === 4);
    this.updateMinMaxValidators(true);
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
    console.log(this.jsondata);
    if (!this.routeParams || !this.routeParams.site || !this.routeParams.cart_productid) {
      this.errorMessage = 'Missing required route parameters for cart submission.';
      this.isSubmitting = false;
      this.cd.markForCheck();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;
    console.log(this.pricedata);
    const visualizerImage = this.threeService.getCanvasDataURL();

    this.apiService.addToCart(this.jsondata, this.routeParams.cart_productid, this.routeParams.site,
     this.buildProductTitle(this.ecomproductname,this.fabricname,this.colorname),
      this.pricedata,
      this.vatpercentage,
      this.vatname,
      window.location.href,
      this.productname,
      this.routeParams.category,
      visualizerImage,
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
                window.location.href = this.routeParams.site + '/cart';
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

  return extras ? `${ecomproductname} - ${extras}` : ecomproductname;
}
private getVat(): Observable<any> {
  return this.apiService.getVat(
    this.routeParams
  );
}
private getPrice(): Observable<any> {
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
          this.widthField.fieldtypeid,
          this.dropField.fieldtypeid,
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
          this.fabricFieldType.fieldtypeid
        );
      };

      if (this.rulescount > 0) {
        return this.apiService.calculateRules(
          this.routeParams,
          this.width,
          this.drop,
          this.unittype,
          this.supplier_id,
          this.widthField.fieldtypeid,
          this.dropField.fieldtypeid,
          this.pricegroup,
          vatPercentage,
          this.selected_option_data,
          this.fabricid,
          this.colorid,
          this.rulesorderitem,
          0,
          this.fabricFieldType.fieldtypeid
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
                this.widthField.fieldtypeid,
                this.dropField.fieldtypeid,
                this.pricegroup,
                vatPercentage,
                this.selected_option_data,
                this.fabricid,
                this.colorid,
                this.rulesorderitem,
                1
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
          this.widthField.fieldtypeid,
          this.dropField.fieldtypeid,
          this.pricegroup,
          vatPercentage,
          this.selected_option_data,
          this.fabricid,
          this.colorid,
          this.rulesorderitem,
          1
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
      '4' : 'list',
      '29' : 'text'
    };

    return field_types[chosen_field_type_id] || '';
  }

  trackByFieldId(index: number, field: ProductField): number {
    return field.fieldid;
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
  private orderitemdata(isForRulesCalculation: boolean = false): any[] {
    return this.parameters_data.map(t => {
      const isSpecialType = isForRulesCalculation && [34, 17, 13].includes(+t.fieldtypeid);
      const i = {
        id: +t.fieldid,
        labelname: t.fieldname,
        value: isSpecialType ? t.valuename || null : t.value || null,
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
}
