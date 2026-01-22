import { Component, OnInit, ChangeDetectorRef, Inject, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Subject, forkJoin, of, from, Observable } from 'rxjs';
import { takeUntil, switchMap, catchError, tap, map, finalize, mergeMap, concatMap, toArray } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';

interface ChatMessage {
    sender: 'user' | 'system' | 'ai';
    text: string;
    data?: any;
}

@Component({
    selector: 'app-ai-chat',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './ai-chat.component.html',
    styleUrls: ['./ai-chat.component.css']
})
export class AiChatComponent implements OnInit, OnDestroy, AfterViewInit {
    messages: ChatMessage[] = [];
    userInput = '';
    isLoading = false;
    destroy$ = new Subject<void>();
    @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLDivElement>;

    // Product State
    product_id: number | null = null;
    parameters_data: any[] = [];
    option_data: Record<number, any[]> = {};
    selected_option_data: any[] = []; // Stores formatted options for pricing
    orderForm: FormGroup;
    pricegroup: any = "";
    colorid: any = "";
    fabricid: any = "";
    unittype: number = 1;
    fabricFieldType: number = 0;
    recipeid: number = 0;
    supplier_id: number | null = null;
    supplierOption: any;
    priceGroupOption: any;
    unitOption: any[] = [];
    unittypename: string = '';
    guidedFields: any[] = [];
    guidedIndex = -1;
    modalOpen = false;
    modalSearch = '';
    modalField: any = null;
    modalOptions: any[] = [];
    currentPromptMessageIndex: number | null = null;

    // Pricing
    pricedata: any = null;
    grossPrice: string | null = null;
    currencySymbol: string = '£';
    vatpercentage: any = 0;
    allProducts: any[] = [];
    lastProductDetails: any = null;

    // Helpers
    widthField: any;
    dropField: any;
    qtyField: any;
    unitField: any;
    priceGroupField: any;
    supplierField: any;
    inchfraction_array: any[] = [];
    inchfractionselected = 0;
    showFractions = false;
    rulescount = 0;
    formulacount = 0;
    rulesorderitem: any[] = [];
    min_width: number | null = null;
    max_width: number | null = null;
    min_drop: number | null = null;
    max_drop: number | null = null;
    routeParams: any = {};
    MAX_NESTING_LEVEL = 8;

    // Mappings
    netpricecomesfrom = "";
    costpricecomesfrom = "";

    constructor(
        private apiService: ApiService,
        private fb: FormBuilder,
        private cd: ChangeDetectorRef,
        private route: ActivatedRoute
    ) {
        this.orderForm = this.fb.group({});
    }

