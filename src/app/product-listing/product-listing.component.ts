import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, Subscription, forkJoin, from, of } from 'rxjs';
import { catchError, finalize, map, mergeMap, reduce, switchMap, takeUntil } from 'rxjs/operators';
import { ApiService } from '../services/api.service';
import { environment } from '../../environments/environment';
import { ProductPreloadService } from '../services/product-preload.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FreesampleComponent } from '../freesample/freesample.component';

interface ListingCategoryValue {
  name: string;
  id: string | number;
  categoryid?: string | number;
  img?: string;
  normalizedName?: string;
  resolvedImg?: string;
}

interface ListingCategory {
  name: string;
  id: string | number;
  values: ListingCategoryValue[];
}

interface ListingProductItem {
  pei_productid?: string | number;
  productname?: string;
  ecomdescription?: string;
  description?: string;
  fd_id?: string | number;
  fabricid?: string | number;
  fabricname?: string;
  fabric_name?: string;
  cd_id?: string | number;
  colorid?: string | number;
  colorname?: string;
  color_name?: string;
  suppliername?: string;
  supplier_name?: string;
  supplier?: string;
  supplierid?: string | number;
  supplier_id?: string | number;
  groupid?: string | number;
  pricegroupid?: string | number;
  matmapid?: string | number;
  prices?: string;
  category?: string | number;
  pricetablesupplier?: string;
  salecount?: string | number;
  minprice?: string | number;
  minimum_price?: string | number;
  price?: string | number;
  extraoffer?: string | number;
  extra_offer?: string | number;
  colorimage?: string;
  color_image?: string;
  __listing?: ListingProductComputed;
  __trackKey?: string;
  __variantKey?: string;
  __freeSampleData?: Record<string, any>;
  [key: string]: any;
}

interface ListingProductComputed {
  imageUrl: string;
  displayName: string;
  swatchName: string;
  colorName: string;
  description: string;
  categoryLabel: string;
  price: number;
  originalPrice: number;
  offerPercent: number;
  savingsAmount: number;
}

interface TransparentHoleRegion {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  found: boolean;
}

interface ListingFabricGroup {
  key: string;
  fabricName: string;
  variants: ListingProductItem[];
  previewVariants: ListingProductItem[];
  hiddenVariantCount: number;
  hasMoreVariants: boolean;
  activeVariant: ListingProductItem;
}

interface ListingActiveFilterChip {
  key: string;
  categoryKey: string;
  categoryName: string;
  normalizedValue: string;
  valueName: string;
  label: string;
}

type SortKey = 'defaultsorting' | 'bestselling' | 'priceasc' | 'pricedesc';

