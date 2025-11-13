import { Component, ElementRef, Input, AfterViewInit, OnDestroy, HostListener, OnChanges, ChangeDetectorRef,SimpleChanges,Renderer2, RendererFactory2,ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { FormsModule } from '@angular/forms';

declare global {
  interface Window {
    configuratorpreview?: () => void;
    resizeimagepreview?: () => void;
    midpane?: (midrail: any, slastsize: any) => void;
    update_Panel?: (panel: number) => void;
    updatePanel?: (el: any) => void;
    slatsize?: (el: any) => void;
    tiltrod?: (val: any) => void;
    pushrod?: (el: any) => void;
    change_color?: (color: string, imageurl: string) => void;
    changecolor?: (el: any) => void;
    change_hinge_color?: (imageurl: string) => void;
    changehingecolor?: (el: any) => void;
    get_rgb?: (id: any) => void;
    getBase64Image?: (img: any) => void;
    convert_canvas?: (id_div: string) => string;
    getAverageRGB?: (imgEl: any) => { r: number; g: number; b: number };
    tierontier?: any;
    domtoimage?: any;
  }
}

@Component({
  selector: 'app-configurator',
  standalone: true,
  imports: [CommonModule,MatButtonToggleModule,FormsModule],
  templateUrl: './configurator.component.html',
  styleUrls: ['./configurator.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class ConfiguratorComponent implements AfterViewInit, OnDestroy {
  @Input() shutterdata: any = {};
  private renderer: Renderer2;
  private resizeListener?: () => void;
  private bodyClickListener?: (e: Event) => void;
  private st: any = {};
  private loadingafter = false;
  chosen_color_url: string="";
  shutter_type_name:string="";
  chosen_hinge_colorurl :  string ="";
  chosen_mid_rails: number= 1;
  chosen_no_of_panels: number= 0;
  chosen_slat_size : number= 0;
  chosen_tilt_rod : string="";
  slatsState: string = 'open'; 

  constructor(rendererFactory: RendererFactory2,private cdr: ChangeDetectorRef, private el: ElementRef,) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.chosen_color_url= this.shutterdata?.colorurl ?? '';
    if(!this.chosen_color_url){
      this.chosen_color_url  = 'assets/default-shutter-img.png';
    }
    this.shutter_type_name= this.shutterdata?.shutter_type_name ?? '';
    if(!this.shutter_type_name){
      this.shutter_type_name  = 'Full Height';
    }
    this.chosen_hinge_colorurl = this.shutterdata?.hinge_colorurl ?? '';
    this.chosen_mid_rails = this.shutterdata?.midrails ?? 0;
    this.chosen_no_of_panels = this.shutterdata?.no_of_panels ?? 0;
    if(!this.chosen_no_of_panels && 'Tier on Tier' == this.shutter_type_name){
      this.chosen_no_of_panels  = 1;
    }
    
    this.chosen_slat_size = (this.shutterdata?.slatsize ?? 1) / 20;
    this.chosen_tilt_rod = this.shutterdata?.tiltrod ?? '';
    this.cdr.detectChanges();
     // Bind all functions to window (Option A — global)
    this.bindGlobals();

    // Initial DOM wiring similar to DOMContentLoaded in original JS
    this.setupInitialSt();

    // Run same initial checks as original (call update_Panel, midpane, resizeimagepreview if select_color_image exists)
    const select_color_image = this.qValue('#select_color_image');
    if (select_color_image !== null && select_color_image !== '') {
      window.update_Panel && window.update_Panel(Number(this.qValue('.NumberOfPanels') || 0));
      window.midpane && window.midpane(this.qValue('.midrails') || 0, this.qValue('.SlatWidth') || 0);
      window.resizeimagepreview && window.resizeimagepreview();
    }

    // hide tiltrod for full solid shutter type
    const shuttertype = this.qValue('#set_shuttertype') || '';
    if (typeof shuttertype === 'string' && shuttertype.toLowerCase().indexOf('full solid') > -1) {
      this.qAll<HTMLInputElement>('.tiltrod').forEach(el => el.value = 'hidden');
      window.tiltrod && window.tiltrod('hidden');
    }

    // window resize handler (replicates jQuery(window).resize)
    const resizeHandler = () => {
      const select_color_image2 = this.qValue('#select_color_image');
      if (select_color_image2 !== null) {
        window.resizeimagepreview && window.resizeimagepreview();
      }
    };
    // Hinge color.
    this.change_hinge_color(this.chosen_hinge_colorurl || '');
    // Tilt rod.
    if(this.chosen_tilt_rod){
        this.tiltrod(this.chosen_tilt_rod.toLowerCase() || '');
    }
    
    if(this.chosen_slat_size){
      this.midpane(this.chosen_mid_rails ? this.chosen_mid_rails :1,this.chosen_slat_size);
    }

    window.addEventListener('resize', resizeHandler);
    this.resizeListener = () => window.removeEventListener('resize', resizeHandler);

    // body click handler that triggers configuratorpreview on radio changes (replicate jQuery body click)
    this.bodyClickListener = (e: Event) => {
      const target = e.target as HTMLElement;
      const id = (target && target.id) ? target.id : '';
      if ((id && id.toLowerCase().indexOf('radio_') > -1) || !!target.closest('.no_of_panels_elements')) {
        window.configuratorpreview && window.configuratorpreview();
      }
    };
    document.body.addEventListener('click', this.bodyClickListener);

    // call configuratorpreview on ready as original did
    try {
      window.configuratorpreview && window.configuratorpreview();
    } catch (err) {
      // ignore
    }
    this.loadingafter = false;
  }
  
  ngAfterViewInit(): void {
    const span = this.el.nativeElement.querySelector('.mouseHole-top');
    this.renderer.setStyle(span, 'background-image', 'url("assets/MouseHole_Top.png")');
    this.chosen_color_url  ='assets/default-shutter-img.png';
    this.shutter_type_name = 'Full Height';
    this.chosen_no_of_panels = 1;
    this.setPanelWidth(); 
    this.cdr.detectChanges();
    // Bind all functions to window (Option A — global)
    this.bindGlobals();

    // Initial DOM wiring similar to DOMContentLoaded in original JS
    this.setupInitialSt();

    // Run same initial checks as original (call update_Panel, midpane, resizeimagepreview if select_color_image exists)
    const select_color_image = this.qValue('#select_color_image');
    if (select_color_image !== null && select_color_image !== '') {
      window.update_Panel && window.update_Panel(Number(this.qValue('.NumberOfPanels') || 0));
      window.midpane && window.midpane(this.qValue('.midrails') || 0, this.qValue('.SlatWidth') || 0);
      window.resizeimagepreview && window.resizeimagepreview();
    }

    // hide tiltrod for full solid shutter type
    const shuttertype = this.qValue('#set_shuttertype') || '';
    if (typeof shuttertype === 'string' && shuttertype.toLowerCase().indexOf('full solid') > -1) {
      this.qAll<HTMLInputElement>('.tiltrod').forEach(el => el.value = 'hidden');
      window.tiltrod && window.tiltrod('hidden');
    }
    // window resize handler (replicates jQuery(window).resize)
    const resizeHandler = () => {
      const select_color_image2 = this.qValue('#select_color_image');
      if (select_color_image2 !== null) {
        window.resizeimagepreview && window.resizeimagepreview();
      }
    };
    window.addEventListener('resize', resizeHandler);
    this.resizeListener = () => window.removeEventListener('resize', resizeHandler);

    // body click handler that triggers configuratorpreview on radio changes (replicate jQuery body click)
    this.bodyClickListener = (e: Event) => {
      const target = e.target as HTMLElement;
      const id = (target && target.id) ? target.id : '';
      if ((id && id.toLowerCase().indexOf('radio_') > -1) || !!target.closest('.no_of_panels_elements')) {
        window.configuratorpreview && window.configuratorpreview();
      }
    };
    document.body.addEventListener('click', this.bodyClickListener);

    // call configuratorpreview on ready as original did
    try {
      window.configuratorpreview && window.configuratorpreview();
    } catch (err) {
      // ignore
    }
    this.loadingafter = false;
  }

  ngOnDestroy(): void {
    // remove event listeners
    if (this.resizeListener) this.resizeListener();
    if (this.bodyClickListener) document.body.removeEventListener('click', this.bodyClickListener);

    // unbind window globals we added
    this.unbindGlobals();
  }

   @HostListener('window:resize')
   setPanelWidth() {
    if (window.innerWidth <= 768) {
     const panels = document.querySelectorAll('.panel');
     const baseWidth = 200;
     const w = baseWidth / this.chosen_no_of_panels ;
     panels.forEach(p => (p as HTMLElement).style.minWidth = `${w}px`);
    }else{
    const panels = document.querySelectorAll('.panel');
     const baseWidth = 330;
     const w = baseWidth / this.chosen_no_of_panels ;
     panels.forEach(p => (p as HTMLElement).style.minWidth = `${w}px`);
    }
  }

  // -------------------------
  // Utility helpers (DOM helpers to replace jQuery)
  // -------------------------
  private q(selector: string): HTMLElement | null {
    return document.querySelector(selector);
  }

  private qAll<T extends HTMLElement = HTMLElement>(selector: string): T[] {
    return Array.from(document.querySelectorAll(selector)) as T[];
  }

  private qValue(selector: string): string | null {
    const el = document.querySelector(selector) as HTMLInputElement | null;
    return el ? el.value : null;
  }

  private outerWidth(el: Element | null): number {
    if (!el) return 0;
    const rect = (el as HTMLElement).getBoundingClientRect();
    return rect.width;
  }

  private innerHeight(el: Element | null): number {
    if (!el) return 0;
    return (el as HTMLElement).clientHeight;
  }

  private isVisible(el: Element | null): boolean {
    if (!el) return false;
    return (el as HTMLElement).offsetParent !== null;
  }

  private css(el: HTMLElement | null, prop: string, value: string): void {
    if (!el) return;
    (el.style as any)[prop] = value;
  }

  // -------------------------
  // Bind/unbind global functions
  // -------------------------
  private bindGlobals(): void {
    window.configuratorpreview = this.configuratorpreview.bind(this);
    window.resizeimagepreview = this.resizeimagepreview.bind(this);
    window.midpane = this.midpane.bind(this);
    window.update_Panel = this.update_Panel.bind(this);
    window.updatePanel = this.updatePanel.bind(this);
    window.slatsize = this.slatsize.bind(this);
    window.tiltrod = this.tiltrod.bind(this);
    window.pushrod = this.pushrod.bind(this);
    window.change_color = this.change_color.bind(this);
    window.changecolor = this.changecolor.bind(this);
    window.change_hinge_color = this.change_hinge_color.bind(this);
    window.changehingecolor = this.changehingecolor.bind(this);
    window.get_rgb = this.get_rgb.bind(this);
    window.getBase64Image = this.getBase64Image.bind(this);
    window.convert_canvas = this.convert_canvas.bind(this);
    window.getAverageRGB = this.getAverageRGB.bind(this);
  }

  private unbindGlobals(): void {
    delete window.configuratorpreview;
    delete window.resizeimagepreview;
    delete window.midpane;
    delete window.update_Panel;
    delete window.updatePanel;
    delete window.slatsize;
    delete window.tiltrod;
    delete window.pushrod;
    delete window.change_color;
    delete window.changecolor;
    delete window.change_hinge_color;
    delete window.changehingecolor;
    delete window.get_rgb;
    delete window.getBase64Image;
    delete window.convert_canvas;
    delete window.getAverageRGB;
  }

  // -------------------------
  // Initial 'st' wiring (from DOMContentLoaded parts)
  // -------------------------
  private setupInitialSt(): void {
    try {
      this.st.flap = this.q('#flap');
      this.st.toggle = this.q('.toggle_slats');
      this.st.choice1 = this.q('#choice1') as HTMLInputElement | null;
      this.st.choice2 = this.q('#choice2') as HTMLInputElement | null;
      if (this.st.flap && this.st.toggle) {
        this.st.flap.addEventListener('transitionend', () => {
          if (this.st.choice1 && (this.st.choice1 as HTMLInputElement).checked) {
            (this.st.toggle as HTMLElement).style.transform = 'rotateY(-15deg)';
            setTimeout(() => (this.st.toggle as HTMLElement).style.transform = '', 400);
          } else {
            (this.st.toggle as HTMLElement).style.transform = 'rotateY(15deg)';
            setTimeout(() => (this.st.toggle as HTMLElement).style.transform = '', 400);
          }
        });
      }

      if (this.st.flap && this.st.choice2 && this.st.choice2.nextElementSibling) {
        const txt = (this.st.choice2.nextElementSibling as HTMLElement).textContent || '';
        if (this.st.flap.children[0]) (this.st.flap.children[0] as HTMLElement).textContent = txt;
      }
    } catch (e) {
      // ignore
    }
  }

  // -------------------------
  // Converted functions from configurator.js
  // -------------------------
  configuratorpreview(): void {
    const select_color_image = this.qValue('#select_color_image');
    if (!this.isValidImageURL(select_color_image)) {
      this.qAll('.configurator-preview').forEach(el => (el as HTMLElement).style.display = 'none');
    } else {
      this.qAll('.configurator-preview').forEach(el => (el as HTMLElement).style.display = '');
      this.resizeimagepreview();
    }
    if ((window as any).tierontier == 1) {
      // this.qAll('.configurator-preview').forEach(el => (el as HTMLElement).style.display = 'none');
    }
  }

  isValidImageURL(str: any): boolean {
    if (typeof str !== 'string') return false;
    return !!str.match(/\w+\.(jpg|jpeg|gif|webp|png|tiff|bmp)$/gi);
  }

  resizeimagepreview(): void {
    // panels container width
    const panel = this.q('.panel') as HTMLElement | null;
    if (!panel) return;
    const panels = this.qAll('.panels');
    // const panelscontainer_width = panel.getBoundingClientRect().width;
    // panels.forEach(p => (p as HTMLElement).style.width = `${panelscontainer_width}px`);
    panels.forEach(p => (p as HTMLElement).style.width = `auto`);

    // slats-pushrod height sync
    this.qAll('.slats-pushrod').forEach(sp => {
      const innerH = this.innerHeight(sp);
      const push = sp.querySelector('.pushrod') as HTMLElement | null;
      const pushOff = sp.querySelector('.pushrod-offset') as HTMLElement | null;
      if (push) push.style.height = `${innerH}px`;
      if (pushOff) pushOff.style.height = `${innerH}px`;
    });

    const select_color = this.qValue('#select_color');
    const select_color_image = this.qValue('#select_color_image');
    this.change_color(select_color || '', select_color_image || '');

    const t = this.q('.page-template-full-width-wrapper') as HTMLElement | null;
    if (!t) return;
    const a = t.querySelector('.panels') as HTMLElement | null;
    if (!a) return;

    const o = this.g(t);
    const n = 0.5 * window.innerHeight;
    const i = this.outerWidth(a);
    let s = 0;
    this.qAll('.scalingWrapper').forEach(() => {
      const sh = this.q('#shutterspreview') as HTMLElement | null;
      s += sh ? (sh as HTMLElement).getBoundingClientRect().height : 0;
    });

    let r: number | undefined;
    const l = s - n;
    const d = i - o;
    const width_dec = (window.innerWidth > 0) ? window.innerWidth : (screen ? (screen.width || 0) : 0);
    if (width_dec < 550) {
      if (l > d && s > n) r = n / s;
      else if (l <= d && i > o) r = o / i;
      if (!r) r = 1;
      this.qAll('.panels-container').forEach(pc => {
        (pc as HTMLElement).style.transform = `scale(${r})`;
      });
    } else {
      if (l > d && s > n) r = n / i;
      else if (l <= d && i > o) r = o / i;
      r = 1;
      this.qAll('.panels-container').forEach(pc => (pc as HTMLElement).style.transform = `scale(${r})`);
    }

    const c = Math.ceil(s * ((r || 1) + 0.03));
    const p = Math.ceil(i * (r || 1));
    this.qAll('.preview').forEach(pre => (pre as HTMLElement).style.height = `${c}px`);

    const visible = this.qAll('.configurator-preview').filter(el => this.isVisible(el));
    const lastVisible = visible.length ? visible[visible.length - 1] : null;
    const u = lastVisible ? (lastVisible as HTMLElement).clientWidth : 0;
    const f = Math.ceil((u - p) / 2);
    const finalF = f > 0 ? f : 0;
    this.qAll('.panels').forEach(pl => (pl as HTMLElement).style.marginLeft = `${finalF}px`);
  }

  private g(context: Element | null): number {
    const cfgPreview = this.q('.configurator-preview') as HTMLElement | null;
    if (!cfgPreview) return 0;
    const style = window.getComputedStyle(cfgPreview);
    const width = cfgPreview.clientWidth -
      parseInt(style.paddingLeft || '0', 10) -
      parseInt(style.paddingRight || '0', 10);
    return width;
  }

  midpane(midrail: any, slastsize: any): void {
    let html = '';
    const slastsizeNum = Number(slastsize) || 0;
    const slate_height = slastsizeNum / 2;
    const minheightBase = 20 + parseFloat(String(slate_height || 0));
    let paneSection = 20;
    const shuttertype = this.qValue('#set_shuttertype') || '';
    const n1 = shuttertype.toLowerCase().indexOf('half');
    const n2 = shuttertype.toLowerCase().indexOf('tier');
    const n3 = shuttertype.toLowerCase().indexOf('full solid');
    if (n1 > -1 || n2 > -1) {
      midrail = 0;
      paneSection = 20;
    }

    const midrailNum = Number(midrail) || 0;

    if (midrailNum > 0) {
      if (midrailNum === 1) {
        if (n3 > -1) {
          const midrail_adj = midrailNum + 1;
          let midrail_height = 30 * 1;
          midrail_height = 400 - midrail_height;
          const minheightCalc = (midrail_height / midrail_adj);
          html += `<div class="paneSection raisedPanel" style="min-height: ${minheightCalc}px;"></div>`;
          html += this.midRail_html();
          html += `<div class="paneSection raisedPanel" style="min-height: ${minheightCalc}px;"></div>`;
        } else {
          const slastLocal = slastsizeNum / 2;
          html += this.panesectionli(10, minheightBase, slastLocal);
          html += this.midRail_html();
          html += this.panesectionli(8, minheightBase, slastLocal);
        }
      } else if (midrailNum === 2) {
        if (n3 > -1) {
          const midrail_adj = midrailNum + 1;
          let midrail_height = 30 * 2;
          midrail_height = 400 - midrail_height;
          const minheightCalc = (midrail_height / midrail_adj);
          html += `<div class="paneSection raisedPanel" style="min-height: ${minheightCalc}px;"></div>`;
          html += this.midRail_html();
          html += `<div class="paneSection raisedPanel" style="min-height: ${minheightCalc}px;"></div>`;
          html += this.midRail_html();
          html += `<div class="paneSection raisedPanel" style="min-height: ${minheightCalc}px;"></div>`;
        } else {
          const slastLocal = slastsizeNum / 3;
          html += this.panesectionli(5, minheightBase, slastLocal);
          html += this.midRail_html();
          html += this.panesectionli(5, minheightBase, '');
          html += this.midRail_html();
          html += this.panesectionli(5, minheightBase, slastLocal);
        }
      } else if (midrailNum === 3) {
        if (n3 > -1) {
          const midrail_adj = midrailNum + 1;
          let midrail_height = 30 * 3;
          midrail_height = 400 - midrail_height;
          const minheightCalc = (midrail_height / midrail_adj);
          html += `<div class="paneSection raisedPanel" style="min-height: ${minheightCalc}px;"></div>`;
          html += this.midRail_html();
          html += `<div class="paneSection raisedPanel" style="min-height: ${minheightCalc}px;"></div>`;
          html += this.midRail_html();
          html += `<div class="paneSection raisedPanel" style="min-height: ${minheightCalc}px;"></div>`;
          html += this.midRail_html();
          html += `<div class="paneSection raisedPanel" style="min-height: ${minheightCalc}px;"></div>`;
        } else {
          const slastLocal = slastsizeNum / 4;
          html += this.panesectionli(5, minheightBase, slastLocal);
          html += this.midRail_html();
          html += this.panesectionli(3, minheightBase, slastLocal);
          html += this.midRail_html();
          html += this.panesectionli(3, minheightBase, '');
          html += this.midRail_html();
          html += this.panesectionli(5, minheightBase, slastLocal);
        }
      } else if (midrailNum === 4) {
        if (n3 > -1) {
          const midrail_adj = midrailNum + 1;
          let midrail_height = 30 * 4;
          midrail_height = 400 - midrail_height;
          const minheightCalc = (midrail_height / midrail_adj);
          html += `<div class="paneSection raisedPanel" style="min-height: ${minheightCalc}px;"></div>`;
          html += this.midRail_html();
          html += `<div class="paneSection raisedPanel" style="min-height: ${minheightCalc}px;"></div>`;
          html += this.midRail_html();
          html += `<div class="paneSection raisedPanel" style="min-height: ${minheightCalc}px;"></div>`;
          html += this.midRail_html();
          html += `<div class="paneSection raisedPanel" style="min-height: ${minheightCalc}px;"></div>`;
          html += this.midRail_html();
          html += `<div class="paneSection raisedPanel" style="min-height: ${minheightCalc}px;"></div>`;
        } else {
          const slastLocal = slastsizeNum / 5;
          html += this.panesectionli(4, minheightBase, slastLocal);
          html += this.midRail_html();
          html += this.panesectionli(3, minheightBase, slastLocal);
          html += this.midRail_html();
          html += this.panesectionli(3, minheightBase, slastLocal);
          html += this.midRail_html();
          html += this.panesectionli(3, minheightBase, slastLocal);
          html += this.midRail_html();
          html += this.panesectionli(4, minheightBase, slastLocal);
        }
      } else if (midrailNum === 5) {
        if (n3 > -1) {
          const midrail_adj = midrailNum + 1;
          let midrail_height = 30 * 5;
          midrail_height = 400 - midrail_height;
          const minheightCalc = (midrail_height / midrail_adj);
          html += `<div class="paneSection raisedPanel" style="min-height: ${minheightCalc}px;"></div>`;
          html += this.midRail_html();
          html += `<div class="paneSection raisedPanel" style="min-height: ${minheightCalc}px;"></div>`;
          html += this.midRail_html();
          html += `<div class="paneSection raisedPanel" style="min-height: ${minheightCalc}px;"></div>`;
          html += this.midRail_html();
          html += `<div class="paneSection raisedPanel" style="min-height: ${minheightCalc}px;"></div>`;
          html += this.midRail_html();
          html += `<div class="paneSection raisedPanel" style="min-height: ${minheightCalc}px;"></div>`;
          html += this.midRail_html();
          html += `<div class="paneSection raisedPanel" style="min-height: ${minheightCalc}px;"></div>`;
        } else {
          const slastLocal = slastsizeNum / 5;
          html += this.panesectionli(3, minheightBase, slastLocal);
          html += this.midRail_html();
          html += this.panesectionli(2, minheightBase, slastLocal);
          html += this.midRail_html();
          html += this.panesectionli(2, minheightBase, slastLocal);
          html += this.midRail_html();
          html += this.panesectionli(2, minheightBase, slastLocal);
          html += this.midRail_html();
          html += this.panesectionli(2, minheightBase, slastLocal);
          html += this.midRail_html();
          html += this.panesectionli(3, minheightBase, slastLocal);
        }
      }

      this.qAll('.midpane-fill').forEach(el => (el as HTMLElement).innerHTML = html);
    } else {
      // midrail == 0
      if (n2 > -1) {
        this.tierontier();
      } else if (n3 > -1) {
        html += `<div class="paneSection raisedPanel" style="min-height: 400px;"></div>`;
        this.qAll('.midpane-fill').forEach(el => (el as HTMLElement).innerHTML = html);
      } else {
        html += this.panesectionli(paneSection, minheightBase, slastsizeNum);
        this.qAll('.midpane-fill').forEach(el => (el as HTMLElement).innerHTML = html);

        if (n1 > -1) {
          html = '<div class="midRail">';
          html += '<span class="rail-bg" style="min-height: 30px; height: 30px;"></span>';
          html += '<span class="mouseHole-bottom"></span>';
          html += '</div>';
          html += '<div class="paneSection raisedPanel" style="min-height: 100.2px;"></div>';
          this.qAll('.slats-pushrod').forEach(el => {
            (el as HTMLElement).insertAdjacentHTML('afterend', html);
          });
        }
      }
    }
  }

  odd(n: number): boolean {
    return n % 2 === 0;
  }

  tierontier(): void {
    let html = '';
    let NumberOfPanels = parseInt(String(this.qValue('.NumberOfPanels') || '0'), 10);
    if (NumberOfPanels === 1 || NumberOfPanels % 3 === 0) {
      NumberOfPanels = NumberOfPanels + 1;
    }
    let slastsize: any = this.qValue('.SlatWidth') || '0';
    if (slastsize === undefined) slastsize = '0';
    const minheight = 20 + parseFloat(String(slastsize || 0));

    if (this.odd(NumberOfPanels) === true) {
      slastsize = parseInt(String(slastsize || '0'), 10);
      let div_noofpanel = '';
      let panel_minwidth = '330px';
      if (NumberOfPanels === 2) {
        div_noofpanel = String(NumberOfPanels / NumberOfPanels);
      } else {
        div_noofpanel = String(NumberOfPanels / 2);
        panel_minwidth = `${330 / (Number(Number(div_noofpanel) || 1))}px`;
      }
      let inside_html = '';
      const divNo = Number(div_noofpanel) || 1;
      for (let i = 0; i < divNo; i++) {
        inside_html += `<div class="panel" style="min-width:${panel_minwidth}"><div class="midpane"><div class="topRail"><span class="rail-bg" style="min-height: 30px; height: 30px;"></span><span class="mouseHole-top"></span></div><div class="midpane-fill">${this.panesectionli(18, minheight, slastsize)}</div><div class="bottomRail"><span class="rail-bg" style="min-height: 30px; height: 30px;"></span><span class="mouseHole-bottom" style="display:unset;"></span></div></div></div>`;
      }
      let panelsHtml1 = `<div class="panels">${inside_html}</div>`;

      inside_html = '';
      for (let i = 0; i < divNo; i++) {
        inside_html += `<div class="panel" style="min-width:${panel_minwidth}"><div class="midpane"><div class="topRail"><span class="rail-bg" style="min-height: 30px; height: 30px;"></span><span class="mouseHole-top"></span></div><div class="midpane-fill">${this.panesectionli(6, minheight, slastsize)}</div><div class="bottomRail"><span class="rail-bg" style="min-height: 30px; height: 30px;"></span><span class="mouseHole-bottom" style="display:unset;"></span></div></div></div>`;
      }
      let panelsHtml2 = `<div class="panels">${inside_html}</div>`;
      const container = this.q('.panels-container') as HTMLElement | null;
      if (container) container.innerHTML = panelsHtml1 + panelsHtml2;

      // toggle hinge classes
      this.qAll('.panel').forEach(el => el.classList.toggle('hingeLeft', !(NumberOfPanels > 2)));
      this.qAll('.panel').forEach(el => el.classList.toggle('panel--hinge-left', !(NumberOfPanels > 2)));

      this.qAll('.panels+.panels').forEach(el => (el as HTMLElement).style.clear = 'both');
      this.qAll('.panels').forEach(el => (el as HTMLElement).style.float = 'left');

      (window as any).tierontier = '';
    } else {
      console.log('Something went wrong. Please refresh the page and try again.');
      (window as any).tierontier = 1;
    }
  }

  midRail_html(): string {
    let html = '<div class="midRail">';
    html += '<span class="rail-bg" style="min-height: 30px; height: 30px;"></span>';
    html += '<span class="mouseHole-bottom"></span>';
    html += '<span class="mouseHole-top"></span>';
    html += '</div>';
    return html;
  }

  panesectionli(count: number, minheight: number, slastsize: any): string {
    let html = '';
    if(0 === this.shutter_type_name.toLowerCase().indexOf('tier') && 18 == count){
      count = 14;
    }
    let li_list_count = Math.abs(count - Number(slastsize || 0));
    if(0 === this.shutter_type_name.toLowerCase().indexOf('half') ){
      li_list_count = 15;
    }
    html += '<div class="slats-pushrod">';
    html += '<ul class="paneSection slats">';
    for (let i = 0; i < li_list_count; i++) {
      html += `<li><span style="min-height: ${minheight}px; padding: 0px; margin: 0px;"></span></li>`;
    }
    html += '</ul>';
    html += '<div class="pushrod"></div>';
    html += '</div>';
    return html;
  }

  midRail(thisval: any): void {
    const midrail = (thisval && (thisval.getAttribute ? thisval.getAttribute('data-value') : thisval)) || null;
    if (midrail === null) return;
    this.qAll<HTMLInputElement>('.midrails').forEach(el => el.value = String(midrail));
    const slastsize = this.qValue('.SlatWidth') || 0;
    this.midpane(midrail, slastsize);
    const PushRod = this.qValue('.tiltrod');
    this.tiltrod(PushRod);
    this.resizeimagepreview();
  }
  slats(slat: string): void {
    this.qAll('.midpane-fill').forEach(el => el.classList.remove('slats-close'));
    if (slat === 'close') {
      this.qAll('.midpane-fill').forEach(el => el.classList.add('slats-close'));
      const first = document.querySelector('.slats-close .slats li:first-child span') as HTMLElement | null;
      if (first) first.style.boxShadow = 'rgb(5 5 5 / 15%) 0.1em 0.1em 0.1em inset, rgb(5 5 5 / 15%) 0px 8px 10px inset';
    }
  }

  update_Panel(panel: number): void {
    const shuttertype = this.qValue('#set_shuttertype') || '';
    if ((shuttertype || '').toLowerCase().indexOf('tier') > -1) {
      this.tierontier();
      this.resizeimagepreview();
      return;
    }

    // remove panels beyond first
    const panelsList = this.qAll('.panel');
    for (let i = panelsList.length - 1; i >= 0; i--) {
      if (i > 0) panelsList[i].remove();
    }

    if (panel > 1) {
      this.qAll('.panel').forEach(el => el.classList.remove('hingeLeft', 'panel--hinge-left'));
    } else {
      this.qAll('.panel').forEach(el => el.classList.add('hingeLeft', 'panel--hinge-left'));
    }

    const panelsElem = this.q('.panels') as HTMLElement | null;
    if (!panelsElem) return;
    const panel_html = panelsElem.innerHTML || '';
    let panels_width = 330;
    for (let i = 1; i < panel; i++) {
      panelsElem.insertAdjacentHTML('beforeend', panel_html);
    }
    if(window.innerWidth <= 768){
      panels_width = panel > 1 ? 200 : 250;
    }
    if (panel > 1) {
      panels_width = Math.floor(panels_width / panel);
      this.qAll('.panel').forEach(pe => (pe as HTMLElement).style.minWidth = `${panels_width}px`);
    } else {
      this.qAll('.panel').forEach(pe => (pe as HTMLElement).style.minWidth = `${panels_width}px`);
    }
    this.resizeimagepreview();
  }

  updatePanel(thisval: any): void {
    const panel = thisval && thisval.getAttribute ? thisval.getAttribute('data-value') : null;
    if (!panel) return;
    this.qAll<HTMLInputElement>('.NumberOfPanels').forEach(el => el.value = panel);
    this.update_Panel(Number(panel));
  }

  slatsize(thisval: any): void {
    const slastsize = thisval && thisval.getAttribute ? thisval.getAttribute('data-value') : null;
    if (!slastsize) return;
    this.qAll('.js-slatSize').forEach(el => el.classList.remove('is-selected'));
    if (thisval.classList) thisval.classList.add('is-selected');
    this.qAll<HTMLInputElement>('.SlatWidth').forEach(el => el.value = String(slastsize));
    const midrails = this.qValue('.midrails') || 0;
    this.midpane(midrails, slastsize);
    const PushRod = this.qValue('.tiltrod') || '';
    this.tiltrod(PushRod);
    this.resizeimagepreview();
  }

  tiltrod(getvalue: any): void {
    if (typeof getvalue === 'undefined' || getvalue === null) getvalue = '';
    const shuttertype = this.qValue('#set_shuttertype') || '';
    if ((shuttertype || '').toLowerCase().indexOf('full solid') > -1) {
      getvalue = 'hidden';
    }
    this.qAll<HTMLInputElement>('.tiltrod').forEach(el => el.value = String(getvalue));
    // show defaults
    this.qAll('.pushrod, .pushrod-offset, .mouseHole-top, .mouseHole-top-offset, .mouseHole-bottom').forEach(el => {
      (el as HTMLElement).style.display = '';
    });

    if (getvalue === 'central') {
      this.qAll('.slats-pushrod div').forEach(div => {
        div.classList.remove('pushrod-offset');
        div.classList.add('pushrod');
      });
      this.qAll('.topRail span:nth-child(2)').forEach(sp => {
        sp.classList.remove('mouseHole-top-offset');
        sp.classList.add('mouseHole-top');
      });
      this.qAll('.midRail span:nth-child(3)').forEach(sp => {
        sp.classList.remove('mouseHole-top-offset');
        sp.classList.add('mouseHole-top');
      });
    } else if (getvalue === 'offset') {
      this.qAll('.slats-pushrod div').forEach(div => {
        div.classList.remove('pushrod');
        div.classList.add('pushrod-offset');
      });
      this.qAll('.topRail span:nth-child(2)').forEach(sp => {
        sp.classList.remove('mouseHole-top');
        sp.classList.add('mouseHole-top-offset');
      });
      this.qAll('.midRail span:nth-child(3)').forEach(sp => {
        sp.classList.remove('mouseHole-top');
        sp.classList.add('mouseHole-top-offset');
      });
    } else if (getvalue === 'hidden') {
      this.qAll('.mouseHole-top, .mouseHole-top-offset').forEach(el => (el as HTMLElement).style.display = 'none');
      this.qAll('.slats-pushrod div.pushrod').forEach(el => (el as HTMLElement).style.display = 'none');
      this.qAll('.slats-pushrod div.pushrod-offset').forEach(el => (el as HTMLElement).style.display = 'none');
      this.qAll('.mouseHole-bottom').forEach(el => (el as HTMLElement).style.display = 'none');
    } else {
      // default cleanup
      this.qAll('.topRail span:nth-child(2)').forEach(sp => {
        if (sp.classList.contains('mouseHole-top-offset')) {
          sp.classList.remove('mouseHole-top-offset');
          sp.classList.add('mouseHole-top');
        }
      });
      this.qAll('.midRail span:nth-child(3)').forEach(sp => {
        if (sp.classList.contains('mouseHole-top-offset')) {
          sp.classList.remove('mouseHole-top-offset');
          sp.classList.add('mouseHole-top');
        }
      });
      this.qAll('.slats-pushrod div.pushrod, .slats-pushrod div.pushrod-offset').forEach(el => {
        (el as HTMLElement).style.display = 'none';
      });
    }
  }

  pushrod(thisval: any): void {
    const getvalue = thisval && thisval.getAttribute ? thisval.getAttribute('data-value') : '';
    this.qAll('.js-tiltrod').forEach(el => el.classList.remove('is-selected'));
    if (thisval.classList) thisval.classList.add('is-selected');
    const get_value = (getvalue || '').toLowerCase();
    this.tiltrod(get_value);
  }

  change_color(color: string | null, imageurl: string | null): void {
    const colorVal = color || '';
    const imageUrlVal = imageurl || '';
    const selectColor = this.q('#select_color') as HTMLInputElement | null;
    const selectColorImage = this.q('#select_color_image') as HTMLInputElement | null;
    const previewImg = this.q('#preview-image') as HTMLImageElement | null;
    if (selectColor) selectColor.value = colorVal;
    if (selectColorImage) selectColorImage.value = imageUrlVal;
    if (previewImg && imageUrlVal) previewImg.src = imageUrlVal;

    this.qAll('.panel').forEach(panel => {
      const p = panel as HTMLElement;
      p.style.backgroundImage = `url(${imageUrlVal}),url(${imageUrlVal})`;
      p.style.backgroundPositionX = 'right, left';
      p.style.backgroundPositionY = 'top, top';
      p.style.backgroundRepeat = 'no-repeat, repeat';
      p.style.backgroundSize = '16px';
    });

    this.qAll('.midRail').forEach(mr => (mr as HTMLElement).style.background = `url(${imageUrlVal}) no-repeat bottom left,url(${imageUrlVal}) no-repeat bottom right`);
    this.qAll('.midRail .rail-bg').forEach(rb => (rb as HTMLElement).style.background = `url(${imageUrlVal}) no-repeat bottom center`);
    this.qAll('.pushrod, .pushrod-offset').forEach(pr => (pr as HTMLElement).style.background = `url(${imageUrlVal}) repeat-y`);
    this.qAll('.topRail').forEach(tr => (tr as HTMLElement).style.background = `url(${imageUrlVal}) no-repeat bottom left,url(${imageUrlVal}) no-repeat bottom right`);
    this.qAll('.topRail .rail-bg').forEach(rbg => (rbg as HTMLElement).style.background = `url(${imageUrlVal}) no-repeat bottom center`);
    this.qAll('.slats li span').forEach(s => (s as HTMLElement).style.background = `url(${imageUrlVal})`);
    this.qAll('.bottomRail').forEach(br => (br as HTMLElement).style.background = `url(${imageUrlVal}) no-repeat bottom left,url(${imageUrlVal}) no-repeat bottom right`);
    this.qAll('.bottomRail .rail-bg').forEach(rb => (rb as HTMLElement).style.background = `url(${imageUrlVal}) no-repeat bottom center`);

    this.qAll('.topRail, .bottomRail, .midRail').forEach(el => {
      const e = el as HTMLElement;
      (e.style as any).borderWidth = '0px 1px';
      (e.style as any).borderStyle = 'unset';
      (e.style as any).borderColor = '#03030380';
    });

    this.qAll('.panel').forEach(p => {
      (p as HTMLElement).style.borderLeftWidth = '0px';
      (p as HTMLElement).style.borderRightWidth = '0px';
    });

    this.qAll('.pushrod, .pushrod-offset').forEach(el => {
      (el as HTMLElement).style.boxShadow = 'rgb(5 5 5 / 8%) 0.1em 0.1em 0.1em inset, rgb(0 0 0 / 8%) -1px -1px 1px inset';
    });

    if (this.q('.midpane-fill')?.classList.contains('slats-close')) {
      this.qAll('.slats li span').forEach(s => (s as HTMLElement).style.boxShadow = 'rgb(5 5 5 / 15%) 0.1em 0.1em 0.1em inset, rgb(0 0 0 / 15%) 0px 8px 10px inset');
      const first = document.querySelector('.slats li:first-child span') as HTMLElement | null;
      if (first) first.style.boxShadow = 'rgb(5 5 5 / 15%) 0.1em 0.1em 0.1em inset, rgb(5 5 5 / 15%) 0px 8px 10px  inset';
    } else {
      this.qAll('.slats li span').forEach(s => (s as HTMLElement).style.boxShadow = 'rgb(5 5 5 / 15%) 0.1em 0.1em 0.1em inset, rgb(0 0 0 / 15%) 0px 8px 10px inset');
    }

    const n1 = (this.qValue('#set_shuttertype') || '').toLowerCase().indexOf('half');
    const n2 = (this.qValue('#set_shuttertype') || '').toLowerCase().indexOf('full solid');
    if (n1 > -1 || n2 > -1) {
      this.qAll('.raisedPanel').forEach(rp => {
        const e = rp as HTMLElement;
        e.style.background = `url(${imageUrlVal}) no-repeat top left`;
        e.style.backgroundSize = '100% 100%';
        (e.style as any).filter = 'blur(5px)';
      });
    }
  }

  changecolor(thisval: any): void {
    const color = thisval.getAttribute ? thisval.getAttribute('data-colorname') : '';
    const imageurl = thisval.getAttribute ? thisval.getAttribute('data-img') : '';
    const select_imgid = thisval.getAttribute ? thisval.getAttribute('data-id') : '';
    const selectImgEl = this.q('#select_imgid') as HTMLInputElement | null;
    if (selectImgEl) selectImgEl.value = select_imgid || '';
    this.qAll('.js-config-color').forEach(el => el.classList.remove('is-selected'));
    if (thisval.classList) thisval.classList.add('is-selected');
    this.change_color(color || '', imageurl || '');
  }

  change_hinge_color(imageurl: string): void {
    const sel = this.q('.select_hingecolor_image') as HTMLInputElement | null;
    if (sel) sel.value = imageurl || '';
    const headstyle = document.getElementById('headstyle');
    if (!headstyle) return;
    headstyle.innerHTML = '';
    headstyle.innerHTML = `<style>.shutters-configurator .configurator-preview .panel:last-child:after, .shutters-configurator .configurator-preview .panel:last-child:before, .shutters-configurator .configurator-preview .panel:first-child:after, .shutters-configurator .configurator-preview .panel:first-child:before{background:url(${imageurl}) no-repeat}</style>`;
  }

  changehingecolor(thisval: any): void {
    const imageurl = thisval.getAttribute ? thisval.getAttribute('data-img') : '';
    this.change_hinge_color(imageurl || '');
  }

  get_rgb(id: any): void {
    const img = document.getElementById(`imgid_${id}`) as HTMLImageElement | null;
    if (!img) return;
    this.getBase64Image(img);
    setTimeout(() => {
      const r = Array.from(document.getElementsByClassName('image_class')) as HTMLImageElement[];
      const rgbArray: any[] = [];
      for (let p = 0; p < r.length; p++) {
        rgbArray.push(this.getAverageRGB(r[p]));
      }
      rgbArray.forEach((el, i) => {
        if (el.r !== 0 || el.g !== 0 || el.b !== 0) {
          this.qAll('.slats li span').forEach(s => {
            (s as HTMLElement).style.background = 'none';
            (s as HTMLElement).style.backgroundColor = `rgb(${el.r},${el.g},${el.b})`;
          });
        }
        const r_c = el.r - 50;
        const g_c = el.g - 50;
        const b_c = el.b - 50;
        this.qAll('.topRail, .bottomRail, .midRail, .panel').forEach(e => {
          (e as HTMLElement).style.borderColor = `rgb(${r_c},${g_c},${b_c})`;
        });
      });
    }, 300);
  }

  getBase64Image(img: HTMLImageElement): void {
    const canvas = document.createElement('canvas');
    (img as any).crossOrigin = 'anonymous';
    canvas.width = img.width;
    canvas.height = img.height;
    setTimeout(() => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      try {
        ctx.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL('image/png');
        this.qAll('.image_class').forEach(ic => (ic as HTMLImageElement).src = dataURL);
      } catch (e) {
        // cross-origin or security error
      }
    }, 150);
  }

  convert_canvas(id_div: string): string {
    const node = document.getElementById(id_div);
    if (!node) return 'no';
    const canvas = document.createElement('canvas');
    canvas.width = node.scrollWidth;
    canvas.height = node.scrollHeight;
    const domtoimage = (window as any).domtoimage;
    if (domtoimage && typeof domtoimage.toJpeg === 'function') {
      domtoimage.toJpeg(node).then((pngDataUrl: string) => {
        const img = new Image();
        img.onload = () => {
          const context = canvas.getContext('2d');
          if (!context) return;
          context.drawImage(img, 0, 0);
        };
        img.src = pngDataUrl;
        const imagepathInput = this.q('#imagepath') as HTMLInputElement | null;
        if (imagepathInput) imagepathInput.value = pngDataUrl;
      }).catch(() => { /* ignore */ });
      return 'yes';
    }
    return 'no';
  }

  getAverageRGB(imgEl: HTMLImageElement): { r: number; g: number; b: number } {
    const blockSize = 5;
    const defaultRGB = { r: 0, g: 0, b: 0 };
    const canvas = document.createElement('canvas');
    const context = canvas.getContext && canvas.getContext('2d');
    if (!context) return defaultRGB;
    const height = canvas.height = imgEl.naturalHeight || imgEl.offsetHeight || (imgEl.height || 0);
    const width = canvas.width = imgEl.naturalWidth || imgEl.offsetWidth || (imgEl.width || 0);
    context.drawImage(imgEl, 0, 0);
    let data;
    try {
      data = context.getImageData(0, 0, width, height);
    } catch (e) {
      return defaultRGB;
    }
    let i = -4;
    let length = data.data.length;
    const rgb = { r: 0, g: 0, b: 0 };
    let count = 0;
    while ((i += blockSize * 4) < length) {
      ++count;
      rgb.r += data.data[i];
      rgb.g += data.data[i + 1];
      rgb.b += data.data[i + 2];
    }
    rgb.r = ~~(rgb.r / count);
    rgb.g = ~~(rgb.g / count);
    rgb.b = ~~(rgb.b / count);
    return rgb;
  }
}