    ngOnInit(): void {
        this.addMessage('system', 'Welcome to the AI Pricing Chat. Please enter a Product ID to start (e.g., "load 123") or ask for a product.');

        this.routeParams = {
            api_url: environment.apiUrl,
            api_key: environment.apiKey,
            api_name: environment.apiName,
            site: environment.site
        };
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    ngAfterViewInit(): void {
        this.scrollToBottom(true);
    }

    sendMessage() {
        if (!this.userInput.trim()) return;
        const text = this.userInput.trim();
        this.addMessage('user', text);
        this.userInput = '';
        this.processUserCommand(text);
    }

    sendQuick(text: string) {
        this.userInput = text;
        this.sendMessage();
    }

    addMessage(sender: 'user' | 'system' | 'ai', text: string, data?: any): number {
        this.messages.push({ sender, text, data });
        this.cd.markForCheck();
        this.scrollToBottom();
        return this.messages.length - 1;
    }

    selectSuggestion(value: string) {
        if (this.guidedIndex >= 0) {
            const promptIndex = this.currentPromptMessageIndex;
            this.trySelectOption(value);
            this.disableSuggestionsAt(promptIndex);
            return;
        }
        this.sendQuick(value);
    }

    openOptionModal(field: any, options: any[]) {
        this.modalField = field;
        this.modalOptions = options || [];
        this.modalSearch = '';
        this.modalOpen = true;
    }

    closeOptionModal() {
        this.modalOpen = false;
        this.modalField = null;
        this.modalOptions = [];
        this.modalSearch = '';
    }

    get filteredModalOptions(): any[] {
        const q = this.modalSearch.toLowerCase().trim();
        if (!q) return this.modalOptions;
        return this.modalOptions.filter(o => (o.optionname || '').toLowerCase().includes(q));
    }

    selectModalOption(option: any) {
        if (!option) return;
        const name = option.optionname || '';
        this.closeOptionModal();
        this.selectSuggestion(name);
    }

    private scrollToBottom(initial: boolean = false) {
        const el = this.messagesContainer?.nativeElement;
        if (!el) return;
        setTimeout(() => {
            el.scrollTo({
                top: el.scrollHeight,
                behavior: initial ? 'auto' : 'smooth'
            });
        }, 0);
    }

    private disableSuggestionsAt(index: number | null) {
        if (index === null || index === undefined) return;
        const msg = this.messages[index];
        if (msg?.data?.suggestions?.length) {
            msg.data.disabled = true;
        }
    }

    processUserCommand(text: string) {
        if (this.handleBasicChat(text)) return;

        if (this.guidedIndex >= 0) {
            this.trySelectOption(text);
            return;
        }

        const lower = text.toLowerCase();

        if (lower === 'list products' || lower === 'products' || lower === 'list all products') {
            this.listProducts();
            return;
        }

        if (lower.startsWith('details ') || lower.startsWith('product ')) {
            const val = text.split(' ').slice(1).join(' ').trim();
            if (/^\d+$/.test(val)) {
                this.loadProductDetails(val);
                return;
            }
        }

        if (lower.startsWith('ask ')) {
            const question = text.substring(4).trim();
            this.answerProductQuestion(question);
            return;
        }

        // Load by ID or Name
        if (lower.startsWith('load ')) {
            const val = lower.split(' ').slice(1).join(' '); // Allow multi-word names
            if (val) {
                // If numeric, load by ID directly
                if (/^\d+$/.test(val)) {
                    this.loadProduct(val);
                } else {
                    // Search by name and auto-load if single match
                    this.searchProducts(val, true);
                }
                return;
            }
        }

        if (!this.product_id) {
            // If not loaded, treat anything else as a search
            this.searchProducts(text);
            return;
        }

        if (lower.includes('price')) {
            this.calculatePrice();
            return;
        }

        // Width X Drop parsing
        if (lower.includes('x') && /\d/.test(lower)) {
            const dims = lower.split('x');
            if (dims.length === 2) {
                const w = parseFloat(dims[0]);
                const d = parseFloat(dims[1]);
                if (!isNaN(w) && !isNaN(d)) {
                    if (this.widthField) {
                        const widthControl = this.orderForm.get(`field_${this.widthField.fieldid}`);
                        if (widthControl) widthControl.setValue(w);
                    }
                    if (this.dropField) {
                        const dropControl = this.orderForm.get(`field_${this.dropField.fieldid}`);
                        if (dropControl) dropControl.setValue(d);
                    }
                    this.handleWidthChange(w);
                    this.handleDropChange(d);
                    this.addMessage('system', `Updated dimensions: Width=${w}, Drop=${d}`);
                    return;
                }
            }
        }

        if (lower.startsWith('select ')) {
            const val = text.substring(7); // "select ".length
            this.trySelectOption(val);
            return;
        }

        if (lower.includes('options')) {
            this.listAvailableOptions();
            return;
        }

        if (lower.includes('ask options') || lower.includes('one by one')) {
            this.startGuidedOptions();
            return;
        }

        // Fallback to search if nothing matches
        this.searchProducts(text);
    }

    handleBasicChat(text: string): boolean {
        const lower = text.toLowerCase();
        const greetings = ['hi', 'hello', 'hey', 'greetings', 'sup'];
        const help = ['help', 'what can you do', 'guide me'];
        const identity = ['who are you', 'your name', 'are you ai'];

        if (greetings.some(g => lower.includes(g))) {
            this.addMessage('ai', 'Hello! I am your AI assistant. I can help you find products, configure blinds, and check prices. Try searching for "roller" or "venetian".');
            return true;
        }

        if (help.some(h => lower.includes(h))) {
            this.addMessage('ai', 'I can help you with:\n- List products (e.g. "list products")\n- Product details (e.g. "details 10")\n- Ask about product (e.g. "ask pricegroup")\n- Searching products (e.g. "roller blinds")\n- selecting options (e.g. "select red")\n- Pricing (e.g. "price")\n- Dimensions (e.g. "1000x1200")');
            return true;
        }

        if (identity.some(i => lower.includes(i))) {
            this.addMessage('ai', 'I am the BlindMatrix AI Assistant, designed to help you with your window covering needs.');
            return true;
        }

        return false;
    }

    searchProducts(query: string, autoLoad: boolean = false) {
        const trimmed = query.trim();
        if (!trimmed) {
            this.addMessage('ai', 'Please enter a product name or ID to search.');
            return;
        }

        this.isLoading = true;
        this.addMessage('system', `Searching for "${trimmed}"...`);

        const params = { ...this.routeParams };
        this.apiService.getAllProductData(params).pipe(
            takeUntil(this.destroy$),
            finalize(() => this.isLoading = false)
        ).subscribe({
            next: (res: any) => {
                const all = this.normalizeProducts(res);
                const q = trimmed.toLowerCase();
                const products = all.filter((p: any) =>
                    (p.label || p.productname || p.pei_ecomProductName || '').toLowerCase().includes(q)
                );
                if (products.length === 0) {
                    this.addMessage('ai', `I couldn't find any products matching "${trimmed}". Try something generic like "roller" or "wood".`);
                } else if (products.length === 1 && autoLoad) {
                    this.addMessage('system', `Found exactly one match: ${products[0].label || products[0].productname}`);
                    const id = this.getProductId(products[0]);
                    if (id) this.loadProduct(id);
                } else {
                    let msg = `Found ${products.length} products:\n`;
                    products.slice(0, 5).forEach((p: any) => {
                        msg += `- ${p.label || p.productname || p.pei_ecomProductName} (ID: ${this.getProductId(p)})\n`;
                    });
                    if (products.length > 5) msg += `...and ${products.length - 5} more.\n`;
                    msg += 'Type "load [ID]" to select one.';
                    this.addMessage('ai', msg);
                }
            },
            error: (err) => {
                this.addMessage('system', 'Search failed. Please try again.');
                console.error(err);
            }
        });
    }

    private normalizeProducts(res: any): any[] {
        const result = res?.result ?? res?.data?.result ?? res?.data ?? [];
        if (Array.isArray(result)) return result;
        if (Array.isArray(result?.EcomProductlist)) return result.EcomProductlist;
        if (Array.isArray(res?.result?.EcomProductlist)) return res.result.EcomProductlist;
        return [];
    }

    private getProductId(p: any): any {
        return p.productid ?? p.id ?? p.pei_productid ?? p.pei_id ?? null;
    }

    listProducts() {
        this.isLoading = true;
        this.addMessage('system', 'Loading products...');
        const params = { ...this.routeParams };
        this.apiService.getAllProductData(params).pipe(
            takeUntil(this.destroy$),
            finalize(() => this.isLoading = false)
        ).subscribe({
            next: (res: any) => {
                const products = this.normalizeProducts(res);
                this.allProducts = products;
                if (!products.length) {
                    this.addMessage('ai', 'No products found.');
                    return;
                }
                console.log(products);
                let msg = `Products (${products.length}):\n`;
                products.slice(0, 15).forEach((p: any) => {
                    msg += `- ${p.label || p.productname || p.pei_ecomProductName} (ID: ${this.getProductId(p)})\n`;
                });
                if (products.length > 15) msg += `...and ${products.length - 15} more.\n`;
                msg += 'Type "details [ID]" to view product details.';
                this.addMessage('ai', msg);
            },
            error: (err) => {
                this.addMessage('system', 'Failed to load products.');
                console.error(err);
            }
        });
    }

    loadProductDetails(productId: string) {
        this.isLoading = true;
        this.addMessage('system', `Fetching details for product ${productId}...`);
        const params = { ...this.routeParams, product_id: Number(productId) };
        this.apiService.getProductData(params).pipe(
            takeUntil(this.destroy$),
            finalize(() => this.isLoading = false)
        ).subscribe({
            next: (res: any) => {
                const product = this.normalizeProducts(res)[0];
                if (!product) {
                    this.addMessage('ai', 'No details found for that product.');
                    return;
                }
                this.lastProductDetails = product;
                const productName = product.label || product.productname || product.pei_ecomProductName;
                const minPrice = product.minimum_price ?? 'N/A';
                const freeSample = String(product.pei_ecomFreeSample) === '1' ? 'Yes' : 'No';
                const freeSamplePrice = product.pei_ecomsampleprice ?? 'N/A';
                const description = this.stripHtml(product.pi_productdescription || '');
                this.addMessage('ai', `Details:\n- ${productName}\n- Minimum price: ${minPrice}\n- Free sample available: ${freeSample}\n- Free sample price: ${freeSamplePrice}\n- Description: ${description}`);
                this.addMessage('ai', 'Ask me about this product using "ask ...".');
            },
            error: (err) => {
                this.addMessage('system', 'Failed to load product details.');
                console.error(err);
            }
        });
    }

    answerProductQuestion(question: string) {
        if (!this.lastProductDetails) {
            this.addMessage('ai', 'Load product details first using "details [ID]".');
            return;
        }
        if (!question.trim()) {
            this.addMessage('ai', 'Please ask a specific question.');
            return;
        }
        const q = question.toLowerCase();
        const p = this.lastProductDetails;
        const productName = p.label || p.productname || p.pei_ecomProductName || 'Product';
        const minPrice = p.minimum_price ?? 'N/A';
        const freeSample = String(p.pei_ecomFreeSample) === '1' ? 'Yes' : 'No';
        const freeSamplePrice = p.pei_ecomsampleprice ?? 'N/A';
        const description = this.stripHtml(p.pi_productdescription || '');

        if (q.includes('minimum') || q.includes('min price') || q.includes('price')) {
            this.addMessage('ai', `${productName} minimum price is ${minPrice}.`);
            return;
        }
        if (q.includes('free sample') || q.includes('sample')) {
            this.addMessage('ai', `Free sample available: ${freeSample}. Sample price: ${freeSamplePrice}.`);
            return;
        }
        if (q.includes('description') || q.includes('describe')) {
            this.addMessage('ai', `Description: ${description}`);
            return;
        }
        if (q.includes('recipe')) {
            this.addMessage('ai', `Recipe ID: ${p.recipeid ?? 'N/A'}.`);
            return;
        }

        const keyMatch = this.findProductKeyMatch(q, p);
        if (keyMatch) {
            const value = this.formatProductValue(keyMatch.value);
            this.addMessage('ai', `${keyMatch.key}: ${value}`);
            return;
        }

        const summary = [
            `Name: ${productName}`,
            `Minimum price: ${minPrice}`,
            `Free sample available: ${freeSample}`,
            `Free sample price: ${freeSamplePrice}`,
            `Description: ${description}`
        ].join('\n');
        this.addMessage('ai', summary);
    }

    private stripHtml(value: string): string {
        return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }

    private findProductKeyMatch(query: string, product: any): { key: string; value: any } | null {
        const keys = Object.keys(product || {});
        const direct = keys.find(k => k.toLowerCase() === query);
        if (direct) return { key: direct, value: product[direct] };

        const normalized = query.replace(/\s+/g, '_');
        const underscored = keys.find(k => k.toLowerCase() === normalized);
        if (underscored) return { key: underscored, value: product[underscored] };

        const contains = keys.find(k => k.toLowerCase().includes(query));
        if (contains) return { key: contains, value: product[contains] };

        return null;
    }

    private formatProductValue(value: any): string {
        if (value === null || value === undefined) return 'N/A';
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    return JSON.stringify(parsed);
                } catch {
                    return this.stripHtml(trimmed);
                }
            }
            return this.stripHtml(trimmed);
        }
        return JSON.stringify(value);
    }

    loadProduct(productId: string) {
        this.isLoading = true;
        this.addMessage('system', `Loading product ${productId}...`);
        this.product_id = Number(productId);
        this.selected_option_data = []; // Reset

        const params = { ...this.routeParams, product_id: this.product_id };

        this.apiService.getProductData(params).pipe(
            takeUntil(this.destroy$),
            switchMap((res: any) => {
                if (res.result?.EcomProductlist?.length > 0) {
                    const data = res.result.EcomProductlist[0];
                    this.addMessage('system', `Found Product: ${data.label}`);
                    this.recipeid = data.recipeid;
                    this.fabricFieldType = this.getCategoryFieldType(Number(data.pi_category));

                    return this.apiService.getProductParameters(params, this.recipeid);
                }
                throw new Error('Product not found');
            }),
            switchMap((data: any) => {
                if (data && data[0]) {
                    const response = data[0];
                    this.parameters_data = response.data || [];
                    this.netpricecomesfrom = response.netpricecomesfrom;
                    this.costpricecomesfrom = response.costpricecomesfrom;

                    this.initializeFormControls();
                    this.identifySpecialFields();

                    return forkJoin({
                        optionData: this.loadOptionData(params),
                        recipeList: this.apiService.getRecipeList(params),
                        FractionList: this.apiService.getFractionList(params)
                    });
                }
                return of(null);
            }),
            tap((results: any) => {
                if (results) {
                    this.processInitialResults(results);
                    // Auto-select defaults
                    this.applyDefaults();
                    this.addMessage('ai', 'Product loaded. Let’s go one by one.');
                    this.startGuidedOptions();
                }
            }),
            finalize(() => this.isLoading = false)
        ).subscribe({
            error: (err: any) => this.addMessage('system', `Error: ${err.message}`)
        });
    }

    getCategoryFieldType(cat: number) {
        if (cat === 5) return 21;
        if (cat === 4) return 20;
        if (cat === 3) return 5;
        return 0;
    }

    identifySpecialFields() {
        this.priceGroupField = this.parameters_data.find(f => f.fieldtypeid === 13);
        this.supplierField = this.parameters_data.find(f => f.fieldtypeid === 17);
        this.qtyField = this.parameters_data.find(f => f.fieldtypeid === 14);
        this.widthField = this.parameters_data.find(f => [7, 8, 11, 31].includes(f.fieldtypeid));
        this.dropField = this.parameters_data.find(f => [9, 10, 12, 32].includes(f.fieldtypeid));
        this.unitField = this.parameters_data.find(f => f.fieldtypeid === 34);
    }

    applyDefaults() {
        this.parameters_data.forEach(field => {
            const control = this.orderForm.get(`field_${field.fieldid}`);
            if (control && control.value !== '') {
                // Logic from initializeFormControls in original component
                // If value is set (e.g. supplier/unit defaults), ensure updateFieldValues is called
                const val = control.value;
                if (field.fieldtypeid === 34) { // Unit
                    this.unittype = Number(val);
                    this.unitOption = field.optionsvalue || [];
                    const opt = this.unitOption.find((o: any) => o.optionid == val);
                    if (opt) this.updateFieldValues(field, opt);
                }
                if (field.fieldtypeid === 17) { // Supplier
                    this.supplier_id = Number(val);
                    this.supplierOption = field.optionsvalue || [];
                    const opt = this.supplierOption.find((o: any) => o.optionid == val);
                    if (opt) this.updateFieldValues(field, opt);
                }
                if (field.fieldtypeid === 13) { // Price Group
                    this.pricegroup = val;
                    this.priceGroupOption = field.optionsvalue || [];
                    const opt = this.priceGroupOption.find((o: any) => o.optionid == val);
                    if (opt) this.updateFieldValues(field, opt);
                }
            }
        });

        if (this.qtyField) {
            const qtyControl = this.orderForm.get(`field_${this.qtyField.fieldid}`);
            if (qtyControl) {
                qtyControl.setValue(1, { emitEvent: false });
                this.updateFieldValues(this.qtyField, 1, 'defaultQty');
                this.hideField(this.qtyField);
            }
        }
        if (this.priceGroupField) {
            this.hideField(this.priceGroupField);
        }
        if (this.supplierField) {
            this.hideField(this.supplierField);
        }

        if (this.unittype) {
            this.handleUnitTypeChange(this.unittype);
        }
        // Default dimensions
        if (this.widthField) {
            const control = this.orderForm.get(`field_${this.widthField.fieldid}`);
            if (control) control.setValue(1000, { emitEvent: false });
            this.handleWidthChange(1000);
        }
        if (this.dropField) {
            const control = this.orderForm.get(`field_${this.dropField.fieldid}`);
            if (control) control.setValue(1000, { emitEvent: false });
            this.handleDropChange(1000);
        }
        this.updateMinMaxValidators(!!this.colorid);
    }

    initializeFormControls() {
        this.parameters_data.forEach(field => {
            if (!field.level) field.level = 1;
            const validators = [];
            if (field.mandatory == 1) validators.push(Validators.required);
            if (field.fieldtypeid === 6 && field.numeric_setcondition == 1) {
                if (field.numeric_minvalue !== null && field.numeric_minvalue !== undefined) {
                    validators.push(Validators.min(field.numeric_minvalue));
                }
                if (field.numeric_maxvalue !== null && field.numeric_maxvalue !== undefined) {
                    validators.push(Validators.max(field.numeric_maxvalue));
                }
            }
            this.orderForm.addControl(`field_${field.fieldid}`, this.fb.control(field.value || '', validators));
        });
        // Add standard controls
        this.orderForm.addControl('unit', this.fb.control('mm'));
        this.orderForm.addControl('width', this.fb.control(1000));
        this.orderForm.addControl('drop', this.fb.control(1000));
        this.orderForm.addControl('widthfraction', this.fb.control(0));
        this.orderForm.addControl('dropfraction', this.fb.control(0));
        this.orderForm.addControl('qty', this.fb.control(1));
    }

    loadOptionData(params: any): Observable<any> {
        return this.apiService.filterbasedlist({ ...params, product_id: this.product_id }, '', '', '', this.pricegroup, this.colorid, this.fabricid, this.unittype, this.fabricFieldType).pipe(
            switchMap((filterData: any) => {
                if (!filterData?.[0]?.data?.optionarray) return of([]);
                const filterresponseData = filterData[0].data;
                const requests: Observable<any>[] = [];

                this.parameters_data.forEach(field => {
                    if ([3, 5, 20, 21].includes(field.fieldtypeid)) {
                        let matrial = 0;
                        let filter = '';
                        if (field.fieldtypeid === 3) { filter = filterresponseData.optionarray[field.fieldid]; }
                        else if (field.fieldtypeid === 5) { matrial = 1; filter = filterresponseData.coloridsarray; }
                        else if (field.fieldtypeid === 20) { matrial = 2; filter = filterresponseData.coloridsarray; }
                        else if (field.fieldtypeid === 21) { filter = filterresponseData.coloridsarray; }

                        requests.push(
                            this.apiService.getOptionlist(params, 1, field.fieldtypeid, matrial, field.fieldid, filter, this.recipeid)
                                .pipe(map(res => ({ fieldId: field.fieldid, data: res })))
                        );
                    } else if ([14, 34, 17, 13, 4].includes(field.fieldtypeid)) {
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
                                const selectedOption = field.optionsvalue.find((opt: any) => `${opt.optionid}` === `${valueToSet}`);
                                if (selectedOption) this.updateFieldValues(field, selectedOption, 'default');
                            }
                        }
                    }
                });
                return requests.length ? forkJoin(requests) : of([]);
            }),
            tap((responses: any[]) => {
                responses.forEach(r => {
                    const opts = r.data?.[0]?.data?.[0]?.optionsvalue || [];
                    const filtered = Array.isArray(opts)
                        ? opts.filter((opt: any) => opt.availableForEcommerce !== 0)
                        : [];
                    if (filtered.length === 0) {
                        const field = this.parameters_data.find(f => f.fieldid === r.fieldId);
                        if (field) field.hidden = true;
                        if (this.orderForm.contains(`field_${r.fieldId}`)) {
                            this.orderForm.removeControl(`field_${r.fieldId}`);
                        }
                        return;
                    }
                    this.option_data[r.fieldId] = filtered;
                });
            })
        );
    }

    processInitialResults(results: any) {
        if (results.recipeList?.[0]?.data?.[0]) {
            const recipe = results.recipeList[0].data[0];
            this.rulescount = recipe.rulescount;
            this.formulacount = recipe.formulacount;
        }
        if (results.FractionList?.result) {
            const fraction = results.FractionList.result;
            this.unittypename = fraction.fractioname;
            this.unittype = fraction.unitypeid;
            this.inchfraction_array = fraction.inchfraction || [];
        }
    }

    listAvailableOptions() {
        let msg = "Available Options:\n";
        this.parameters_data.forEach(field => {
            if (field.hidden) return;
            const control = this.orderForm.get(`field_${field.fieldid}`);
            const val = control?.value;
            const opts = this.option_data[field.fieldid] || field.optionsvalue;

            if (opts && opts.length) {
                const selectedName = opts.find((o: any) => o.optionid == val)?.optionname || val;
                msg += `- ${field.fieldname}: ${val ? 'Selected: ' + selectedName : 'Not Selected'} (${opts.length} options)\n`;
            } else if ([7, 8, 11, 31, 9, 10, 12, 32].includes(field.fieldtypeid)) {
                const dimVal = field.fieldtypeid === this.widthField?.fieldtypeid ? this.orderForm.get('width')?.value : this.orderForm.get('drop')?.value;
                msg += `- ${field.fieldname}: ${dimVal} (Input)\n`;
            }
        });
        this.addMessage('ai', msg);
    }

    startGuidedOptions() {
        if (!this.parameters_data.length) {
            this.addMessage('ai', 'Load a product first.');
            return;
        }
        this.guidedFields = this.parameters_data.filter(f => {
            if (f.hidden) return false;
            if (f.showfieldecomonjob !== undefined && f.showfieldecomonjob !== 1) return false;
            const opts = this.option_data[f.fieldid] || f.optionsvalue;
            if (Array.isArray(opts) && opts.length > 0) return true;
            return [7, 8, 11, 31, 9, 10, 12, 32, 14, 6, 18, 29].includes(f.fieldtypeid);
        });
        this.guidedIndex = 0;
        this.askNextOption();
    }

    askNextOption() {
        if (this.guidedIndex < 0 || this.guidedIndex >= this.guidedFields.length) {
            const jsondata = this.orderitemdata(false);
            this.addMessage('ai', `All options reviewed. JSON:\n${JSON.stringify(jsondata, null, 2)}`);
            this.guidedIndex = -1;
            return;
        }

        const field = this.guidedFields[this.guidedIndex];
        if (field.hidden) {
            this.guidedIndex += 1;
            this.askNextOption();
            return;
        }
        const opts = this.option_data[field.fieldid] || field.optionsvalue || [];
        const isNumeric = [7, 8, 11, 31, 9, 10, 12, 32, 14, 6].includes(field.fieldtypeid);
        const isText = [18, 29].includes(field.fieldtypeid);
        if (isNumeric && opts.length === 0) {
            const label = field.fieldname || (field.fieldtypeid === this.widthField?.fieldtypeid ? 'Width' : 'Drop');
            this.addMessage('ai', `Enter ${label} (number).`);
            return;
        }
        if (isText && opts.length === 0) {
            const label = field.fieldname || 'value';
            this.addMessage('ai', `Enter ${label}.`);
            return;
        }
        const top = opts.slice(0, 8);
        let msg = `Choose ${field.fieldname}. Options:\n`;
        top.forEach((o: any, i: number) => {
            msg += `${i + 1}. ${o.optionname}\n`;
        });
        if (opts.length > top.length) {
            msg += `...and ${opts.length - top.length} more. Reply with a number or name.`;
        } else {
            msg += 'Reply with a number or name.';
        }
        const suggestions = top.map((o: any) => ({
            label: o.optionname,
            value: o.optionname
        }));
        const allowModal = opts.length > top.length;
        const idx = this.addMessage('ai', msg, { suggestions, showAll: allowModal });
        this.currentPromptMessageIndex = idx;
    }

    trySelectOption(search: string) {
        if (this.guidedIndex >= 0 && this.guidedIndex < this.guidedFields.length) {
            const field = this.guidedFields[this.guidedIndex];
            const opts = this.option_data[field.fieldid] || field.optionsvalue || [];
            const trimmed = search.trim();
            const isNumeric = [7, 8, 11, 31, 9, 10, 12, 32, 14, 6].includes(field.fieldtypeid);
            const isText = [18, 29].includes(field.fieldtypeid);
            let match: any | undefined;

            if (isNumeric && opts.length === 0) {
                const val = Number(trimmed);
                if (Number.isFinite(val)) {
                    const control = this.orderForm.get(`field_${field.fieldid}`);
                    if (control) {
                        control.setValue(val);
                        control.updateValueAndValidity();
                        if (control.invalid) {
                            this.addMessage('ai', 'That number is out of range. Please enter a valid value.');
                            return;
                        }
                    }
                    if (this.widthField && field.fieldid === this.widthField.fieldid) {
                        this.handleWidthChange(val);
                    } else if (this.dropField && field.fieldid === this.dropField.fieldid) {
                        this.handleDropChange(val);
                    } else {
                        this.updateFieldValues(field, val, 'guidedNumber');
                    }
                    this.advanceGuided(field);
                    return;
                }
                this.addMessage('ai', 'Please enter a valid number.');
                return;
            }

            if (isText && opts.length === 0) {
                const control = this.orderForm.get(`field_${field.fieldid}`);
                if (control) {
                    control.setValue(trimmed);
                    control.updateValueAndValidity();
                    if (control.invalid) {
                        this.addMessage('ai', 'Please enter a valid value.');
                        return;
                    }
                }
                this.updateFieldValues(field, trimmed, 'guidedText');
                this.advanceGuided(field);
                return;
            }

            if (/^\d+$/.test(trimmed)) {
                const idx = Number(trimmed) - 1;
                match = opts[idx];
            } else {
                match = opts.find((o: any) => o.optionname.toLowerCase().includes(trimmed.toLowerCase()));
            }

            if (match) {
                this.handleOptionSelection(field, match.optionid, match)
                    .pipe(takeUntil(this.destroy$))
                    .subscribe(() => {
                        this.advanceGuided(field);
                    });
                return;
            }
            this.addMessage('ai', `I couldn't match "${search}". Reply with a number or name from the list.`);
            return;
        }

        let found = false;

        for (const fieldId in this.option_data) {
            const opts = this.option_data[fieldId];
            const match = opts.find(o => o.optionname.toLowerCase().includes(search.toLowerCase()));

            if (match) {
                const field = this.parameters_data.find(f => f.fieldid == fieldId);
                if (field) {
                    this.addMessage('user', `Select ${match.optionname} for ${field.fieldname}`);
                    this.handleOptionSelection(field, match.optionid, match)
                        .pipe(takeUntil(this.destroy$))
                        .subscribe();
                    found = true;
                    break;
                }
            }
        }

        if (!found) {
            this.addMessage('ai', `Could not find option "${search}".`);
        }
    }

    private advanceGuided(field: any) {
        const idx = this.guidedFields.findIndex(f =>
            f.fieldid === field.fieldid && f.allparentFieldId === field.allparentFieldId
        );
        if (idx >= 0) {
            this.guidedIndex = idx + 1;
        } else {
            this.guidedIndex += 1;
        }
        this.askNextOption();
    }

    handleOptionSelection(field: any, val: any, optionObj: any): Observable<void> {
        const control = this.orderForm.get(`field_${field.fieldid}`);
        if (!control) return of(void 0);
        control.setValue(val);
        this.addMessage('system', `Set ${field.fieldname} to ${optionObj.optionname}`);
        return this.applyFieldValue(this.routeParams, field, val, false, optionObj);
    }

    private refreshTopLevelOptions(params: any): Observable<any> {
        return this.apiService.filterbasedlist({ ...params, product_id: this.product_id }, '', '', '', this.pricegroup, this.colorid, this.fabricid, this.unittype, this.fabricFieldType).pipe(
            switchMap((filterData: any) => {
                if (!filterData?.[0]?.data?.optionarray) return of([]);
                const filterresponseData = filterData[0].data;
                const requests: Observable<any>[] = [];

                this.parameters_data.forEach(field => {
                    if ([3, 5, 20, 21].includes(field.fieldtypeid)) {
                        let matrial = 0;
                        let filter = '';
                        if (field.fieldtypeid === 3) {
                            filter = filterresponseData.optionarray[field.fieldid];
                        } else if (field.fieldtypeid === 5) {
                            matrial = 1;
                            filter = filterresponseData.coloridsarray;
                        } else if (field.fieldtypeid === 20) {
                            matrial = 2;
                            filter = filterresponseData.coloridsarray;
                        } else if (field.fieldtypeid === 21) {
                            filter = filterresponseData.coloridsarray;
                        }

                        requests.push(
                            this.apiService.getOptionlist(params, 1, field.fieldtypeid, matrial, field.fieldid, filter, this.recipeid)
                                .pipe(map(res => ({ fieldId: field.fieldid, data: res })))
                        );
                    }
                });
                return requests.length ? forkJoin(requests) : of([]);
            }),
            tap((responses: any[]) => {
                responses.forEach(r => {
                    const options = r.data?.[0]?.data?.[0]?.optionsvalue || [];
                    const filtered = Array.isArray(options)
                        ? options.filter((opt: any) => opt.availableForEcommerce !== 0)
                        : [];
                    if (filtered.length === 0) {
                        const field = this.parameters_data.find(f => f.fieldid === r.fieldId);
                        if (field) field.hidden = true;
                        if (this.orderForm.contains(`field_${r.fieldId}`)) {
                            this.orderForm.removeControl(`field_${r.fieldId}`);
                        }
                        return;
                    }
                    this.option_data[r.fieldId] = filtered;
                });
            }),
            catchError(err => {
                console.error('refreshTopLevelOptions failed', err);
                return of(null);
            })
        );
    }

    private removeSelectedOptionData(fields: any[]): void {
        fields.forEach(field => {
            // In full logic, we would remove specific options.
            // Here, updateFieldValues handles simple replacement.
            // But for safety against stale sub-options (which clearExistingSubfields handles),
            // we don't strictly *need* complex logic for the parent field itself if it's 1-to-1.
        });
    }

    private clearExistingSubfields(parentFieldId: number, parentPath?: string): void {
        const parent = parentPath
            ? this.parameters_data.find(f => f.fieldid == parentFieldId && f.allparentFieldId === parentPath)
            : this.parameters_data.find(f => f.fieldid == parentFieldId);
        if (!parent) return;

        const path = parent.allparentFieldId || String(parent.fieldid);

        // Find descendants
        const fieldsToRemove = this.parameters_data.filter(f =>
            f.allparentFieldId && String(f.allparentFieldId).startsWith(`${path},`)
        );

        if (fieldsToRemove.length === 0) return;

        // Remove from selected_option_data
        const removeFieldIds = new Set(fieldsToRemove.map(f => f.fieldid));
        this.selected_option_data = this.selected_option_data.filter(o => !removeFieldIds.has(o.fieldid));

        // Remove from parameters_data and Form
        this.parameters_data = this.parameters_data.filter(f =>
            !fieldsToRemove.some(r => r.fieldid === f.fieldid && r.allparentFieldId === f.allparentFieldId)
        );
        if (this.guidedFields.length) {
            this.guidedFields = this.guidedFields.filter(f =>
                !fieldsToRemove.some(r => r.fieldid === f.fieldid && r.allparentFieldId === f.allparentFieldId)
            );
        }
        fieldsToRemove.forEach(f => {
            this.orderForm.removeControl(`field_${f.fieldid}`);
            delete this.option_data[f.fieldid];
        });
    }

    processSelectedOption(params: any, parentField: any, option: any): Observable<any> {
        if (!option?.subdatacount || option.subdatacount <= 0) return of(null);

        const parentLevel = parentField.level || 1;
        if (parentLevel >= this.MAX_NESTING_LEVEL) return of(null);

        return this.apiService.sublist(
            params,
            parentLevel + 1,
            parentField.fieldtypeid,
            option.fieldoptionlinkid,
            option.optionid,
            parentField.masterparentfieldid || parentField.fieldid,
            this.supplier_id,
            this.recipeid
        ).pipe(
            takeUntil(this.destroy$),
            switchMap((subFieldResponse: any) => {
                const sublist = subFieldResponse?.[0]?.data;
                if (!Array.isArray(sublist)) {
                    this.addMessage('system', `Sublist empty for ${parentField.fieldname} -> ${option.optionname}.`);
                    return of(null);
                }

                const relevant = sublist.filter((subfield: any) =>
                    [3, 5, 20, 21, 18, 6, 4].includes(subfield.fieldtypeid)
                );
                if (relevant.length === 0) {
                    this.addMessage('system', `No subfields for ${parentField.fieldname} -> ${option.optionname}.`);
                    return of(null);
                }

                return from(relevant).pipe(
                    mergeMap((subfield: any) => this.processSubfield(params, subfield, parentField, parentLevel + 1)),
                    toArray()
                );
            }),
            catchError((err: any) => {
                console.error("Error processing sub-options", err);
                return of(null);
            })
        );
    }

    processSubfield(params: any, subfield: any, parentField: any, level: any): Observable<any> {
        const apiChildren = subfield.subchild;
        const subfieldForState = { ...subfield, subchild: [] as any[] };

        subfieldForState.parentFieldId = parentField.fieldid;
        subfieldForState.level = level;
        subfieldForState.masterparentfieldid = parentField.masterparentfieldid || parentField.fieldid;
        subfieldForState.allparentFieldId = parentField.allparentFieldId
            ? `${parentField.allparentFieldId},${subfieldForState.fieldid}`
            : `${parentField.fieldid},${subfieldForState.fieldid}`;

        const alreadyExistsFlat = this.parameters_data.some(
            f => f.fieldid === subfieldForState.fieldid && f.allparentFieldId === subfieldForState.allparentFieldId
        );
        if (alreadyExistsFlat) return of(null);

        const parentIndex = this.parameters_data.findIndex(
            f => f.fieldid === parentField.fieldid && f.allparentFieldId === parentField.allparentFieldId
        );
        if (parentIndex !== -1) {
            this.parameters_data.splice(parentIndex + 1, 0, subfieldForState);
        } else {
            this.parameters_data.push(subfieldForState);
        }

        if (!parentField.subchild) parentField.subchild = [];
        const alreadyExistsNested = parentField.subchild.some(
            (f: any) => f.fieldid === subfieldForState.fieldid && f.allparentFieldId === subfieldForState.allparentFieldId
        );
        if (!alreadyExistsNested) parentField.subchild.push(subfieldForState);

        this.addSubfieldFormControlSafe(subfieldForState);
        if (this.guidedIndex >= 0 && !subfieldForState.hidden) {
            const parentIdx = this.guidedFields.findIndex(
                f => f.fieldid === parentField.fieldid && f.allparentFieldId === parentField.allparentFieldId
            );
            const alreadyInGuided = this.guidedFields.some(
                f => f.fieldid === subfieldForState.fieldid && f.allparentFieldId === subfieldForState.allparentFieldId
            );
            if (!alreadyInGuided) {
                if (parentIdx >= 0) {
                    this.guidedFields.splice(parentIdx + 1, 0, subfieldForState);
                    if (this.guidedIndex > parentIdx) {
                        this.guidedIndex += 1;
                    }
                } else {
                    this.guidedFields.push(subfieldForState);
                }
            }
        }

        const children$: Observable<any> = (Array.isArray(apiChildren) && apiChildren.length > 0)
            ? from(apiChildren).pipe(
                concatMap((child: any) => this.processSubfield(params, child, subfieldForState, level + 1)),
                toArray()
            )
            : of(null);

        const shouldLoadOptions = subfieldForState.field_has_sub_option || [3, 5, 20, 21].includes(subfieldForState.fieldtypeid);
        const options$: Observable<any> = shouldLoadOptions
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

    loadSubfieldOptions(params: any, subfield: any): Observable<any> {
        return this.apiService.filterbasedlist({ ...params, product_id: this.product_id }, '', String(subfield.fieldtypeid), String(subfield.fieldid), this.pricegroup, this.colorid, this.fabricid, this.unittype, this.fabricFieldType).pipe(
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
                        map((optionData: any) => {
                            const options = optionData?.[0]?.data?.[0]?.optionsvalue || [];
                            const filtered = Array.isArray(options)
                                ? options.filter((opt: any) =>
                                    opt.availableForEcommerce === undefined || opt.availableForEcommerce === 1
                                )
                                : [];

                            if (filtered.length === 0) {
                                this.removeFieldSafely(subfield.fieldid, subfield.allparentFieldId);
                                return null;
                            }

                            this.option_data[subfield.fieldid] = filtered;
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
                                    setTimeout(() => {
                                        this.applyFieldValue(params, subfield, valueToSet, true)
                                            .pipe(takeUntil(this.destroy$))
                                            .subscribe();
                                    }, 0);
                                }
                            }
                            return filtered;
                        }),
                        catchError(err => {
                            console.error('Error loading subfield options:', err);
                            this.removeFieldSafely(subfield.fieldid, subfield.allparentFieldId);
                            return of(null);
                        })
                    );
                }

                return of(null);
            }),
            catchError(err => {
                console.error('Error fetching subfield filter data:', err);
                this.removeFieldSafely(subfield.fieldid, subfield.allparentFieldId);
                return of(null);
            })
        );
    }

    private addSubfieldFormControlSafe(subfield: any): void {
        const controlName = `field_${subfield.fieldid}`;
        if (this.orderForm.get(controlName)) return;
        const validators = subfield.mandatory == 1 ? [Validators.required] : [];
        this.orderForm.addControl(controlName, this.fb.control(subfield.value || '', validators));
    }

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
    }

    private applyFieldValue(params: any, field: any, value: any, isInitial: boolean = false, selectedOption?: any): Observable<void> {
        if (!field) return of(void 0);

        this.removeSelectedOptionData([field]);

        if (value === null || value === undefined || value === '') {
            this.updateFieldValues(field, null, 'valueChangedToEmpty');
            this.clearExistingSubfields(field.fieldid, field.allparentFieldId);
            return of(void 0);
        }

        this.clearExistingSubfields(field.fieldid, field.allparentFieldId);

        const options = this.option_data[field.fieldid] || field.optionsvalue;
        if (!options || options.length === 0) {
            this.updateFieldValues(field, value, 'restChange');
            return of(void 0);
        }

        if (Array.isArray(value)) {
            const selectedOptions = options.filter((opt: any) => value.includes(opt.optionid));
            if (selectedOptions.length === 0) return of(void 0);

            return from(selectedOptions).pipe(
                mergeMap((opt: any) => this.processSelectedOption(params, field, opt)),
                toArray(),
                tap(() => {
                    this.updateFieldValues(field, selectedOptions, 'Array.isArrayOptions');
                }),
                map(() => void 0)
            );
        }

        const resolvedOption = selectedOption || options.find((opt: any) => `${opt.optionid}` === `${value}`);
        if (!resolvedOption) return of(void 0);

        if (field.fieldtypeid === 34) {
            this.handleUnitTypeChange(value);
        }
        if (field.fieldtypeid === 13) {
            this.pricegroup = value;
        }
        if (field.fieldtypeid === 17) {
            this.supplier_id = Number(value);
        }
            if ((field.fieldtypeid === 5 && field.level == 1) || (field.fieldtypeid === 21 && field.level == 1)) {
                this.fabricid = value;
                this.colorid = 0;
            }
        if ((field.fieldtypeid === 5 && field.level == 2) || field.fieldtypeid === 20 || (field.fieldtypeid === 21 && field.level == 2)) {
            this.colorid = value;
        }

        const shouldUpdatePriceGroup = (field.fieldtypeid === 5 && field.level == 1 && resolvedOption.pricegroupid) || field.fieldtypeid === 20 || (field.fieldtypeid === 21 && field.level == 1);
        let preSublist$ = of(null);

            if (shouldUpdatePriceGroup) {
                this.pricegroup = resolvedOption.pricegroupid;
                if (this.priceGroupField) {
                    const pgControl = this.orderForm.get(`field_${this.priceGroupField.fieldid}`);
                    if (pgControl) {
                        pgControl.setValue(this.pricegroup, { emitEvent: false });
                        const selectedPg = (this.priceGroupOption || []).find((opt: any) => `${opt.optionid}` === `${this.pricegroup}`);
                        if (selectedPg) this.updateFieldValues(this.priceGroupField, selectedPg, 'pricegrouponColor');
                        this.hideField(this.priceGroupField);
                    }
                }
                preSublist$ = this.apiService.filterbasedlist(
                    { ...params, product_id: this.product_id },
                    '',
                    String(field.fieldtypeid),
                    String(field.fieldid),
                    this.pricegroup,
                    this.colorid,
                    this.fabricid,
                    this.unittype,
                    this.fabricFieldType
                ).pipe(
                    tap((filterData: any) => {
                        this.supplier_id = filterData?.[0]?.data?.selectsupplierid ?? this.supplier_id;
                        if (this.supplierField) {
                            const spControl = this.orderForm.get(`field_${this.supplierField.fieldid}`);
                            if (spControl) {
                                spControl.setValue(Number(this.supplier_id), { emitEvent: false });
                                const selectedSp = (this.supplierOption || []).find((opt: any) => `${opt.optionid}` === `${this.supplier_id}`);
                                if (selectedSp) this.updateFieldValues(this.supplierField, selectedSp, 'suppieronColor');
                                this.hideField(this.supplierField);
                            }
                        }
                        if (this.qtyField) {
                            const qtyControl = this.orderForm.get(`field_${this.qtyField.fieldid}`);
                            if (qtyControl) {
                                qtyControl.setValue(1, { emitEvent: false });
                                this.updateFieldValues(this.qtyField, 1, 'autoQty');
                                this.hideField(this.qtyField);
                            }
                        }
                    })
                );
            }

        const shouldRefresh = [34, 13, 17].includes(field.fieldtypeid) || [5, 20, 21].includes(field.fieldtypeid);

        return preSublist$
            .pipe(
                switchMap(() => this.processSelectedOption(params, field, resolvedOption)),
                switchMap(() => shouldRefresh ? this.refreshTopLevelOptions({ ...params, product_id: this.product_id }) : of(null)),
                tap(() => {
                    if (!shouldUpdatePriceGroup) {
                        this.updateFieldValues(field, resolvedOption, 'restOption');
                    }
                    if ((field.fieldtypeid === 5 && field.level == 1) || (field.fieldtypeid === 21 && field.level == 1)) {
                        this.updateFieldValues(field, resolvedOption, 'updatefabric');
                        this.updateMinMaxValidators(false);
                    }
                    if ((field.fieldtypeid === 5 && field.level == 2) || field.fieldtypeid === 20 || (field.fieldtypeid === 21 && field.level == 2)) {
                        this.updateFieldValues(field, resolvedOption, 'updatecolor');
                        this.updateMinMaxValidators(true);
                    }
                    if ([34, 13, 17].includes(field.fieldtypeid)) {
                        this.updateFieldValues(field, resolvedOption, 'updatebasic');
                    }
                }),
                map(() => void 0)
            );
    }

    private hideField(field: any) {
        if (!field) return;
        field.hidden = true;
        if (this.guidedFields.length) {
            this.guidedFields = this.guidedFields.filter(f =>
                !(f.fieldid === field.fieldid && f.allparentFieldId === field.allparentFieldId)
            );
        }
    }

    // CORE LOGIC: Replicated from OrderformComponent "updateFieldValues"
    updateFieldValues(field: any, selectedOption: any, source: string = ''): void {
        const targetField = this.parameters_data.find(
            f => f.fieldid === field.fieldid && f.allparentFieldId === field.allparentFieldId
        ) || field;
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
            } else if (selectedOption && selectedOption.optionname) {
                targetField.labelname = targetField.fieldname ?? '';
                targetField.valueid = selectedOption?.fieldoptionlinkid ? String(selectedOption.fieldoptionlinkid) : '';
                targetField.optionid = String(selectedOption.optionid);
                if ([17, 13, 34].includes(field.fieldtypeid)) {
                    targetField.value = String(selectedOption.optionid);
                    targetField.valuename = String(selectedOption.optionname);
                } else {
                    targetField.value = String(selectedOption.optionname);
                }
                targetField.optionvalue = [selectedOption];
                targetField.optionquantity = '1';
            } else {
                targetField.value = String(selectedOption) ?? '';
            }
        }

        const selectedUnitOption = this.unitOption?.find(
            (opt: { optionid: any }) => `${opt.optionid}` === `${this.unittype}`
        );
        const unitName =
            (this.unitOption && selectedUnitOption?.optionname) || this.unittypename || 'unit';

        if (this.widthField && [7, 8, 11, 31, 34].includes(targetField.fieldtypeid)) {
            let fractionValue = 0;
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
            let fractionValue = 0;
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

    calculatePrice() {
        this.addMessage('system', 'Calculating Price...');

        this.apiService.getVat(this.routeParams).pipe(
            switchMap(vatRes => {
                this.vatpercentage = vatRes?.data || 0;
                const width = this.orderForm.get(`field_${this.widthField?.fieldid}`)?.value || 1000;
                const drop = this.orderForm.get(`field_${this.dropField?.fieldid}`)?.value || 1000;

                this.rulesorderitem = this.orderitemdata(true);

                const fetchPrice = (rulesRes?: any, formulaRes?: any) => {
                    return this.apiService.getPrice(
                        this.routeParams,
                        width,
                        drop,
                        this.unittype,
                        this.supplier_id,
                        this.widthField?.fieldtypeid || 0,
                        this.dropField?.fieldtypeid || 0,
                        this.pricegroup,
                        this.vatpercentage,
                        this.selected_option_data,
                        this.fabricid,
                        this.colorid,
                        this.netpricecomesfrom,
                        this.costpricecomesfrom,
                        formulaRes?.productionmaterialcostprice,
                        formulaRes?.productionmaterialnetprice,
                        formulaRes?.productionmaterialnetpricewithdiscount,
                        this.fabricFieldType
                    );
                };

                if (this.rulescount > 0) {
                    return this.apiService.calculateRules(
                        this.routeParams,
                        width,
                        drop,
                        this.unittype,
                        this.supplier_id,
                        this.widthField?.fieldtypeid || 0,
                        this.dropField?.fieldtypeid || 0,
                        this.pricegroup,
                        this.vatpercentage,
                        this.selected_option_data,
                        this.fabricid,
                        this.colorid,
                        this.rulesorderitem,
                        0,
                        this.fabricFieldType,
                        this.recipeid
                    ).pipe(
                        switchMap((rulesRes: any) => {
                            if (this.formulacount > 0) {
                                return this.apiService.calculateRules(
                                    this.routeParams,
                                    width,
                                    drop,
                                    this.unittype,
                                    this.supplier_id,
                                    this.widthField?.fieldtypeid || 0,
                                    this.dropField?.fieldtypeid || 0,
                                    this.pricegroup,
                                    this.vatpercentage,
                                    this.selected_option_data,
                                    this.fabricid,
                                    this.colorid,
                                    this.rulesorderitem,
                                    1,
                                    this.fabricFieldType,
                                    this.recipeid
                                ).pipe(switchMap(formulaRes => fetchPrice(rulesRes, formulaRes)));
                            }
                            return fetchPrice(rulesRes);
                        })
                    );
                }

                if (this.formulacount > 0) {
                    return this.apiService.calculateRules(
                        this.routeParams,
                        width,
                        drop,
                        this.unittype,
                        this.supplier_id,
                        this.widthField?.fieldtypeid || 0,
                        this.dropField?.fieldtypeid || 0,
                        this.pricegroup,
                        this.vatpercentage,
                        this.selected_option_data,
                        this.fabricid,
                        this.colorid,
                        this.rulesorderitem,
                        1,
                        this.fabricFieldType,
                        this.recipeid
                    ).pipe(switchMap(formulaRes => fetchPrice(undefined, formulaRes)));
                }

                return fetchPrice();
            })
        ).subscribe(priceRes => {
            if (priceRes?.fullpriceobject?.grossprice) {
                this.grossPrice = priceRes.fullpriceobject.grossprice;
                this.addMessage('ai', `The price is: ${this.currencySymbol}${this.grossPrice}`);
            } else {
                this.addMessage('ai', 'Could not calculate price. Please check selections (Fabric, Color, etc).');
            }
        });
    }

    private handleWidthChange(value: any): void {
        let fractionValue = 0;
        if (this.showFractions) {
            fractionValue = Number(this.orderForm.get('widthfraction')?.value) || 0;
        }
        const totalWidth = Number(value) + fractionValue;
        if (this.widthField) {
            this.updateFieldValues(this.widthField, value, 'Totalwidth');
        }
        this.orderForm.patchValue({ width: totalWidth }, { emitEvent: false });
    }

    private handleDropChange(value: any): void {
        let fractionValue = 0;
        if (this.showFractions) {
            fractionValue = Number(this.orderForm.get('dropfraction')?.value) || 0;
        }
        const totalDrop = Number(value) + fractionValue;
        if (this.dropField) {
            this.updateFieldValues(this.dropField, value, 'TotalDrop');
        }
        this.orderForm.patchValue({ drop: totalDrop }, { emitEvent: false });
    }

    private handleUnitTypeChange(value: any): void {
        const unitValue = typeof value === 'string' ? parseInt(value, 10) : value;
        const prevWidthFraction = Number(this.orderForm.get('widthfraction')?.value) || 0;
        const prevDropFraction = Number(this.orderForm.get('dropfraction')?.value) || 0;

        this.unittype = unitValue;
        this.showFractions = (unitValue === 4);
        this.updateMinMaxValidators(true);

        if (unitValue !== 4) {
            if (prevWidthFraction) {
                const widthControl = this.orderForm.get(`field_${this.widthField?.fieldid}`);
                if (widthControl) {
                    widthControl.setValue(Math.max(0, (Number(widthControl.value) || 0) - prevWidthFraction), { emitEvent: false });
                }
            }
            if (prevDropFraction) {
                const dropControl = this.orderForm.get(`field_${this.dropField?.fieldid}`);
                if (dropControl) {
                    dropControl.setValue(Math.max(0, (Number(dropControl.value) || 0) - prevDropFraction), { emitEvent: false });
                }
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

        this.apiService.getFractionData(this.routeParams, unitValue).pipe(
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
        });
    }

    private updateMinMaxValidators(color: boolean): void {
        this.min_width = null;
        this.max_width = null;
        this.min_drop = null;
        this.max_drop = null;
        const colorid = color ? String(this.colorid) : "";
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
                        if (this.min_width != null) widthValidators.push(Validators.min(this.min_width));
                        if (this.max_width != null) widthValidators.push(Validators.max(this.max_width));
                        widthControl.setValidators(widthValidators);
                        widthControl.updateValueAndValidity();
                    }
                }

                if (this.dropField) {
                    const dropControl = this.orderForm.get(`field_${this.dropField.fieldid}`);
                    if (dropControl) {
                        const dropValidators = [Validators.required];
                        if (this.min_drop != null) dropValidators.push(Validators.min(this.min_drop));
                        if (this.max_drop != null) dropValidators.push(Validators.max(this.max_drop));
                        dropControl.setValidators(dropValidators);
                        dropControl.updateValueAndValidity();
                    }
                }
            });
    }

    private orderitemdata(isForRulesCalculation: boolean = false): any[] {
        return this.parameters_data.map(t => {
            const isSpecialType = isForRulesCalculation && [34, 17, 13].includes(+t.fieldtypeid);
            let valueint = isSpecialType ? t.valuename || null : t.value || null;
            const i: any = {
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
                globaledit: false,
                numberfraction: t.numberfraction || null,
                numberfractiontext: t.numberfractiontext || null,
                fieldlevel: t.fieldlevel,
                mandatory: t.mandatory,
                fieldInformation: t.fieldInformation || null,
                ruleoverride: t.ruleoverride,
                optiondefault: t.optiondefault || t.optionid || null,
                optionsvalue: t.optionvalue || [],
                editruleoverride: t.editruleoverride === 1 ? 1 : 0,
                fieldtypeid: t.fieldtypeid,
                fieldid: t.fieldid,
                fieldname: t.fieldname
            };
            if (isForRulesCalculation) {
                i.quantity = t.optionquantity || null;
                i.fractionValue = 0;
            }
            return i;
        });
    }
}