@Component({
  selector: 'app-product-listing',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    FreesampleComponent
  ],
  templateUrl: './product-listing.component.html',
  styleUrls: ['./product-listing.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductListingComponent implements OnInit, OnDestroy {
  @ViewChild('sortDropdownRef') sortDropdownRef?: ElementRef<HTMLElement>;
  private destroy$ = new Subject<void>();
  private listRequestSub: Subscription | null = null;
  private listRequestVersion = 0;
  private productDataPayload: any = null;
  private shouldRestoreListingScroll = false;
  private readonly listingScrollStoragePrefix = 'listing_scroll::';
  private readonly listingScrollPendingStorageKey = 'listing_scroll_pending';
  private listingScrollRestoreTimerId: ReturnType<typeof setTimeout> | null = null;
  private listingScrollRestoreRafId: number | null = null;
  private resizeDebounceTimerId: ReturnType<typeof setTimeout> | null = null;
  private listFetchDebounceTimerId: ReturnType<typeof setTimeout> | null = null;

  isLoading = false;
  isListLoading = false;
  errorMessage: string | null = null;
  listErrorMessage: string | null = null;

  params: any = {};
  productId = 0;
  cartProductId = 0;
  productTitle = '';
  productDescription = '';
  productSlug = '';
  bannerImageUrl = '';
  listingFrameImageUrl = '';
  productCategory = 0;
  ecomFreeSample = false;
  ecomSamplePrice = 0;
  fieldscategoryid = 20;

  gridColumns = 3;
  isMobileViewport = false;
  isMobileFilterDrawerOpen = false;
  isSortMenuOpen = false;
  sortBy: SortKey = 'defaultsorting';
  currencySymbol = '\u00A3';
  // Component-level toggle: set true to show Supplier/Brands filter category.
  showSupplierBrandsCategory = false;
  // Component-level toggle: set true to enable grouped Fabric view switch.
  enableFabricGroupedView = true;
  // Only listing category 3 supports grouped fabric view.
  private readonly fabricViewCategoryId = 3;
  // Component-level toggle: set false to hide frame in listing cards.
  showFrameInProductListing = true;
  // Component-level toggle: set false to hide top banner.
  // When hidden, breadcrumb is shown under the listing page title.
  showListingBanner = false;
  catalogViewMode: 'products' | 'fabrics' = 'products';

  categories: ListingCategory[] = [];
  hasSidebarFilters = false;
  paginatedProducts: ListingProductItem[] = [];
  fabricGroups: ListingFabricGroup[] = [];
  paginatedFabricGroups: ListingFabricGroup[] = [];
  private selectedFabricVariantByGroup: Record<string, string> = {};
  fabricColorPopupGroupKey: string | null = null;
  selectedCategoryValues: Record<string, Set<string>> = {};
  pageSizeOptions: number[] = [12, 24, 48, 96];
  pageSize = 24;
  pageIndex = 0;
  totalProducts = 0;
  totalPages = 0;
  private readonly fabricFetchPerPage = 2000;
  private readonly fabricColorPreviewLimitMobile = 10;
  private readonly fabricColorPreviewLimitDesktopGrid = 10;
  private readonly fabricColorPreviewLimitDesktopList = 18;
  readonly skeletonCards = Array.from({ length: 6 });
  readonly skeletonFilterBlocks = Array.from({ length: 3 });
  readonly skeletonFilterLines = Array.from({ length: 4 });
  readonly sortOptions: Array<{ value: SortKey; label: string }> = [
    { value: 'defaultsorting', label: 'Featured' },
    { value: 'bestselling', label: 'Bestselling' },
    { value: 'priceasc', label: 'Price: Low to High' },
    { value: 'pricedesc', label: 'Price: High to Low' }
  ];

  readonly imgpath = `${environment.apiUrl}/api/public/storage/attachments/${environment.apiName}/material/colour/`;
  private readonly composedImageCacheLimit = 120;
  private readonly imageLoadPromiseCacheLimit = 300;
  private readonly frameTransparentRegionCacheLimit = 200;
  private readonly frameAlphaThreshold = 40;
  private composedListingImageMap = new Map<string, string>();
  private composingListingImageKeys = new Set<string>();
  private failedListingImageKeys = new Set<string>();
  private imageLoadPromiseCache = new Map<string, Promise<HTMLImageElement>>();
  private frameTransparentRegionCache = new Map<string, TransparentHoleRegion>();
  private listingCompositionQueue: Array<{ key: string; frameUrl: string; colorUrl: string }> = [];
  private activeListingCompositions = 0;
  private readonly maxParallelListingCompositions = 4;
  private readonly mobileViewportMaxWidth = 1100;
  private readonly forceListViewportMaxWidth = 640;
  private forceListByMobileViewport = false;
  private lastDesktopGridColumns = this.gridColumns;

  get canUseFabricView(): boolean {
    return this.enableFabricGroupedView && this.productCategory === this.fabricViewCategoryId;
  }

  get isFabricViewMode(): boolean {
    return this.canUseFabricView && this.catalogViewMode === 'fabrics';
  }

  get showListGridViewToggle(): boolean {
    return !this.forceListByMobileViewport;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private apiService: ApiService,
    private productPreloadService: ProductPreloadService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.applyViewportMode();
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((routeParams) => {
      const queryParams = this.route.snapshot.queryParams || {};
      this.applyGridColumnsFromQueryParams(queryParams);
      const productId = routeParams['product_id'] ?? queryParams['product_id'];
      const routeCartProductId = this.resolveCartProductId(routeParams, queryParams);
      this.shouldRestoreListingScroll =
        this.router.getCurrentNavigation()?.trigger === 'popstate' || this.hasPendingScrollRestore();

      if (!productId) {
        this.errorMessage = 'Missing product id for listing page.';
        this.cd.markForCheck();
        return;
      }

      this.params = {
        ...queryParams,
        ...routeParams,
        product_id: productId,
        cart_productid: routeCartProductId,
        api_url: environment.apiUrl,
        api_key: environment.apiKey,
        api_name: environment.apiName,
        site: environment.site
      };

      this.loadListingData();
    });
  }

  ngOnDestroy(): void {
    this.listRequestSub?.unsubscribe();
    if (this.resizeDebounceTimerId !== null) {
      clearTimeout(this.resizeDebounceTimerId);
      this.resizeDebounceTimerId = null;
    }
    if (this.listFetchDebounceTimerId !== null) {
      clearTimeout(this.listFetchDebounceTimerId);
      this.listFetchDebounceTimerId = null;
    }
    this.clearListingScrollRestoreHandles();
    this.composingListingImageKeys.clear();
    this.failedListingImageKeys.clear();
    this.imageLoadPromiseCache.clear();
    this.frameTransparentRegionCache.clear();
    this.composedListingImageMap.clear();
    this.listingCompositionQueue = [];
    this.activeListingCompositions = 0;
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.resizeDebounceTimerId !== null) {
      clearTimeout(this.resizeDebounceTimerId);
    }
    this.resizeDebounceTimerId = setTimeout(() => {
      this.resizeDebounceTimerId = null;
      this.applyViewportMode();
    }, 120);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.isSortMenuOpen) {
      return;
    }
    const dropdownElement = this.sortDropdownRef?.nativeElement;
    const targetNode = event.target as Node | null;
    if (!dropdownElement || !targetNode || !dropdownElement.contains(targetNode)) {
      this.isSortMenuOpen = false;
      this.cd.markForCheck();
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKeydown(event: Event): void {
    if (!this.isSortMenuOpen) {
      return;
    }
    event.preventDefault();
    this.isSortMenuOpen = false;
    this.cd.markForCheck();
  }

  private applyViewportMode(): void {
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const nextIsMobile = viewportWidth <= this.mobileViewportMaxWidth;
    const shouldForceListByViewport = this.shouldForceListByViewport(viewportWidth);
    let shouldMarkForCheck = false;

    if (this.isMobileViewport !== nextIsMobile) {
      this.isMobileViewport = nextIsMobile;
      shouldMarkForCheck = true;
      // Recompute preview chips count when switching desktop/mobile.
      if (this.isFabricViewMode && this.paginatedProducts.length) {
        this.rebuildFabricGroups(this.paginatedProducts);
      }
    }

    if (nextIsMobile && this.isSortMenuOpen) {
      this.isSortMenuOpen = false;
      shouldMarkForCheck = true;
    }

    if (shouldForceListByViewport) {
      if (this.gridColumns !== 1) {
        this.lastDesktopGridColumns = this.gridColumns;
        this.gridColumns = 1;
        this.forceListByMobileViewport = true;
        shouldMarkForCheck = true;
      }
    } else if (this.forceListByMobileViewport) {
      const restoreColumns = [1, 2, 3, 4].includes(this.lastDesktopGridColumns) ? this.lastDesktopGridColumns : 3;
      this.gridColumns = restoreColumns;
      this.forceListByMobileViewport = false;
      shouldMarkForCheck = true;
    }

    if (!nextIsMobile && this.isMobileFilterDrawerOpen) {
      this.isMobileFilterDrawerOpen = false;
      shouldMarkForCheck = true;
    }

    if (shouldMarkForCheck) {
      this.cd.markForCheck();
    }
  }

  private shouldForceListByViewport(viewportWidth?: number): boolean {
    const width = typeof viewportWidth === 'number'
      ? viewportWidth
      : (typeof window !== 'undefined' ? window.innerWidth : 1280);
    return width <= this.forceListViewportMaxWidth;
  }

  openMobileFilterDrawer(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (!this.isMobileViewport || !this.hasSidebar) {
      return;
    }
    if (this.isMobileFilterDrawerOpen) {
      return;
    }
    this.isSortMenuOpen = false;
    this.isMobileFilterDrawerOpen = true;
    this.cd.markForCheck();
  }

  closeMobileFilterDrawer(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (!this.isMobileFilterDrawerOpen) {
      return;
    }
    this.isMobileFilterDrawerOpen = false;
    this.cd.markForCheck();
  }

  private loadListingData(): void {
    this.isSortMenuOpen = false;
    this.isLoading = true;
    this.errorMessage = null;
    this.listErrorMessage = null;
    this.paginatedProducts = [];
    this.fabricGroups = [];
    this.paginatedFabricGroups = [];
    this.hasSidebarFilters = false;
    this.selectedFabricVariantByGroup = {};
    this.fabricColorPopupGroupKey = null;
    this.pageIndex = 0;
    this.totalProducts = 0;
    this.totalPages = 0;

    this.apiService.getProductData(this.params).pipe(
      takeUntil(this.destroy$),
      switchMap((productData: any) => {
        const product = productData?.result?.EcomProductlist?.[0];
        if (!product) {
          throw new Error('Product details not found.');
        }

        this.productDataPayload = productData;
        this.productId = Number(product.pei_productid || this.params.product_id || 0);
        const resolvedCartProductId = this.resolveCartProductId();
        const routeCartId = this.toNumber(resolvedCartProductId);
        const productCartId = this.toNumber(
          product.pei_id || product.cart_productid || product.cartproductid || product.wp_product_id
        );
        this.cartProductId = routeCartId > 0 ? routeCartId : (productCartId > 0 ? productCartId : this.productId);
        this.params = {
          ...this.params,
          cart_productid: resolvedCartProductId || String(this.cartProductId || '')
        };
        this.productTitle = product.pei_ecomProductName || product.label || '';
        this.productSlug = this.slugify(product.label || this.productTitle);
        this.productDescription = String(product.pi_productdescription || '');
        this.bannerImageUrl = this.resolveBannerImage(product);
        const nextFrameUrl = this.resolveListingFrameImage(product);
        if (this.listingFrameImageUrl !== nextFrameUrl) {
          this.resetListingImageCompositionCaches();
        }
        this.listingFrameImageUrl = nextFrameUrl;
        this.productCategory = this.toNumber(product.pi_category);
        this.catalogViewMode = this.canUseFabricView ? 'fabrics' : 'products';
        this.ecomFreeSample = this.toBoolean(product.pei_ecomFreeSample);
        this.ecomSamplePrice = this.toNumber(product.pei_ecomsampleprice);
        this.fieldscategoryid = this.resolveFieldsCategoryId(product.pi_category);

        this.productPreloadService.set(this.productId || this.params.product_id, productData);

        return forkJoin({
          categoryData: this.apiService.getCategoryList(this.params).pipe(catchError(() => of(null))),
          brandsData: this.apiService.getBrands(this.params).pipe(catchError(() => of(null)))
        });
      }),
      catchError((err) => {
        console.error('Listing page load failed:', err);
        this.errorMessage = 'Unable to load listing data.';
        return of(null);
      }),
      finalize(() => {
        this.isLoading = false;
        this.cd.markForCheck();
      })
    ).subscribe((result: any) => {
      if (!result) {
        return;
      }

      this.categories = this.prepareCategories(result?.categoryData?.result, result?.brandsData?.result);
      this.hasSidebarFilters = this.categories.some((category) => Array.isArray(category.values) && category.values.length > 0);
      this.initializeSelectedFilters();
      this.applyQueryParamSelections();
      this.fetchListingProducts(false);
      this.cd.markForCheck();
    });
  }

  private prepareCategories(rawCategories: any, rawBrands: any): ListingCategory[] {
    const categories: ListingCategory[] = [];
    const categoryArray = this.toArray(rawCategories);

    categoryArray.forEach((cat: any) => {
      const valuesArray = this.toArray(cat?.values);
      if (!cat || !cat.name || valuesArray.length === 0) {
        return;
      }

      const values = valuesArray
        .filter((value: any) => value && value.name)
        .map((value: any) => ({
          name: String(value.name),
          id: value.id,
          categoryid: value.categoryid,
          img: value.img || '',
          normalizedName: this.normalize(value.name),
          resolvedImg: this.resolveCategoryValueImage(value.img || '')
        }));

      if (!values.length) {
        return;
      }

      categories.push({
        name: String(cat.name),
        id: cat.id ?? '',
        values
      });
    });

    const brands = this.toArray(rawBrands);
    const supplierValues: ListingCategoryValue[] = [];
    let supplierId = 99999;

    brands.forEach((brand: any) => {
      const supplierName = brand?.supplier_name || brand?.name || '';
      if (!supplierName) {
        return;
      }

      supplierValues.push({
        name: String(supplierName),
        id: supplierId--,
        categoryid: '0',
        img: '',
        normalizedName: this.normalize(supplierName),
        resolvedImg: ''
      });
    });

    if (this.showSupplierBrandsCategory && supplierValues.length) {
      categories.unshift({
        name: 'Supplier',
        id: '0',
        values: supplierValues
      });
    }

    return categories.sort((a, b) => {
      if (a.name === 'Color') return -1;
      if (b.name === 'Color') return 1;
      return 0;
    });
  }

  private initializeSelectedFilters(): void {
    this.selectedCategoryValues = {};
    this.categories.forEach((category) => {
      this.selectedCategoryValues[this.categoryKey(category)] = new Set<string>();
    });
  }

  private applyQueryParamSelections(): void {
    const queryParams = this.route.snapshot.queryParams || {};
    this.categories.forEach((category) => {
      const key = this.categoryKey(category);
      const fromQuery = queryParams[category.name];
      if (!fromQuery || typeof fromQuery !== 'string') {
        return;
      }

      const selected = fromQuery
        .split(',')
        .map((value: string) => this.normalize(value))
        .filter((value: string) => !!value);

      selected.forEach((value: string) => this.selectedCategoryValues[key].add(value));
    });

    const sortBy = String(queryParams['product_sorting'] || queryParams['sort'] || '').trim();
    const validValues: SortKey[] = ['defaultsorting', 'bestselling', 'priceasc', 'pricedesc'];
    if (validValues.includes(sortBy as SortKey)) {
      this.sortBy = sortBy as SortKey;
    }

    const pageFromQuery = this.toNumber(queryParams['page'] ?? queryParams['page_no']);
    if (pageFromQuery > 0) {
      this.pageIndex = pageFromQuery - 1;
    }

    const perPageFromQuery = this.toNumber(queryParams['per_page'] ?? queryParams['perpage']);
    if (perPageFromQuery > 0) {
      this.pageSize = perPageFromQuery;
      this.mergePageSizeOption(perPageFromQuery);
    }

    const catalogFromQuery = String(
      queryParams['catalog'] ?? queryParams['catalog_view'] ?? queryParams['view_mode'] ?? ''
    ).trim().toLowerCase();
    if (this.canUseFabricView && (catalogFromQuery === 'products' || catalogFromQuery === 'fabrics')) {
      this.catalogViewMode = catalogFromQuery as 'products' | 'fabrics';
    }

    this.applyGridColumnsFromQueryParams(queryParams);
  }

  private applyGridColumnsFromQueryParams(queryParams: Record<string, any>): void {
    const gridFromQuery = this.toPositiveInt(
      queryParams['grid'] ?? queryParams['cols'] ?? queryParams['columns'],
      0
    );
    if (![1, 2, 3, 4].includes(gridFromQuery)) {
      return;
    }

    this.lastDesktopGridColumns = gridFromQuery;
    if (this.shouldForceListByViewport()) {
      this.gridColumns = 1;
      this.forceListByMobileViewport = true;
      return;
    }

    this.gridColumns = gridFromQuery;
    this.forceListByMobileViewport = false;
  }

  private syncListingStateToQueryParams(options: { resetPage?: boolean } = {}): void {
    const currentQueryParams = this.getCurrentQueryParamsForSync();
    const nextQueryParams = { ...currentQueryParams };

    this.categories.forEach((category) => {
      delete nextQueryParams[category.name];
      const categoryKey = this.categoryKey(category);
      const selectedSet = this.selectedCategoryValues[categoryKey];
      if (!selectedSet || selectedSet.size === 0) {
        return;
      }

      const selectedNames = this.getSelectedCategoryNames(category, selectedSet);
      if (!selectedNames.length) {
        return;
      }
      nextQueryParams[category.name] = selectedNames.join(',');
    });

    delete nextQueryParams['sort'];
    if (this.sortBy === 'defaultsorting') {
      delete nextQueryParams['product_sorting'];
    } else {
      nextQueryParams['product_sorting'] = this.sortBy;
    }

    delete nextQueryParams['page_no'];
    const pageIndexForQuery = options.resetPage ? 0 : Math.max(this.pageIndex, 0);
    if (pageIndexForQuery > 0) {
      nextQueryParams['page'] = String(pageIndexForQuery + 1);
    } else {
      delete nextQueryParams['page'];
    }

    delete nextQueryParams['perpage'];
    if (this.pageSize > 0 && this.pageSize !== 24) {
      nextQueryParams['per_page'] = String(this.pageSize);
    } else {
      delete nextQueryParams['per_page'];
    }

    delete nextQueryParams['cols'];
    delete nextQueryParams['columns'];
    const gridForQuery = this.forceListByMobileViewport ? this.lastDesktopGridColumns : this.gridColumns;
    if ([1, 2, 3, 4].includes(gridForQuery) && gridForQuery !== 3) {
      nextQueryParams['grid'] = String(gridForQuery);
    } else {
      delete nextQueryParams['grid'];
    }

    delete nextQueryParams['catalog_view'];
    delete nextQueryParams['view_mode'];
    if (this.canUseFabricView) {
      nextQueryParams['catalog'] = this.catalogViewMode;
    } else {
      delete nextQueryParams['catalog'];
    }

    if (this.areQueryParamsEqual(currentQueryParams, nextQueryParams)) {
      return;
    }

    const urlTree = this.router.createUrlTree([], {
      relativeTo: this.route,
      queryParams: nextQueryParams
    });
    this.location.replaceState(this.router.serializeUrl(urlTree));
  }

  private getCurrentQueryParamsForSync(): Record<string, string> {
    if (typeof window === 'undefined') {
      return this.normalizeComparableQueryParams(this.route.snapshot.queryParams || {});
    }

    const params: Record<string, string> = {};
    const search = new URLSearchParams(window.location.search || '');
    search.forEach((value, key) => {
      const normalizedValue = this.normalizeQueryParamValue(value);
      if (!normalizedValue) {
        return;
      }
      params[key] = normalizedValue;
    });
    return params;
  }

  private normalizeComparableQueryParams(queryParams: Record<string, any>): Record<string, string> {
    const normalized: Record<string, string> = {};
    Object.keys(queryParams || {}).forEach((key) => {
      const value = this.normalizeQueryParamValue(queryParams[key]);
      if (!value) {
        return;
      }
      normalized[key] = value;
    });
    return normalized;
  }

  private normalizeQueryParamValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (Array.isArray(value)) {
      return value
        .map((item) => String(item ?? '').trim())
        .filter((item) => !!item)
        .join(',');
    }
    return String(value).trim();
  }

  private areQueryParamsEqual(left: Record<string, string>, right: Record<string, string>): boolean {
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    if (leftKeys.length !== rightKeys.length) {
      return false;
    }

    for (let index = 0; index < leftKeys.length; index += 1) {
      const leftKey = leftKeys[index];
      const rightKey = rightKeys[index];
      if (leftKey !== rightKey) {
        return false;
      }
      if (left[leftKey] !== right[rightKey]) {
        return false;
      }
    }
    return true;
  }

  onFilterToggle(category: ListingCategory, value: ListingCategoryValue, checked: boolean): void {
    const key = this.categoryKey(category);
    const selectedSet = this.selectedCategoryValues[key];
    if (!selectedSet) {
      return;
    }

    const normalizedValue = this.getNormalizedCategoryValue(value);
    if (checked) {
      selectedSet.add(normalizedValue);
    } else {
      selectedSet.delete(normalizedValue);
    }
    this.syncListingStateToQueryParams({ resetPage: true });
    this.scheduleListingFetch(true, 120);
  }

  isSelected(category: ListingCategory, value: ListingCategoryValue): boolean {
    const selectedSet = this.selectedCategoryValues[this.categoryKey(category)];
    if (!selectedSet) {
      return false;
    }
    return selectedSet.has(this.getNormalizedCategoryValue(value));
  }

  clearAllFilters(): void {
    Object.values(this.selectedCategoryValues).forEach((set) => set.clear());
    this.syncListingStateToQueryParams({ resetPage: true });
    this.scheduleListingFetch(true);
  }

  onSortChange(rawValue: string): void {
    const validValues: SortKey[] = ['defaultsorting', 'bestselling', 'priceasc', 'pricedesc'];
    const nextSort = (validValues.includes(rawValue as SortKey) ? rawValue : 'defaultsorting') as SortKey;
    this.isSortMenuOpen = false;
    if (this.sortBy === nextSort) {
      this.cd.markForCheck();
      return;
    }
    this.sortBy = nextSort;
    this.syncListingStateToQueryParams({ resetPage: true });
    this.scheduleListingFetch(true, 100);
  }

  toggleSortMenu(event?: Event): void {
    event?.preventDefault();
    this.isSortMenuOpen = !this.isSortMenuOpen;
    this.cd.markForCheck();
  }

  onSortOptionSelect(value: SortKey, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.onSortChange(value);
  }

  getSortLabel(sortBy: SortKey): string {
    const option = this.sortOptions.find((sortOption) => sortOption.value === sortBy);
    return option?.label || 'Featured';
  }

  private scheduleListingFetch(resetPage: boolean, delayMs = 0): void {
    if (this.listFetchDebounceTimerId !== null) {
      clearTimeout(this.listFetchDebounceTimerId);
      this.listFetchDebounceTimerId = null;
    }

    if (delayMs <= 0) {
      this.fetchListingProducts(resetPage);
      return;
    }

    this.listFetchDebounceTimerId = setTimeout(() => {
      this.listFetchDebounceTimerId = null;
      this.fetchListingProducts(resetPage);
    }, delayMs);
  }

  private fetchListingProducts(resetPage: boolean): void {
    if (this.listFetchDebounceTimerId !== null) {
      clearTimeout(this.listFetchDebounceTimerId);
      this.listFetchDebounceTimerId = null;
    }

    if (resetPage) {
      this.pageIndex = 0;
    }

    if (!this.productId) {
      this.paginatedProducts = [];
      this.fabricGroups = [];
      this.paginatedFabricGroups = [];
      this.selectedFabricVariantByGroup = {};
      this.fabricColorPopupGroupKey = null;
      this.totalProducts = 0;
      this.totalPages = 0;
      return;
    }

    const isFabricMode = this.isFabricViewMode;
    const page = isFabricMode ? 1 : this.pageIndex + 1;
    const perPage = isFabricMode ? this.fabricFetchPerPage : this.pageSize;
    const sort = this.sortBy === 'defaultsorting' ? '' : this.sortBy;
    const filterData = this.buildFilterPayload();
    const requestVersion = ++this.listRequestVersion;

    this.listRequestSub?.unsubscribe();
    this.listErrorMessage = null;
    this.isListLoading = true;
    this.listRequestSub = this.apiService.getFabricListView(
      this.params,
      this.fieldscategoryid,
      {
        page,
        filter_data: filterData,
        sort
      },
      page,
      perPage
    ).pipe(
      takeUntil(this.destroy$),
      map((response: any) => this.parseListingResponse(response, page, perPage)),
      switchMap((parsed) => {
        if (!isFabricMode || parsed.totalPages <= 1) {
          return of(parsed);
        }
        return this.fetchRemainingFabricPages(filterData, sort, perPage, parsed.totalPages, requestVersion).pipe(
          map((remainingItems) => {
            const mergedItems = [...parsed.items, ...remainingItems];
            return {
              ...parsed,
              items: mergedItems,
              total: Math.max(parsed.total, mergedItems.length),
              totalPages: Math.max(parsed.totalPages, 1),
              currentPage: 1,
              perPage
            };
          })
        );
      }),
      catchError((err) => {
        if (requestVersion !== this.listRequestVersion) {
          return of(null);
        }
        console.error('Listing products load failed:', err);
        this.listErrorMessage = 'Unable to load listing products.';
        this.paginatedProducts = [];
        this.fabricGroups = [];
        this.paginatedFabricGroups = [];
        this.selectedFabricVariantByGroup = {};
        this.fabricColorPopupGroupKey = null;
        this.totalProducts = 0;
        this.totalPages = 0;
        return of(null);
      }),
      finalize(() => {
        if (requestVersion !== this.listRequestVersion) {
          return;
        }
        this.isListLoading = false;
        this.cd.markForCheck();
      })
    ).subscribe((parsed) => {
      if (requestVersion !== this.listRequestVersion || !parsed) {
        return;
      }

      this.listErrorMessage = null;
      this.paginatedProducts = parsed.items;
      this.rebuildFabricGroups(this.paginatedProducts);
      if (!isFabricMode) {
        this.totalProducts = parsed.total;
        this.totalPages = parsed.totalPages;
        this.pageIndex = Math.max(parsed.currentPage - 1, 0);
        this.pageSize = parsed.perPage;
        this.mergePageSizeOption(parsed.perPage);
        this.paginatedFabricGroups = [];
      }
      this.prepareListingCardCompositions();
      this.restoreListingScrollPositionIfNeeded();
    });
  }

  private fetchRemainingFabricPages(
    filterData: Record<string, string>,
    sort: string,
    perPage: number,
    totalPages: number,
    requestVersion: number
  ) {
    const pagesToLoad = Array.from({ length: Math.max(totalPages - 1, 0) }, (_, index) => index + 2);
    if (!pagesToLoad.length) {
      return of([] as ListingProductItem[]);
    }

    return from(pagesToLoad).pipe(
      mergeMap((nextPage) =>
        this.apiService.getFabricListView(
          this.params,
          this.fieldscategoryid,
          {
            page: nextPage,
            filter_data: filterData,
            sort
          },
          nextPage,
          perPage
        ).pipe(
          takeUntil(this.destroy$),
          map((response: any) => {
            if (requestVersion !== this.listRequestVersion) {
              return [] as ListingProductItem[];
            }
            return this.parseListingResponse(response, nextPage, perPage).items;
          }),
          catchError((err) => {
            console.error(`Listing products load failed for page ${nextPage}:`, err);
            return of([] as ListingProductItem[]);
          })
        ),
        3
      ),
      reduce((allItems, pageItems) => {
        if (pageItems?.length) {
          allItems.push(...pageItems);
        }
        return allItems;
      }, [] as ListingProductItem[])
    );
  }

  private buildFilterPayload(): Record<string, string> {
    const filterData: Record<string, string> = {};

    this.categories.forEach((category) => {
      const selectedSet = this.selectedCategoryValues[this.categoryKey(category)];
      if (!selectedSet || selectedSet.size === 0) {
        return;
      }

      const selectedNames = this.getSelectedCategoryNames(category, selectedSet);
      if (!selectedNames.length) {
        return;
      }

      const key = this.normalizeFilterKey(category.name);
      const value = selectedNames.join(',');
      filterData[key === 'supplier' ? 'pricetablesupplier' : key] = value;
    });

    return filterData;
  }

  private getSelectedCategoryNames(category: ListingCategory, selectedSet: Set<string>): string[] {
    const selectedNames: string[] = [];
    category.values.forEach((value) => {
      if (selectedSet.has(this.getNormalizedCategoryValue(value))) {
        selectedNames.push(String(value.name));
      }
    });

    if (!selectedNames.length) {
      selectedSet.forEach((value) => selectedNames.push(value));
    }

    return Array.from(new Set(selectedNames));
  }

  private getFabricColorPreviewLimit(): number {
    if (this.isMobileViewport) {
      return this.fabricColorPreviewLimitMobile;
    }
    if (this.gridColumns === 1) {
      return this.fabricColorPreviewLimitDesktopList;
    }
    return this.fabricColorPreviewLimitDesktopGrid;
  }

  private normalizeFilterKey(name: string): string {
    return String(name || '').trim().toLowerCase().replace(/\s+/g, '');
  }

  private parseListingResponse(
    response: any,
    fallbackPage: number,
    fallbackPerPage: number
  ): {
    items: ListingProductItem[];
    total: number;
    totalPages: number;
    currentPage: number;
    perPage: number;
  } {
    const nestedResult = response?.result && !Array.isArray(response.result) ? response.result : null;
    let items: ListingProductItem[] = [];

    if (Array.isArray(response?.result)) {
      items = response.result as ListingProductItem[];
    } else if (Array.isArray(nestedResult?.Ecomfabiclist)) {
      items = nestedResult.Ecomfabiclist as ListingProductItem[];
    } else if (Array.isArray(response?.Ecomfabiclist)) {
      items = response.Ecomfabiclist as ListingProductItem[];
    }

    const perPage = this.toPositiveInt(
      response?.per_page ?? nestedResult?.per_page ?? fallbackPerPage,
      fallbackPerPage
    );
    const total = this.toPositiveInt(response?.total ?? nestedResult?.total ?? items.length, items.length);

    let totalPages = this.toPositiveInt(response?.total_pages ?? nestedResult?.total_pages, 0);
    if (totalPages <= 0) {
      totalPages = perPage > 0 ? Math.ceil(total / perPage) : 0;
    }

    const currentPage = this.toPositiveInt(
      response?.current_page ?? nestedResult?.current_page ?? fallbackPage,
      fallbackPage
    );

    const hydratedItems = items
      .filter((item) => item && typeof item === 'object')
      .map((item, index) => this.hydrateListingProduct(item as ListingProductItem, index));

    return {
      items: hydratedItems,
      total,
      totalPages,
      currentPage,
      perPage
    };
  }

  private mergePageSizeOption(size: number): void {
    const next = this.toPositiveInt(size, 0);
    if (!next || this.pageSizeOptions.includes(next)) {
      return;
    }
    this.pageSizeOptions = [...this.pageSizeOptions, next].sort((a, b) => a - b);
  }

  private updateFabricGroupsPagination(): void {
    const safePageSize = Math.max(this.toPositiveInt(this.pageSize, 0), 1);
    this.pageSize = safePageSize;
    this.mergePageSizeOption(safePageSize);

    const totalGroups = this.fabricGroups.length;
    this.totalProducts = totalGroups;

    if (!totalGroups) {
      this.totalPages = 0;
      this.pageIndex = 0;
      this.paginatedFabricGroups = [];
      this.fabricColorPopupGroupKey = null;
      return;
    }

    const totalPages = Math.max(Math.ceil(totalGroups / safePageSize), 1);
    this.totalPages = totalPages;

    if (this.pageIndex < 0) {
      this.pageIndex = 0;
    } else if (this.pageIndex >= totalPages) {
      this.pageIndex = totalPages - 1;
    }

    const start = this.pageIndex * safePageSize;
    this.paginatedFabricGroups = this.fabricGroups.slice(start, start + safePageSize);

    if (
      this.fabricColorPopupGroupKey &&
      !this.paginatedFabricGroups.some((group) => group.key === this.fabricColorPopupGroupKey)
    ) {
      this.fabricColorPopupGroupKey = null;
    }
  }

  private toPositiveInt(value: any, fallback: number): number {
    const parsed = this.toNumber(value);
    if (!parsed || parsed < 0) {
      return fallback;
    }
    return Math.floor(parsed);
  }

  setGrid(columns: number | string): void {
    if (this.isMobileViewport) {
      if (this.gridColumns !== 1) {
        this.gridColumns = 1;
        if (this.isFabricViewMode && this.paginatedProducts.length) {
          this.rebuildFabricGroups(this.paginatedProducts);
        }
        this.cd.markForCheck();
      }
      return;
    }

    const normalizedColumns = Number(columns);
    if (![1, 2, 3, 4].includes(normalizedColumns)) {
      return;
    }
    if (this.gridColumns === normalizedColumns) {
      return;
    }
    this.gridColumns = normalizedColumns;
    this.forceListByMobileViewport = false;
    this.lastDesktopGridColumns = normalizedColumns;
    if (this.isFabricViewMode && this.paginatedProducts.length) {
      this.rebuildFabricGroups(this.paginatedProducts);
    }
    this.syncListingStateToQueryParams();
    this.cd.markForCheck();
  }

  setCatalogViewMode(mode: 'products' | 'fabrics'): void {
    if (!this.canUseFabricView) {
      this.catalogViewMode = 'products';
      this.fabricColorPopupGroupKey = null;
      return;
    }
    if (this.catalogViewMode === mode) {
      return;
    }
    this.catalogViewMode = mode;
    if (mode !== 'fabrics') {
      this.fabricColorPopupGroupKey = null;
    }
    this.syncListingStateToQueryParams({ resetPage: true });
    this.fetchListingProducts(true);
  }

  readonly paginationEllipsis = '...';

  get paginationTokens(): Array<number | string> {
    const total = Math.max(this.toPositiveInt(this.totalPages, 0), 0);
    if (total <= 0) {
      return [];
    }

    const current = Math.min(Math.max(this.pageIndex + 1, 1), total);
    const visibleCount = 5;
    if (total <= visibleCount) {
      return Array.from({ length: total }, (_, index) => index + 1);
    }

    const half = Math.floor(visibleCount / 2);
    let start = Math.max(current - half, 1);
    let end = start + visibleCount - 1;
    if (end > total) {
      end = total;
      start = Math.max(end - visibleCount + 1, 1);
    }

    const tokens: Array<number | string> = [];
    if (start > 1) {
      tokens.push(this.paginationEllipsis);
    }
    for (let page = start; page <= end; page += 1) {
      tokens.push(page);
    }
    if (end < total) {
      tokens.push(this.paginationEllipsis);
    }
    return tokens;
  }

  get canGoToNextPage(): boolean {
    return this.pageIndex < Math.max(this.totalPages - 1, 0);
  }

  get canGoToPreviousPage(): boolean {
    return this.pageIndex > 0;
  }

  isPageTokenActive(token: number | string): boolean {
    return typeof token === 'number' && token === this.pageIndex + 1;
  }

  onPaginationTokenClick(token: number | string): void {
    if (typeof token !== 'number') {
      return;
    }
    this.goToPage(token);
  }

  goToNextPage(): void {
    this.goToPage(this.pageIndex + 2);
  }

  goToPreviousPage(): void {
    this.goToPage(this.pageIndex);
  }

  readonly trackPaginationToken = (index: number, token: number | string): string => `${token}_${index}`;
  readonly trackSortOption = (index: number, option: { value: SortKey; label: string }): string => option.value;

  private goToPage(pageNumber: number): void {
    const nextPage = this.toPositiveInt(pageNumber, 1);
    const clampedPage = Math.min(Math.max(nextPage, 1), Math.max(this.totalPages, 1));
    if (clampedPage === this.pageIndex + 1) {
      return;
    }

    this.pageIndex = clampedPage - 1;
    this.syncListingStateToQueryParams();
    if (this.isFabricViewMode) {
      this.updateFabricGroupsPagination();
      this.prepareListingCardCompositions();
      this.cd.markForCheck();
      return;
    }
    this.fetchListingProducts(false);
  }

  private getListingScrollStorageKey(): string {
    const currentUrl = this.resolveCurrentListingUrlForStorage();
    return `${this.listingScrollStoragePrefix}${currentUrl}`;
  }

  private resolveCurrentListingUrlForStorage(): string {
    if (typeof window !== 'undefined') {
      const path = `${window.location.pathname || ''}${window.location.search || ''}`;
      if (path) {
        return path.split('#')[0];
      }
    }
    return this.router.url?.split('#')?.[0] || '';
  }

  private saveListingScrollPosition(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const payload = {
        x: Math.max(window.scrollX || 0, 0),
        y: Math.max(window.scrollY || 0, 0)
      };
      const key = this.getListingScrollStorageKey();
      sessionStorage.setItem(key, JSON.stringify(payload));
      sessionStorage.setItem(this.listingScrollPendingStorageKey, key);
    } catch {
      // ignore storage errors
    }
  }

  private restoreListingScrollPositionIfNeeded(): void {
    if (typeof window === 'undefined') {
      return;
    }
    this.clearListingScrollRestoreHandles();
    const hasPendingRestore = this.hasPendingScrollRestore();
    if (!this.shouldRestoreListingScroll && !hasPendingRestore) {
      return;
    }
    this.shouldRestoreListingScroll = false;

    let savedPosition: { x: number; y: number } | null = null;
    try {
      const raw = sessionStorage.getItem(this.getListingScrollStorageKey());
      if (raw) {
        const parsed = JSON.parse(raw);
        const x = Number(parsed?.x);
        const y = Number(parsed?.y);
        savedPosition = {
          x: Number.isFinite(x) ? Math.max(x, 0) : 0,
          y: Number.isFinite(y) ? Math.max(y, 0) : 0
        };
      }
    } catch {
      savedPosition = null;
    }

    if (!savedPosition) {
      this.clearPendingScrollRestore();
      this.clearListingScrollRestoreHandles();
      return;
    }

    let attempts = 0;
    const maxAttempts = 14;
    const restoreStep = () => {
      window.scrollTo({
        left: savedPosition!.x,
        top: savedPosition!.y,
        behavior: 'auto'
      });

      attempts += 1;
      const reached = Math.abs((window.scrollY || 0) - savedPosition!.y) <= 2;
      if (reached || attempts >= maxAttempts) {
        this.clearPendingScrollRestore();
        this.clearListingScrollRestoreHandles();
        return;
      }

      this.listingScrollRestoreTimerId = setTimeout(restoreStep, 80);
    };

    this.listingScrollRestoreRafId = requestAnimationFrame(() => restoreStep());
  }

  private hasPendingScrollRestore(): boolean {
    try {
      return sessionStorage.getItem(this.listingScrollPendingStorageKey) === this.getListingScrollStorageKey();
    } catch {
      return false;
    }
  }

  private clearPendingScrollRestore(): void {
    try {
      sessionStorage.removeItem(this.listingScrollPendingStorageKey);
    } catch {
      // ignore storage errors
    }
  }

  private clearListingScrollRestoreHandles(): void {
    if (this.listingScrollRestoreTimerId !== null) {
      clearTimeout(this.listingScrollRestoreTimerId);
      this.listingScrollRestoreTimerId = null;
    }
    if (this.listingScrollRestoreRafId !== null) {
      cancelAnimationFrame(this.listingScrollRestoreRafId);
      this.listingScrollRestoreRafId = null;
    }
  }

  openOrderForm(product: ListingProductItem): void {
    if (!this.productId) {
      return;
    }

    if (this.productDataPayload) {
      this.productPreloadService.set(this.productId, this.productDataPayload);
    }

    const productSlug = this.productSlug || this.slugify(this.productTitle);
    const selectionLabel = this.buildSelectionLabel(product);
    const selectionSlug = this.slugify(selectionLabel || 'single_view');

    const fabricId = this.toNumber(product.fd_id || product.fabricid);
    const colorId = this.toNumber(product.cd_id || product.colorid);
    const pricingGroup = this.toNumber(product.groupid || product.pricegroupid);
    const supplier = this.toNumber(product.supplierid || product.supplier_id);
    const cartProductId = this.getEffectiveCartProductId();

    this.saveListingScrollPosition();
    this.router.navigate(
      [
        '/',
        this.productId,
        productSlug,
        selectionSlug,
        fabricId,
        colorId,
        pricingGroup,
        supplier
      ],
      {
        state: {
          listingReturnUrl: this.router.url
        }
      }
    );
  }

  onCustomizeClick(product: ListingProductItem, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.openOrderForm(product);
  }

  canShowFreeSample(product: ListingProductItem): boolean {
    if (!this.ecomFreeSample) {
      return false;
    }
    const colorId = this.toNumber(product.cd_id || product.colorid);
    return colorId > 0;
  }

  private buildListingFreeSampleData(product: ListingProductItem): Record<string, any> {
    const request = this.buildFreeSampleCartRequest(product);
    return {
      status: 1,
      cart_productid: request.cartProductId,
      product_id: request.productId,
      type: 'free_sample',
      free_sample_price: this.ecomSamplePrice,
      form_data: request.formData,
      cartproductName: request.cartProductName,
      vatpercentage: 0,
      vatname: '',
      api_url: request.siteUrl,
      current_url: window.location.href,
      productname: request.productName,
      catagory_id: request.categoryId,
      color_id: request.colorId,
      fabric_id: request.fabricId,
      pei_ecomImage: request.visualizerImage,
      currencySymbol: this.currencySymbol
    };
  }

  private buildFreeSampleCartRequest(product: ListingProductItem): {
    formData: Record<string, any>[];
    cartProductId: string;
    productId: number;
    siteUrl: string;
    cartProductName: string;
    productName: string;
    categoryId: number;
    visualizerImage: string;
    colorId: number;
    fabricId: number;
  } {
    const colorId = this.toNumber(product.cd_id || product.colorid);
    const fabricId = this.toNumber(product.fd_id || product.fabricid);
    const pricingGroupId = this.toNumber(product.groupid || product.pricegroupid);
    const supplierId = this.toNumber(product.supplierid || product.supplier_id);
    const productDisplayName = this.getProductDisplayName(product);
    const categoryId = this.fieldscategoryid || this.resolveFieldsCategoryId(this.productCategory);
    const siteUrl = this.params?.site || environment.site;
    const cartProductId = this.getEffectiveCartProductId();
    const resolvedProductId = this.productId || this.toNumber(this.params?.product_id);
    const productName = String(product.productname || this.productTitle || '').trim() || this.productTitle;

    const formData = this.buildFreeSampleFormData(product, {
      colorId,
      fabricId,
      pricingGroupId,
      supplierId
    });

    return {
      formData,
      cartProductId,
      productId: resolvedProductId,
      siteUrl,
      cartProductName: productDisplayName ? `${this.productTitle} - ${productDisplayName}` : this.productTitle,
      productName,
      categoryId,
      visualizerImage: this.getProductImage(product),
      colorId,
      fabricId
    };
  }

  private buildFreeSampleFormData(
    product: ListingProductItem,
    ids: {
      colorId: number;
      fabricId: number;
      pricingGroupId: number;
      supplierId: number;
    }
  ): Record<string, any>[] {
    const categoryId = this.toNumber(product.category || this.productCategory);
    const pricingType = String(product.prices || '').trim();
    const supplierName = String(
      product.pricetablesupplier || product.suppliername || product.supplier_name || ''
    ).trim();

    const data: Record<string, any>[] = [
      this.buildFreeSampleOrderItem(11, 'Width', '0'),
      this.buildFreeSampleOrderItem(12, 'Drop', '0'),
      this.buildFreeSampleOrderItem(13, 'Pricing Group', pricingType || '', ids.pricingGroupId || null, ids.pricingGroupId || null),
      this.buildFreeSampleOrderItem(14, 'Quantity', 1, 1, 1, 1)
    ];

    if (ids.supplierId > 0 || supplierName) {
      data.push(
        this.buildFreeSampleOrderItem(
          17,
          'Supplier',
          supplierName || String(ids.supplierId),
          ids.supplierId || null,
          ids.supplierId || null
        )
      );
    }

    const fabricName = String(product.fabricname || product.fabric_name || '').trim();
    const colorName = String(product.colorname || product.color_name || '').trim();
    if (ids.fabricId > 0 && categoryId === 3) {
      data.push(this.buildFreeSampleOrderItem(5, 'Fabric', fabricName, ids.fabricId || null, ids.fabricId || null));
      data.push(this.buildFreeSampleOrderItem(5, 'Color', colorName, ids.colorId || null, ids.colorId || null));
    } else {
      data.push(this.buildFreeSampleOrderItem(20, 'Color', colorName, ids.colorId || null, ids.colorId || null));
    }

    return data;
  }

  private buildFreeSampleOrderItem(
    fieldType: number,
    fieldName: string,
    value: string | number,
    optionId: number | null = null,
    valueId: string | number | null = null,
    optionQuantity: number | null = null
  ): Record<string, any> {
    return {
      id: fieldType,
      labelname: fieldName,
      value,
      valueid: valueId,
      type: fieldType,
      optionid: optionId,
      optionvalue: [],
      optionquantity: optionQuantity,
      issubfabric: 0,
      labelnamecode: this.slugify(fieldName),
      fabricorcolor: fieldType === 5 || fieldType === 20 ? 1 : 0,
      widthfraction: null,
      widthfractiontext: null,
      dropfraction: null,
      dropfractiontext: null,
      showfieldonjob: 1,
      subchild: [],
      showFieldOnCustomerPortal: 1,
      globaledit: false,
      numberfraction: null,
      numberfractiontext: null,
      fieldlevel: 0,
      mandatory: 0,
      fieldInformation: null,
      ruleoverride: null,
      optiondefault: optionId,
      optionsvalue: [],
      editruleoverride: 0,
      fieldtypeid: fieldType,
      fieldid: fieldType,
      fieldname: fieldName
    };
  }

  private hydrateListingProduct(product: ListingProductItem | null | undefined, fallbackIndex: number): ListingProductItem {
    if (!product || typeof product !== 'object') {
      return {} as ListingProductItem;
    }

    const colorName = this.resolveRawFabricColorName(product);
    const fabricName = String(product?.fabricname || product?.fabric_name || '').trim();
    const swatchName = colorName || fabricName || this.productTitle || 'Swatch';
    const displayName = fabricName && colorName
      ? `${fabricName} ${colorName}`
      : colorName || fabricName || this.productTitle;
    const descriptionRaw = String(product?.['ecomdescription'] || '').trim();
    const description = descriptionRaw
      ? (descriptionRaw.length > 95 ? `${descriptionRaw.slice(0, 95)}...` : descriptionRaw)
      : 'Stylish and versatile design for any space.';
    const originalPrice = this.toNumber(product?.minprice ?? product?.minimum_price ?? product?.price);
    const offerPercentRaw = this.toNumber(
      product?.extraoffer ?? product?.extra_offer ?? product?.['extra offer']
    );
    const offerPercent = Math.max(0, Math.min(100, offerPercentRaw));
    const discountedPrice = originalPrice > 0 && offerPercent > 0
      ? this.roundCurrency(originalPrice * (1 - (offerPercent / 100)))
      : originalPrice;
    const savingsAmount = originalPrice > discountedPrice
      ? this.roundCurrency(originalPrice - discountedPrice)
      : 0;

    product.__listing = {
      imageUrl: this.resolveProductImageUrl(product),
      displayName,
      swatchName,
      colorName: colorName || swatchName,
      description,
      categoryLabel: String(product?.['productname'] || this.productTitle || '').toUpperCase(),
      price: discountedPrice,
      originalPrice,
      offerPercent,
      savingsAmount
    };
    product.__trackKey = this.buildProductTrackKey(product, fallbackIndex);
    product.__variantKey = this.computeFabricVariantKey(product);
    product.__freeSampleData = this.buildListingFreeSampleData(product);

    return product;
  }

  private resolveRawFabricColorName(product: ListingProductItem): string {
    return String(
      product?.colorname || product?.color_name || product?.['color'] || product?.['colour'] || ''
    ).trim();
  }

  private resolveProductImageUrl(product: ListingProductItem): string {
    const colorImage = product?.colorimage || product?.color_image || '';
    if (!colorImage) {
      return 'assets/no-image.jpg';
    }
    if (this.isAbsoluteUrl(colorImage)) {
      return colorImage;
    }
    if (String(colorImage).includes('/')) {
      return this.resolveStorageImageUrl(String(colorImage));
    }
    return `${this.imgpath}${encodeURIComponent(String(colorImage).trim())}`;
  }

  getProductDisplayName(product: ListingProductItem): string {
    if (!product?.__listing) {
      this.hydrateListingProduct(product, 0);
    }
    return product?.__listing?.displayName || this.productTitle;
  }

  getProductSwatchName(product: ListingProductItem): string {
    if (!product?.__listing) {
      this.hydrateListingProduct(product, 0);
    }
    return product?.__listing?.swatchName || 'Swatch';
  }

  getFabricColorName(product: ListingProductItem): string {
    if (!product?.__listing) {
      this.hydrateListingProduct(product, 0);
    }
    return product?.__listing?.colorName || this.getProductSwatchName(product);
  }

  onFabricColorSelect(group: ListingFabricGroup, variant: ListingProductItem, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const variantKey = this.buildFabricVariantKey(variant);
    this.selectedFabricVariantByGroup[group.key] = variantKey;
    this.fabricGroups = this.fabricGroups.map((item) =>
      item.key === group.key
        ? { ...item, activeVariant: variant }
        : item
    );
    this.updateFabricGroupsPagination();
    this.prepareListingCardCompositionForProduct(variant);
    this.cd.markForCheck();
  }

  openFabricColorPopup(group: ListingFabricGroup, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.fabricColorPopupGroupKey = group.key;
    this.cd.markForCheck();
  }

  closeFabricColorPopup(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (!this.fabricColorPopupGroupKey) {
      return;
    }
    this.fabricColorPopupGroupKey = null;
    this.cd.markForCheck();
  }

  onFabricColorPopupPanelClick(event: Event): void {
    event.stopPropagation();
  }

  onFabricPopupVariantSelect(variant: ListingProductItem, event: Event): void {
    const popupGroup = this.activeFabricColorPopupGroup;
    if (!popupGroup) {
      return;
    }
    this.onFabricColorSelect(popupGroup, variant, event);
    this.closeFabricColorPopup();
  }

  isFabricColorSelected(group: ListingFabricGroup, variant: ListingProductItem): boolean {
    return this.buildFabricVariantKey(group.activeVariant) === this.buildFabricVariantKey(variant);
  }

  get activeFabricColorPopupGroup(): ListingFabricGroup | null {
    const popupKey = this.fabricColorPopupGroupKey;
    if (!popupKey) {
      return null;
    }
    return this.paginatedFabricGroups.find((group) => group.key === popupKey) || null;
  }

  getProductImage(product: ListingProductItem): string {
    if (!product?.__listing) {
      this.hydrateListingProduct(product, 0);
    }
    return product?.__listing?.imageUrl || 'assets/no-image.jpg';
  }

  getListingCardImage(product: ListingProductItem): string {
    const colorUrl = this.getProductImage(product);
    if (!this.showFrameInProductListing) {
      return colorUrl;
    }

    const frameUrl = this.listingFrameImageUrl;

    if (!frameUrl) {
      return colorUrl;
    }

    const key = this.composeListingImageKey(frameUrl, colorUrl);
    const composedImage = this.composedListingImageMap.get(key);
    if (composedImage) {
      return composedImage;
    }

    if (!this.failedListingImageKeys.has(key)) {
      this.queueListingImageComposition(frameUrl, colorUrl);
    }

    return frameUrl;
  }

  private prepareListingCardCompositions(): void {
    if (!this.showFrameInProductListing || !this.listingFrameImageUrl) {
      return;
    }

    const sourceProducts =
      this.isFabricViewMode
        ? this.paginatedFabricGroups.map((group) => group.activeVariant)
        : this.paginatedProducts;

    sourceProducts.forEach((product) => this.prepareListingCardCompositionForProduct(product));
  }

  private prepareListingCardCompositionForProduct(product: ListingProductItem | null | undefined): void {
    if (!this.showFrameInProductListing || !product || !this.listingFrameImageUrl) {
      return;
    }
    const colorUrl = this.getProductImage(product);
    this.queueListingImageComposition(this.listingFrameImageUrl, colorUrl);
  }

  private queueListingImageComposition(frameUrl: string, colorUrl: string): void {
    if (!frameUrl || !colorUrl) {
      return;
    }

    const key = this.composeListingImageKey(frameUrl, colorUrl);
    if (
      this.composedListingImageMap.has(key) ||
      this.composingListingImageKeys.has(key) ||
      this.failedListingImageKeys.has(key)
    ) {
      return;
    }

    this.composingListingImageKeys.add(key);
    this.listingCompositionQueue.push({ key, frameUrl, colorUrl });
    this.drainListingCompositionQueue();
  }

  private drainListingCompositionQueue(): void {
    if (!this.listingCompositionQueue.length) {
      return;
    }

    while (
      this.activeListingCompositions < this.maxParallelListingCompositions &&
      this.listingCompositionQueue.length
    ) {
      const next = this.listingCompositionQueue.shift();
      if (!next) {
        return;
      }

      this.activeListingCompositions += 1;
      this.composeListingFrameAndColor(next.frameUrl, next.colorUrl)
        .then((composedUrl) => {
          if (composedUrl) {
            this.setComposedListingImage(next.key, composedUrl);
          } else {
            this.failedListingImageKeys.add(next.key);
          }
        })
        .catch(() => {
          // Keep original frame fallback when composition fails.
          this.failedListingImageKeys.add(next.key);
        })
        .finally(() => {
          this.activeListingCompositions = Math.max(this.activeListingCompositions - 1, 0);
          this.composingListingImageKeys.delete(next.key);
          this.drainListingCompositionQueue();
          this.cd.markForCheck();
        });
    }
  }

  private async composeListingFrameAndColor(frameUrl: string, colorUrl: string): Promise<string | null> {
    try {
      const [frameImage, colorImage] = await Promise.all([
        this.loadImageForComposition(frameUrl),
        this.loadImageForComposition(colorUrl)
      ]);

      const holeRegion = this.getFrameTransparentRegion(frameUrl, frameImage);
      if (!holeRegion.found) {
        return null;
      }

      const frameWidth = frameImage.naturalWidth || frameImage.width;
      const frameHeight = frameImage.naturalHeight || frameImage.height;
      const colorWidth = colorImage.naturalWidth || colorImage.width;
      const colorHeight = colorImage.naturalHeight || colorImage.height;
      if (!frameWidth || !frameHeight || !colorWidth || !colorHeight) {
        return null;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return null;
      }

      canvas.width = frameWidth;
      canvas.height = frameHeight;

      const holeWidth = Math.max(holeRegion.maxX - holeRegion.minX, 1);
      const holeHeight = Math.max(holeRegion.maxY - holeRegion.minY, 1);
      const scale = Math.max(holeWidth / colorWidth, holeHeight / colorHeight);
      const drawWidth = colorWidth * scale;
      const drawHeight = colorHeight * scale;
      const dx = holeRegion.minX + (holeWidth - drawWidth) / 2;
      const dy = holeRegion.minY + (holeHeight - drawHeight) / 2;

      ctx.drawImage(colorImage, 0, 0, colorWidth, colorHeight, dx, dy, drawWidth, drawHeight);
      ctx.drawImage(frameImage, 0, 0, frameWidth, frameHeight);

      return canvas.toDataURL('image/png');
    } catch {
      return null;
    }
  }

  private getFrameTransparentRegion(frameUrl: string, frameImage: HTMLImageElement): TransparentHoleRegion {
    const cachedRegion = this.frameTransparentRegionCache.get(frameUrl);
    if (cachedRegion) {
      return cachedRegion;
    }

    const detectedRegion = this.detectTransparentHoleRegion(frameImage, this.frameAlphaThreshold);
    this.frameTransparentRegionCache.set(frameUrl, detectedRegion);
    this.trimMapToSize(this.frameTransparentRegionCache, this.frameTransparentRegionCacheLimit);
    return detectedRegion;
  }

  private detectTransparentHoleRegion(image: HTMLImageElement, alphaThreshold = 10): TransparentHoleRegion {
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (!width || !height) {
      return {
        minX: 0,
        minY: 0,
        maxX: 0,
        maxY: 0,
        width: 0,
        height: 0,
        found: false
      };
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return {
        minX: 0,
        minY: 0,
        maxX: width,
        maxY: height,
        width,
        height,
        found: false
      };
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(image, 0, 0, width, height);

    let pixelData: Uint8ClampedArray;
    try {
      pixelData = ctx.getImageData(0, 0, width, height).data;
    } catch {
      return {
        minX: 0,
        minY: 0,
        maxX: width,
        maxY: height,
        width,
        height,
        found: false
      };
    }

    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let found = false;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = pixelData[(y * width + x) * 4 + 3];
        if (alpha < alphaThreshold) {
          found = true;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (!found) {
      return {
        minX: 0,
        minY: 0,
        maxX: width,
        maxY: height,
        width,
        height,
        found: false
      };
    }

    return {
      minX,
      minY,
      maxX,
      maxY,
      width,
      height,
      found: true
    };
  }

  private loadImageForComposition(url: string): Promise<HTMLImageElement> {
    const existingPromise = this.imageLoadPromiseCache.get(url);
    if (existingPromise) {
      return existingPromise;
    }

    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.decoding = 'async';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      image.src = url;
    }).catch((error) => {
      this.imageLoadPromiseCache.delete(url);
      throw error;
    });

    this.imageLoadPromiseCache.set(url, promise);
    this.trimMapToSize(this.imageLoadPromiseCache, this.imageLoadPromiseCacheLimit);
    return promise;
  }

  private composeListingImageKey(frameUrl: string, colorUrl: string): string {
    return `${frameUrl}::${colorUrl}`;
  }

  private setComposedListingImage(key: string, dataUrl: string): void {
    if (this.composedListingImageMap.has(key)) {
      this.composedListingImageMap.delete(key);
    }
    this.composedListingImageMap.set(key, dataUrl);

    this.trimMapToSize(this.composedListingImageMap, this.composedImageCacheLimit);
  }

  private trimMapToSize<K, V>(map: Map<K, V>, limit: number): void {
    while (map.size > limit) {
      const oldestKey = map.keys().next().value as K | undefined;
      if (oldestKey === undefined) {
        break;
      }
      map.delete(oldestKey);
    }
  }

  private resetListingImageCompositionCaches(): void {
    this.composedListingImageMap.clear();
    this.composingListingImageKeys.clear();
    this.failedListingImageKeys.clear();
    this.imageLoadPromiseCache.clear();
    this.frameTransparentRegionCache.clear();
    this.listingCompositionQueue = [];
    this.activeListingCompositions = 0;
  }

  getCategoryValueImage(value: ListingCategoryValue): string {
    if (!value) {
      return '';
    }
    if (value.resolvedImg !== undefined) {
      return value.resolvedImg;
    }
    const resolved = this.resolveCategoryValueImage(value.img || '');
    value.resolvedImg = resolved;
    return resolved;
  }

  private resolveCategoryValueImage(img: any): string {
    const rawValue = String(img || '').trim();
    if (!rawValue) {
      return '';
    }
    if (this.isAbsoluteUrl(rawValue)) {
      return rawValue;
    }
    return this.resolveStorageImageUrl(rawValue);
  }

  private getNormalizedCategoryValue(value: ListingCategoryValue): string {
    if (!value) {
      return '';
    }
    if (value.normalizedName !== undefined) {
      return value.normalizedName;
    }
    const normalized = this.normalize(value.name);
    value.normalizedName = normalized;
    return normalized;
  }

  private ensureListingComputed(product: ListingProductItem | null | undefined): ListingProductComputed | null {
    if (!product || typeof product !== 'object') {
      return null;
    }
    if (!product.__listing) {
      this.hydrateListingProduct(product, 0);
    }
    return product.__listing || null;
  }

  getPrice(product: ListingProductItem): number {
    const listing = this.ensureListingComputed(product);
    if (Number.isFinite(listing?.price)) {
      return Number(listing?.price);
    }
    return this.toNumber(product?.minprice ?? product?.minimum_price ?? product?.price);
  }

  getOriginalPrice(product: ListingProductItem): number {
    const listing = this.ensureListingComputed(product);
    if (Number.isFinite(listing?.originalPrice)) {
      return Number(listing?.originalPrice);
    }
    return this.toNumber(product?.minprice ?? product?.minimum_price ?? product?.price);
  }

  getOfferPercent(product: ListingProductItem): number {
    const listing = this.ensureListingComputed(product);
    if (Number.isFinite(listing?.offerPercent)) {
      return Number(listing?.offerPercent);
    }
    return 0;
  }

  hasExtraOffer(product: ListingProductItem): boolean {
    return this.getOfferPercent(product) > 0 && this.getOriginalPrice(product) > 0;
  }

  getOfferBadgeLabel(product: ListingProductItem): string {
    const offerPercent = this.getOfferPercent(product);
    if (offerPercent <= 0) {
      return '';
    }
    const normalizedOffer = Number.isInteger(offerPercent)
      ? `${Math.trunc(offerPercent)}`
      : `${this.roundCurrency(offerPercent)}`;
    return `-${normalizedOffer}% OFF`;
  }

  getSavingsAmount(product: ListingProductItem): number {
    const listing = this.ensureListingComputed(product);
    if (Number.isFinite(listing?.savingsAmount)) {
      return Number(listing?.savingsAmount);
    }
    return 0;
  }

  get productDescriptionPreview(): string {
    if (!this.productDescription) {
      return '';
    }
    return this.productDescription.length > 300
      ? `${this.productDescription.slice(0, 300)}...`
      : this.productDescription;
  }

  get hasSidebar(): boolean {
    return this.hasSidebarFilters;
  }

  get activeResultCount(): number {
    if (this.isFabricViewMode) {
      return this.fabricGroups.length;
    }
    return this.totalProducts;
  }

  get homeUrl(): string {
    return this.params?.site || '/';
  }

  get visibleResultCount(): number {
    if (this.isFabricViewMode) {
      return this.paginatedFabricGroups.length;
    }
    return this.paginatedProducts.length;
  }

  isColorCategory(category: ListingCategory): boolean {
    const name = this.normalize(category?.name || '');
    return name === 'color' || name === 'colour' || name.includes('color') || name.includes('colour');
  }

  toggleColorFilter(category: ListingCategory, value: ListingCategoryValue): void {
    const selected = this.isSelected(category, value);
    this.onFilterToggle(category, value, !selected);
  }

  removeActiveFilter(categoryKey: string, normalizedValue: string): void {
    const selectedSet = this.selectedCategoryValues[categoryKey];
    if (!selectedSet || !selectedSet.has(normalizedValue)) {
      return;
    }
    selectedSet.delete(normalizedValue);
    this.syncListingStateToQueryParams({ resetPage: true });
    this.scheduleListingFetch(true, 80);
  }

  get activeFilterChips(): ListingActiveFilterChip[] {
    const chips: ListingActiveFilterChip[] = [];
    this.categories.forEach((category) => {
      const categoryKey = this.categoryKey(category);
      const selectedSet = this.selectedCategoryValues[categoryKey];
      if (!selectedSet || selectedSet.size === 0) {
        return;
      }

      selectedSet.forEach((normalizedValue) => {
        const matchedValue = category.values.find(
          (value) => this.getNormalizedCategoryValue(value) === normalizedValue
        );
        const valueName = String(matchedValue?.name || normalizedValue);
        chips.push({
          key: `${categoryKey}::${normalizedValue}`,
          categoryKey,
          categoryName: String(category.name || ''),
          normalizedValue,
          valueName,
          label: `${category.name}: ${valueName}`
        });
      });
    });
    return chips;
  }

  getProductCategoryLabel(product: ListingProductItem): string {
    return product?.__listing?.categoryLabel || this.hydrateListingProduct(product, 0).__listing?.categoryLabel || '';
  }

  getProductDescription(product: ListingProductItem): string {
    return product?.__listing?.description || this.hydrateListingProduct(product, 0).__listing?.description || '';
  }

  readonly trackCategory = (index: number, category: ListingCategory): string =>
    this.categoryKey(category);

  readonly trackCategoryValue = (index: number, value: ListingCategoryValue): string => {
    const idPart = value?.id ?? index;
    const categoryPart = value?.categoryid ?? '';
    return `${categoryPart}::${idPart}::${this.getNormalizedCategoryValue(value)}`;
  };

  readonly trackActiveFilterChip = (index: number, chip: ListingActiveFilterChip): string => chip.key;

  readonly trackProduct = (index: number, product: ListingProductItem): string =>
    product?.__trackKey || this.buildProductTrackKey(product, index);

  trackFabricGroup(index: number, group: ListingFabricGroup): string {
    return group.key;
  }

  readonly trackFabricVariant = (index: number, variant: ListingProductItem): string =>
    this.buildFabricVariantKey(variant);

  private categoryKey(category: ListingCategory): string {
    return `${category.id}::${this.normalize(category.name)}`;
  }

  private buildSelectionLabel(product: ListingProductItem): string {
    const fabricName = String(product?.fabricname || product?.fabric_name || '').trim();
    const colorName = String(product?.colorname || product?.color_name || '').trim();
    if (fabricName && colorName) {
      return `${fabricName}-${colorName}`;
    }
    return colorName || fabricName || 'single_view';
  }

  private rebuildFabricGroups(products: ListingProductItem[]): void {
    if (!products?.length) {
      this.fabricGroups = [];
      this.paginatedFabricGroups = [];
      this.selectedFabricVariantByGroup = {};
      this.fabricColorPopupGroupKey = null;
      return;
    }

    const grouped = new Map<string, { fabricName: string; variants: ListingProductItem[] }>();
    products.forEach((product) => {
      const groupKey = this.buildFabricGroupKey(product);
      const fabricName = this.getFabricGroupName(product);
      const existing = grouped.get(groupKey);
      if (existing) {
        if (!existing.fabricName && fabricName) {
          existing.fabricName = fabricName;
        }
        existing.variants.push(product);
      } else {
        grouped.set(groupKey, { fabricName, variants: [product] });
      }
    });

    const nextSelected: Record<string, string> = {};
    const previewLimit = this.getFabricColorPreviewLimit();
    const groups = Array.from(grouped.entries()).map(([key, value]) => {
      const variants = [...value.variants].sort((a, b) =>
        this.getFabricColorName(a).localeCompare(this.getFabricColorName(b))
      );
      const previousKey = this.selectedFabricVariantByGroup[key];
      const activeVariant =
        variants.find((variant) => this.buildFabricVariantKey(variant) === previousKey) || variants[0];
      nextSelected[key] = this.buildFabricVariantKey(activeVariant);
      const resolvedName = String(value.fabricName || '').trim() || this.getFabricGroupName(activeVariant);
      const previewVariants = variants.slice(0, previewLimit);
      const hiddenVariantCount = Math.max(variants.length - previewLimit, 0);
      return {
        key,
        fabricName: resolvedName,
        variants,
        previewVariants,
        hiddenVariantCount,
        hasMoreVariants: hiddenVariantCount > 0,
        activeVariant
      } as ListingFabricGroup;
    });

    groups.sort((a, b) => a.fabricName.localeCompare(b.fabricName));
    this.selectedFabricVariantByGroup = nextSelected;
    this.fabricGroups = groups;
    if (this.isFabricViewMode) {
      this.updateFabricGroupsPagination();
      return;
    }

    // Keep product-mode pagination untouched when only grid/list UI changes.
    this.paginatedFabricGroups = [];
    this.fabricColorPopupGroupKey = null;
  }

  private buildFabricGroupKey(product: ListingProductItem): string {
    const fabricCode = String(product?.['fabriccode'] || product?.['fabric_code'] || '').trim();
    const fabricName = String(product?.fabricname || product?.fabric_name || '').trim();
    if (fabricCode || fabricName) {
      const groupedLabel = `${fabricCode || fabricName} ${fabricName || fabricCode}`.trim();
      return `fabric_label_${this.slugify(groupedLabel)}`;
    }

    const fabricId = this.toNumber(product?.fd_id || product?.fabricid);
    if (fabricId > 0) {
      return `fabric_id_${fabricId}`;
    }

    const groupId = this.toNumber(product?.groupid || product?.pricegroupid);
    if (groupId > 0) {
      return `group_${groupId}`;
    }

    const fallback = this.getFabricGroupName(product) || String(product?.productname || this.productTitle || 'fabric');
    return `fabric_fallback_${this.slugify(fallback)}`;
  }

  private getFabricGroupName(product: ListingProductItem): string {
    const fabricName = String(product?.fabricname || product?.fabric_name || '').trim();
    if (fabricName) {
      return fabricName;
    }
    const fabricCode = String(product?.['fabriccode'] || product?.['fabric_code'] || '').trim();
    if (fabricCode) {
      return fabricCode;
    }
    const productName = String(product?.productname || '').trim();
    if (productName) {
      return productName;
    }
    const displayName = this.getProductDisplayName(product);
    if (displayName) {
      return displayName;
    }
    return this.productTitle || 'Fabric';
  }

  private buildFabricVariantKey(product: ListingProductItem): string {
    if (product?.__variantKey) {
      return product.__variantKey;
    }
    const key = this.computeFabricVariantKey(product);
    if (product) {
      product.__variantKey = key;
    }
    return key;
  }

  private computeFabricVariantKey(product: ListingProductItem): string {
    const colorName =
      this.resolveRawFabricColorName(product) ||
      String(product?.fabricname || product?.fabric_name || product?.productname || '').trim();
    return [
      this.toNumber(product?.fd_id || product?.fabricid),
      this.toNumber(product?.cd_id || product?.colorid),
      this.toNumber(product?.groupid || product?.pricegroupid),
      this.toNumber(product?.supplierid || product?.supplier_id),
      this.toNumber(product?.matmapid || product?.['mapid']),
      this.slugify(colorName || String(product?.['colorcode'] || product?.['color_code'] || ''))
    ].join('_');
  }

  private buildProductTrackKey(product: ListingProductItem | null | undefined, fallbackIndex: number): string {
    if (!product) {
      return `product_${fallbackIndex}`;
    }

    const idParts = [
      this.toNumber(product?.pei_productid),
      this.toNumber(product?.fd_id || product?.fabricid),
      this.toNumber(product?.cd_id || product?.colorid),
      this.toNumber(product?.groupid || product?.pricegroupid),
      this.toNumber(product?.supplierid || product?.supplier_id),
      this.toNumber(product?.matmapid || product?.['mapid'])
    ];

    if (idParts.some((part) => part > 0)) {
      return idParts.join('_');
    }

    const fallbackLabel = this.slugify(
      `${product?.productname || ''}-${product?.fabricname || product?.fabric_name || ''}-${product?.colorname || product?.color_name || ''}`
    );
    return fallbackLabel ? `product_${fallbackLabel}` : `product_${fallbackIndex}`;
  }

  private resolveFieldsCategoryId(categoryId: any): number {
    return Number(categoryId) === 3 ? 5 : 20;
  }

  private resolveBannerImage(product: any): string {
    const direct = this.resolveStorageImageUrl(product?.banner_url);
    if (direct) return direct;

    const parsedBanner = this.extractFirstImage(product?.pi_prodbannerimage);
    if (parsedBanner) return this.resolveStorageImageUrl(parsedBanner);

    const parsedBackground = this.extractFirstImage(product?.pi_backgroundimage);
    if (parsedBackground) return this.resolveStorageImageUrl(parsedBackground);

    return '';
  }

  private resolveListingFrameImage(product: any): string {
    const direct = this.resolveStorageImageUrl(product?.frame_url);
    if (direct) {
      return direct;
    }

    const parsedFrame = this.extractFirstImage(product?.pi_frameimage);
    if (parsedFrame) {
      return this.resolveStorageImageUrl(parsedFrame);
    }

    return '';
  }

  private extractFirstImage(raw: any): string {
    if (!raw) {
      return '';
    }

    if (Array.isArray(raw) && raw.length) {
      return String(raw[0] || '');
    }

    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (!trimmed) {
        return '';
      }

      if ((trimmed.startsWith('[') || trimmed.startsWith('{')) && (trimmed.endsWith(']') || trimmed.endsWith('}'))) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed) && parsed.length) {
            return String(parsed[0] || '');
          }
        } catch {
          return trimmed;
        }
      }
      return trimmed;
    }

    return '';
  }

  private resolveStorageImageUrl(path: string): string {
    if (!path) {
      return '';
    }

    const cleaned = String(path).trim().replace(/\\/g, '/');
    if (!cleaned) {
      return '';
    }

    if (this.isAbsoluteUrl(cleaned)) {
      return cleaned;
    }

    if (cleaned.startsWith('/api/public')) {
      return `${environment.apiUrl}${this.encodePathSegments(cleaned)}`;
    }

    if (cleaned.startsWith('api/public')) {
      return `${environment.apiUrl}/${this.encodePathSegments(cleaned)}`;
    }

    if (cleaned.startsWith('/storage/')) {
      return `${environment.apiUrl}/api/public${this.encodePathSegments(cleaned)}`;
    }

    if (cleaned.startsWith('storage/')) {
      return `${environment.apiUrl}/api/public/${this.encodePathSegments(cleaned)}`;
    }

    if (cleaned.includes('/attachments/')) {
      return `${environment.apiUrl}/api/public/storage/${this.encodePathSegments(cleaned.replace(/^\/+/, ''))}`;
    }

    return `${environment.apiUrl}/api/public/${this.encodePathSegments(cleaned.replace(/^\/+/, ''))}`;
  }

  private encodePathSegments(path: string): string {
    return String(path || '')
      .split('/')
      .map((segment) => {
        if (!segment) {
          return segment;
        }
        try {
          return encodeURIComponent(decodeURIComponent(segment));
        } catch {
          return encodeURIComponent(segment);
        }
      })
      .join('/');
  }

  private isAbsoluteUrl(value: string): boolean {
    return /^https?:\/\//i.test(value);
  }

  private normalize(value: string): string {
    return String(value || '').trim().toLowerCase();
  }

  private slugify(value: string): string {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  private toNumber(value: any): number {
    if (value === null || value === undefined) {
      return 0;
    }
    const numeric = Number(String(value).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(numeric) ? numeric : 0;
  }

  private resolveCartProductId(routeParams?: any, queryParams?: any): string {
    const candidates = [
      routeParams?.['cart_productid'],
      queryParams?.['cart_productid'],
      this.route.snapshot.params['cart_productid'],
      this.route.snapshot.queryParams['cart_productid'],
      this.params?.cart_productid,
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

  private getEffectiveCartProductId(): string {
    const routeOrEnvironmentCartId = this.resolveCartProductId();
    if (routeOrEnvironmentCartId) {
      return routeOrEnvironmentCartId;
    }

    if (this.cartProductId > 0) {
      return String(this.cartProductId);
    }

    const fallbackProductId = this.productId || this.toNumber(this.params?.product_id);
    return fallbackProductId > 0 ? String(fallbackProductId) : '';
  }

  private roundCurrency(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private toBoolean(value: any): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    const normalized = String(value ?? '').trim().toLowerCase();
    return ['1', 'true', 'yes', 'on'].includes(normalized);
  }

  private toArray(value: any): any[] {
    if (Array.isArray(value)) {
      return value;
    }
    if (value && typeof value === 'object') {
      return Object.values(value);
    }
    return [];
  }
}
