// src/app/configurator/configurator.service.ts
import { Injectable, Inject, NgZone, OnDestroy, Renderer2, RendererFactory2 } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConfiguratorService implements OnDestroy {
  private renderer: Renderer2;
  private isBrowser = false;
  private resizeHandler?: () => void;
  private bodyClickHandler?: (e: Event) => void;
  private domContentLoadedHandler?: () => void;
  private secondDomLoadedHandler?: () => void;
  private loadingafter = false;

  // internal state that original file used via st object
  private st: any = {};

  constructor(
    rendererFactory: RendererFactory2,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.renderer = rendererFactory.createRenderer(null, null);
    this.isBrowser = isPlatformBrowser(platformId);
  }

  // ---------------------------
  // Public init/destroy
  // ---------------------------
  init(): void {
    if (!this.isBrowser) return;

    // Add DOMContentLoaded handlers (converted from original two events)
    this.domContentLoadedHandler = () => this.setupInitialDOM();
    this.secondDomLoadedHandler = () => this.setupInitialFlapText();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', this.domContentLoadedHandler);
      document.addEventListener('DOMContentLoaded', this.secondDomLoadedHandler);
    } else {
      // already loaded: run immediately
      this.setupInitialDOM();
      this.setupInitialFlapText();
    }

    // attach window resize listener (original used jQuery(window).resize)
    this.resizeHandler = () => {
      const select_color_image = (document.querySelector('#select_color_image') as HTMLInputElement)?.value;
      if (select_color_image !== undefined && select_color_image !== null && select_color_image !== '') {
        this.resizeimagepreview();
      }
    };
    window.addEventListener('resize', this.resizeHandler);

    // body click handler that triggers configuratorpreview on certain clicks
    this.bodyClickHandler = (e: Event) => {
      const target = e.target as HTMLElement;
      const get_sel_id = target?.id || '';
      if (get_sel_id.toLowerCase().indexOf('radio_') > -1 || target.closest('.no_of_panels_elements')) {
        this.configuratorpreview();
      }
    };
    document.body.addEventListener('click', this.bodyClickHandler);

    // emulate switch(document.readyState) block from original to call configuratorpreview
    // Note: original set loadingafter false/true - we'll call configuratorpreview() once here.
    try {
      this.configuratorpreview();
      this.loadingafter = false;
    } catch (e) {
      // ignore
    }
  }

  destroy(): void {
    if (!this.isBrowser) return;
    if (this.resizeHandler) window.removeEventListener('resize', this.resizeHandler);
    if (this.bodyClickHandler) document.body.removeEventListener('click', this.bodyClickHandler);
    if (this.domContentLoadedHandler) document.removeEventListener('DOMContentLoaded', this.domContentLoadedHandler);
    if (this.secondDomLoadedHandler) document.removeEventListener('DOMContentLoaded', this.secondDomLoadedHandler);
  }

  ngOnDestroy(): void {
    this.destroy();
  }

  // ---------------------------
  // Initial DOM wiring (converted from top of file)
  // ---------------------------
  private setupInitialDOM(): void {
    // set up st.* references to DOM elements used in flap logic
    this.st.flap = document.querySelector('#flap') as HTMLElement | null;
    this.st.toggle = document.querySelector('.toggle_slats') as HTMLElement | null;
    this.st.choice1 = document.querySelector('#choice1') as HTMLInputElement | null;
    this.st.choice2 = document.querySelector('#choice2') as HTMLInputElement | null;

    if (this.st.flap && this.st.toggle) {
      this.st.flap.addEventListener('transitionend', () => {
        if (this.st.choice1 && this.st.choice1.checked) {
          this.st.toggle!.style.transform = 'rotateY(-15deg)';
          setTimeout(() => (this.st.toggle!.style.transform = ''), 400);
        } else {
          this.st.toggle!.style.transform = 'rotateY(15deg)';
          setTimeout(() => (this.st.toggle!.style.transform = ''), 400);
        }
      });
    }

    // click handler used in old file (commented out originally)
    this.st.clickHandler = (ee: Event) => {
      const target = ee.target as HTMLElement;
      if (!target) return;
      if (target.tagName === 'LABEL') {
        // original code used ee.target.attributes[0].textContent === 'slatslabel'
        // safer check: attribute name/value
        const attr0 = target.attributes[0];
        if (attr0 && attr0.textContent === 'slatslabel') {
          setTimeout(() => {
            if (this.st.flap && this.st.flap.children[0]) {
              (this.st.flap.children[0] as HTMLElement).textContent = target.textContent || '';
            }
          }, 250);
        }
      }
    };
  }

  private setupInitialFlapText(): void {
    // document.addEventListener('DOMContentLoaded', () => {
    //   st.flap.children[0].textContent = st.choice2.nextElementSibling.textContent;
    // });
    try {
      if (this.st.flap && this.st.choice2 && this.st.choice2.nextElementSibling) {
        (this.st.flap.children[0] as HTMLElement).textContent = (this.st.choice2.nextElementSibling as HTMLElement).textContent || '';
      } else {
        const flap = document.querySelector('#flap') as HTMLElement | null;
        const choice2 = document.querySelector('#choice2') as HTMLInputElement | null;
        if (flap && choice2 && choice2.nextElementSibling) {
          (flap.children[0] as HTMLElement).textContent = (choice2.nextElementSibling as HTMLElement).textContent || '';
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // ---------------------------
  // Helper: configuratorpreview (main UI show/hide)
  // ---------------------------
  configuratorpreview(): void {
    const select_color_image = (document.querySelector('#select_color_image') as HTMLInputElement | null)?.value;
    if (!this.isValidImageURL(select_color_image)) {
      this.hideAll('.configurator-preview');
    } else {
      this.showAll('.configurator-preview');
      this.resizeimagepreview();
    }
    // The original file had jQuery.tierontier flag
    // We attempt to read a global variable if available
    const tierontierFlag = (window as any).tierontier;
    if (tierontierFlag === 1) {
      this.hideAll('.configurator-preview');
    }
  }

  // ---------------------------
  // Utility show/hide
  // ---------------------------
  private hideAll(selector: string): void {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
    nodes.forEach(n => { n.style.display = 'none'; });
  }

  private showAll(selector: string): void {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
    nodes.forEach(n => { n.style.display = ''; });
  }

  // ---------------------------
  // isValidImageURL
  // ---------------------------
  isValidImageURL(str: any): boolean {
    if (typeof str !== 'string') return false;
    return !!str.match(/\w+\.(jpg|jpeg|gif|webp|png|tiff|bmp)$/gi);
  }

  // ---------------------------
  // resizeimagepreview (large function converted)
  // ---------------------------
  resizeimagepreview(): void {
    // Many dependent DOM structures - converted to vanilla DOM
    const panelsContainer = document.querySelector('.panel') as HTMLElement | null;
    const panels = document.querySelectorAll('.panels');
    const panelsElem = document.querySelector('.panels') as HTMLElement | null;
    if (!panelsContainer || !panelsElem) return;

    const panelscontainer_width = panelsContainer.clientWidth;
    this.setStyleToAll('.panels', 'width', `${panelscontainer_width}px`);

    // `.slats-pushrod` each
    const slatsPushrods = Array.from(document.querySelectorAll<HTMLElement>('.slats-pushrod'));
    slatsPushrods.forEach(sp => {
      const innerHeight = sp.clientHeight;
      const pushrod = sp.querySelector<HTMLElement>('.pushrod');
      const pushrodOffset = sp.querySelector<HTMLElement>('.pushrod-offset');
      if (pushrod) pushrod.style.height = `${innerHeight}px`;
      if (pushrodOffset) pushrodOffset.style.height = `${innerHeight}px`;
    });

    const select_color = (document.querySelector('#select_color') as HTMLInputElement | null)?.value;
    const select_color_image = (document.querySelector('#select_color_image') as HTMLInputElement | null)?.value;
    this.change_color(select_color, select_color_image);

    // replicate the sizing math from original
    const t = document.querySelector<HTMLElement>('.page-template-full-width-wrapper');
    if (!t) return;
    const a = t.querySelector<HTMLElement>('.panels');
    if (!a) return;

    // helper g(t.find(".configurator-preview"))
    const o = this.g(t);
    const n = 0.5 * window.innerHeight;
    const i = a.offsetWidth;
    let s = 0;

    const scalingWrappers = Array.from(t.querySelectorAll<HTMLElement>('.scalingWrapper'));
    scalingWrappers.forEach(sw => {
      const h = (document.querySelector('#shutterspreview') as HTMLElement | null)?.offsetHeight || 0;
      s += h;
    });

    let r: number | undefined;
    const l = s - n;
    const d = i - o;
    const width_dec = (window.innerWidth > 0) ? window.innerWidth : (screen.width || 0);
    if (width_dec < 550) {
      if (l > d && s > n) {
        r = n / s;
      } else if (l <= d && i > o) {
        r = o / i;
      }
      if (!r) r = 1;
      t.querySelectorAll<HTMLElement>('.panels-container').forEach(pc => {
        pc.style.transform = `scale(${r})`;
      });
    } else {
      if (l > d && s > n) {
        r = n / i;
      } else if (l <= d && i > o) {
        r = o / i;
      }
      // original then sets r = 1; (they had r = r+0.010000 then r = 1)
      r = 1;
      t.querySelectorAll<HTMLElement>('.panels-container').forEach(pc => {
        pc.style.transform = `scale(${r})`;
      });
    }

    const c = Math.ceil(s * ((r || 1) + 0.03));
    const p = Math.ceil(i * (r || 1));
    t.querySelectorAll<HTMLElement>('.preview').forEach(pre => {
      pre.style.height = `${c}px`;
    });

    const u = this.g(Array.from(document.querySelectorAll('.configurator-preview:visible') as any) as any) || 0;
    // fallback: if not able to compute, set u = width of last visible preview
    const visiblePreviews = Array.from(document.querySelectorAll<HTMLElement>('.configurator-preview')).filter(el => {
      return el.offsetParent !== null;
    });
    const lastVisible = visiblePreviews[visiblePreviews.length - 1];
    const uval = lastVisible ? lastVisible.clientWidth : 0;
    const f = Math.ceil((uval - p) / 2);
    const finalF = f > 0 ? f : 0;
    document.querySelectorAll<HTMLElement>('.panels').forEach(pl => {
      pl.style.marginLeft = `${finalF}px`;
    });
  }

  // replicate original helper g(e)
  private g(e: HTMLElement | NodeList | any): number {
    // original returned width minus padding-left/right of .configurator-preview
    const cfgPreview = document.querySelector('.configurator-preview') as HTMLElement | null;
    if (!cfgPreview) return 0;
    const style = window.getComputedStyle(cfgPreview);
    const width = cfgPreview.clientWidth
      - parseInt(style.paddingLeft || '0', 10)
      - parseInt(style.paddingRight || '0', 10);
    return width;
  }

  // ---------------------------
  // midpane (long function converted)
  // ---------------------------
  midpane(midrail: number | string, slastsize: number | string): void {
    let html = '';
    const slat_size_num = Number(slastsize) || 0;
    const slate_height = slat_size_num / 2;
    let minheight = 20 + parseFloat(String(slate_height));
    // original then sets slastsize = 0 at top of function - but they set slastsize=0 later; preserve logic carefully
    let slastsizeLocal: any = 0;
    let paneSection = 20;
    const shuttertype = (document.querySelector('#set_shuttertype') as HTMLInputElement | null)?.value || '';
    const n1 = shuttertype.toLowerCase().indexOf('half');
    const n2 = shuttertype.toLowerCase().indexOf('tier');
    const n3 = shuttertype.toLowerCase().indexOf('full solid');
    if (n1 > -1 || n2 > -1) {
      midrail = 0;
      paneSection = 20;
    }

    const midrailNum = Number(midrail) || 0;

    if (midrailNum > 0) {
      // many branches depending on midrail count and shutter type
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
          slastsizeLocal = slat_size_num / 2;
          html += this.panesectionli(10, minheight, slastsizeLocal);
          html += this.midRail_html();
          html += this.panesectionli(8, minheight, slastsizeLocal);
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
          slastsizeLocal = slat_size_num / 3;
          html += this.panesectionli(5, minheight, slastsizeLocal);
          html += this.midRail_html();
          html += this.panesectionli(5, minheight, '');
          html += this.midRail_html();
          html += this.panesectionli(5, minheight, slastsizeLocal);
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
          slastsizeLocal = slat_size_num / 4;
          html += this.panesectionli(5, minheight, slastsizeLocal);
          html += this.midRail_html();
          html += this.panesectionli(3, minheight, slastsizeLocal);
          html += this.midRail_html();
          html += this.panesectionli(3, minheight, '');
          html += this.midRail_html();
          html += this.panesectionli(5, minheight, slastsizeLocal);
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
          slastsizeLocal = slat_size_num / 5;
          html += this.panesectionli(4, minheight, slastsizeLocal);
          html += this.midRail_html();
          html += this.panesectionli(3, minheight, slastsizeLocal);
          html += this.midRail_html();
          html += this.panesectionli(3, minheight, slastsizeLocal);
          html += this.midRail_html();
          html += this.panesectionli(3, minheight, slastsizeLocal);
          html += this.midRail_html();
          html += this.panesectionli(4, minheight, slastsizeLocal);
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
          slastsizeLocal = slat_size_num / 5;
          html += this.panesectionli(3, minheight, slastsizeLocal);
          html += this.midRail_html();
          html += this.panesectionli(2, minheight, slastsizeLocal);
          html += this.midRail_html();
          html += this.panesectionli(2, minheight, slastsizeLocal);
          html += this.midRail_html();
          html += this.panesectionli(2, minheight, slastsizeLocal);
          html += this.midRail_html();
          html += this.panesectionli(2, minheight, slastsizeLocal);
          html += this.midRail_html();
          html += this.panesectionli(3, minheight, slastsizeLocal);
        }
      }

      // set .midpane-fill innerHTML
      const midpaneFillElems = Array.from(document.querySelectorAll<HTMLElement>('.midpane-fill'));
      midpaneFillElems.forEach(elem => {
        elem.innerHTML = '';
        elem.innerHTML = html;
      });

    } else {
      // midrail == 0
      if (n2 > -1) {
        this.tierontier();
      } else if (n3 > -1) {
        html += `<div class="paneSection raisedPanel" style="min-height: 400px;"></div>`;
        const fills = Array.from(document.querySelectorAll<HTMLElement>('.midpane-fill'));
        fills.forEach(f => {
          f.innerHTML = '';
          f.innerHTML = html;
        });
      } else {
        html += this.panesectionli(paneSection, minheight, slastsizeLocal);
        const fills = Array.from(document.querySelectorAll<HTMLElement>('.midpane-fill'));
        fills.forEach(f => {
          f.innerHTML = '';
          f.innerHTML = html;
        });

        if (n1 > -1) {
          html = '<div class="midRail">';
          html += '<span class="rail-bg" style="min-height: 30px; height: 30px;"></span>';
          html += '<span class="mouseHole-bottom"></span>';
          html += '</div>';
          html += '<div class="paneSection raisedPanel" style="min-height: 100.2px;"></div>';
          const slatsPushrodElems = Array.from(document.querySelectorAll<HTMLElement>('.slats-pushrod'));
          slatsPushrodElems.forEach(el => {
            el.insertAdjacentHTML('afterend', html);
          });
        }
      }
    }
  }

  // ---------------------------
  // odd helper
  // ---------------------------
  odd(n: number): boolean {
    return n % 2 === 0;
  }

  // ---------------------------
  // tierontier (converted)
  // ---------------------------
  tierontier(): void {
    let html = '';
    let NumberOfPanels = parseInt((document.querySelector('.NumberOfPanels') as HTMLInputElement | null)?.value || '0', 10);
    if (NumberOfPanels === 1 || NumberOfPanels % 3 === 0) {
      NumberOfPanels = NumberOfPanels + 1;
    } else {
      NumberOfPanels = NumberOfPanels;
    }
    let slastsize = (document.querySelector('.SlatWidth') as HTMLInputElement | null)?.value;
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
        panel_minwidth = `${330 / (Number(NumberOfPanels / 2) || 1)}px`;
      }
      let inside_html = '';
      for (let i = 0; i < Number(Number(div_noofpanel) as any ? Number(div_noofpanel) as any : 1); i++) {
        // This logic is complicated in original; approximating to create repeated blocks
      }

      // The original built two .panels groups; we'll generate them similarly:
      const divNo = Number(div_noofpanel) ? Number(div_noofpanel) : 1;
      let panelsHtml1 = '';
      for (let i = 0; i < divNo; i++) {
        panelsHtml1 += `<div class="panel" style="min-width:${panel_minwidth}"><div class="midpane"><div class="topRail"><span class="rail-bg" style="min-height: 30px; height: 30px;"></span><span class="mouseHole-top"></span></div><div class="midpane-fill">${this.panesectionli(18, minheight, slastsize)}</div><div class="bottomRail"><span class="rail-bg" style="min-height: 30px; height: 30px;"></span><span class="mouseHole-bottom" style="display:unset;"></span></div></div></div>`;
      }
      let panelsHtml2 = '';
      for (let i = 0; i < divNo; i++) {
        panelsHtml2 += `<div class="panel" style="min-width:${panel_minwidth}"><div class="midpane"><div class="topRail"><span class="rail-bg" style="min-height: 30px; height: 30px;"></span><span class="mouseHole-top"></span></div><div class="midpane-fill">${this.panesectionli(6, minheight, slastsize)}</div><div class="bottomRail"><span class="rail-bg" style="min-height: 30px; height: 30px;"></span><span class="mouseHole-bottom" style="display:unset;"></span></div></div></div>`;
      }

      const panelsContainer = document.querySelector<HTMLElement>('.panels-container');
      if (panelsContainer) {
        panelsContainer.innerHTML = `<div class="panels">${panelsHtml1}</div><div class="panels">${panelsHtml2}</div>`;
      }

      // toggle hinge class similar to original
      const panelElems = Array.from(document.querySelectorAll<HTMLElement>('.panel'));
      if (NumberOfPanels > 2) {
        panelElems.forEach(el => el.classList.remove('hingeLeft', 'panel--hinge-left'));
      } else {
        panelElems.forEach(el => el.classList.add('hingeLeft', 'panel--hinge-left'));
      }

      // float/style adjustments
      const panelsPlus = Array.from(document.querySelectorAll<HTMLElement>('.panels+.panels'));
      panelsPlus.forEach(el => el.style.clear = 'both');
      document.querySelectorAll<HTMLElement>('.panels').forEach(el => el.style.float = 'left');

      (window as any).tierontier = '';
    } else {
      console.log('Something went wrong. Please refresh the page and try again.');
      (window as any).tierontier = 1;
    }
  }

  // ---------------------------
  // midRail_html helper
  // ---------------------------
  midRail_html(): string {
    let html = '<div class="midRail">';
    html += '<span class="rail-bg" style="min-height: 30px; height: 30px;"></span>';
    html += '<span class="mouseHole-bottom"></span>';
    html += '<span class="mouseHole-top"></span>';
    html += '</div>';
    return html;
  }

  // ---------------------------
  // panesectionli helper
  // ---------------------------
  panesectionli(count: number, minheight: number, slastsize: any): string {
    let html = '';
    let li_list_count: number = Math.abs(count - Number(slastsize || 0));
    html += '<div class="slats-pushrod">';
    html += '<ul class="paneSection slats">';
    for (let i = 0; i < li_list_count; i++) {
      const zindex = 99 - i;
      html += `<li><span style="min-height: ${minheight}px; padding: 0px; margin: 0px;"></span></li>`;
    }
    html += '</ul>';
    html += '<div class="pushrod"></div>';
    html += '</div>';
    return html;
  }

  // ---------------------------
  // midRail (handler)
  // ---------------------------
  midRail(thisval: HTMLElement | string): void {
    let midrail: any;
    if (typeof thisval === 'string') {
      midrail = thisval;
    } else if (thisval instanceof HTMLElement) {
      midrail = thisval.getAttribute('data-value');
    } else {
      midrail = undefined;
    }
    if (!midrail) return;
    const midrailVal = String(midrail);
    const midrailsElem = document.querySelectorAll<HTMLElement>('.midrails');
    midrailsElem.forEach(el => (el as HTMLInputElement).value = midrailVal);
    const slastsize = (document.querySelector('.SlatWidth') as HTMLInputElement | null)?.value;
    this.midpane(Number(midrail), slastsize);
    const PushRod = (document.querySelector('.tiltrod') as HTMLInputElement | null)?.value;
    this.tiltrod(PushRod);
    this.resizeimagepreview();
  }

  // ---------------------------
  // slats (toggles class)
  // ---------------------------
  slats(slat: string): void {
    const midpaneFills = Array.from(document.querySelectorAll<HTMLElement>('.midpane-fill'));
    midpaneFills.forEach(e => e.classList.remove('slats-close'));
    if (slat === 'close') {
      midpaneFills.forEach(e => e.classList.add('slats-close'));
      const first = document.querySelector('.slats li:first-child span') as HTMLElement | null;
      if (first) {
        first.style.boxShadow = 'rgb(5 5 5 / 15%) 0.1em 0.1em 0.1em inset, rgb(5 5 5 / 15%) 0px 8px 10px inset';
      }
    }
  }

  // ---------------------------
  // update_Panel (converted)
  // ---------------------------
  update_Panel(panel: number): void {
    const shuttertype = (document.querySelector('#set_shuttertype') as HTMLInputElement | null)?.value || '';
    const n = shuttertype.toLowerCase().indexOf('tier');
    if (n > -1) {
      this.tierontier();
      this.resizeimagepreview();
      return;
    }

    const panelElems = Array.from(document.querySelectorAll<HTMLElement>('.panel'));
    panelElems.forEach((el, i) => {
      if (i > 0) {
        // remove extra panels
        el.remove();
      }
    });

    if (panel > 1) {
      panelElems.forEach(p => p.classList.remove('hingeLeft', 'panel--hinge-left'));
    } else {
      panelElems.forEach(p => p.classList.add('hingeLeft', 'panel--hinge-left'));
    }

    const panelsHtml = (document.querySelector('.panels') as HTMLElement | null)?.innerHTML || '';
    let panels_width = 330;
    const panelsContainer = document.querySelector('.panels') as HTMLElement | null;
    if (!panelsContainer) return;

    for (let i = 1; i < panel; i++) {
      panelsContainer.insertAdjacentHTML('beforeend', panelsHtml);
    }

    if (panel > 1) {
      panels_width = Math.floor(panels_width / panel);
      document.querySelectorAll<HTMLElement>('.panel').forEach(pe => pe.style.minWidth = `${panels_width}px`);
    } else {
      document.querySelectorAll<HTMLElement>('.panel').forEach(pe => pe.style.minWidth = `${panels_width}px`);
    }
    this.resizeimagepreview();
  }

  // ---------------------------
  // updatePanel (click handler)
  // ---------------------------
  updatePanel(thisval: HTMLElement): void {
    const panel = thisval.getAttribute('data-value');
    if (!panel) return;
    const panelsElem = document.querySelectorAll<HTMLInputElement>('.NumberOfPanels');
    panelsElem.forEach(el => el.value = panel);
    this.update_Panel(Number(panel));
  }

  // ---------------------------
  // slatsize handler
  // ---------------------------
  slatsize(thisval: HTMLElement): void {
    const slastsize = thisval.getAttribute('data-value');
    if (!slastsize) return;
    // remove .is-selected from .js-slatSize
    document.querySelectorAll<HTMLElement>('.js-slatSize').forEach(el => el.classList.remove('is-selected'));
    thisval.classList.add('is-selected');
    const slatWidthElems = document.querySelectorAll<HTMLInputElement>('.SlatWidth');
    slatWidthElems.forEach(el => el.value = slastsize);
    const midrails = (document.querySelector('.midrails') as HTMLInputElement | null)?.value;
    this.midpane(Number(midrails) || 0, slastsize);
    const PushRod = (document.querySelector('.tiltrod') as HTMLInputElement | null)?.value;
    this.tiltrod(PushRod);
    this.resizeimagepreview();
  }

  // ---------------------------
  // tiltrod handler
  // ---------------------------
  tiltrod(getvalue: string | null): void {
    const shuttertype = (document.querySelector('#set_shuttertype') as HTMLInputElement | null)?.value || '';
    const n3 = shuttertype.toLowerCase().indexOf('full solid');
    if (n3 > -1) {
      getvalue = 'hidden';
    }
    const tiltrodElems = Array.from(document.querySelectorAll<HTMLInputElement>('.tiltrod'));
    tiltrodElems.forEach(el => el.value = String(getvalue || ''));

    // show defaults
    this.showAllSelectors(['.pushrod', '.pushrod-offset', '.mouseHole-top', '.mouseHole-top-offset', '.mouseHole-bottom']);

    if (getvalue === 'central') {
      document.querySelectorAll<HTMLElement>('.slats-pushrod div').forEach(div => {
        div.classList.remove('pushrod-offset');
        div.classList.add('pushrod');
      });
      document.querySelectorAll<HTMLElement>('.topRail span:nth-child(2)').forEach(sp => {
        sp.classList.remove('mouseHole-top-offset');
        sp.classList.add('mouseHole-top');
      });
      document.querySelectorAll<HTMLElement>('.midRail span:nth-child(3)').forEach(sp => {
        sp.classList.remove('mouseHole-top-offset');
        sp.classList.add('mouseHole-top');
      });
    } else if (getvalue === 'offset') {
      document.querySelectorAll<HTMLElement>('.slats-pushrod div').forEach(div => {
        div.classList.remove('pushrod');
        div.classList.add('pushrod-offset');
      });
      document.querySelectorAll<HTMLElement>('.topRail span:nth-child(2)').forEach(sp => {
        sp.classList.remove('mouseHole-top');
        sp.classList.add('mouseHole-top-offset');
      });
      document.querySelectorAll<HTMLElement>('.midRail span:nth-child(3)').forEach(sp => {
        sp.classList.remove('mouseHole-top');
        sp.classList.add('mouseHole-top-offset');
      });
    } else if (getvalue === 'hidden') {
      document.querySelectorAll<HTMLElement>('.mouseHole-top, .mouseHole-top-offset').forEach(el => (el as HTMLElement).style.display = 'none');
      document.querySelectorAll<HTMLElement>('.slats-pushrod div.pushrod').forEach(el => (el as HTMLElement).style.display = 'none');
      document.querySelectorAll<HTMLElement>('.slats-pushrod div.pushrod-offset').forEach(el => (el as HTMLElement).style.display = 'none');
      document.querySelectorAll<HTMLElement>('.mouseHole-bottom').forEach(el => (el as HTMLElement).style.display = 'none');
    } else {
      // default cleanup
      document.querySelectorAll<HTMLElement>('.topRail span:nth-child(2)').forEach(sp => {
        if (sp.classList.contains('mouseHole-top-offset')) {
          sp.classList.remove('mouseHole-top-offset');
          sp.classList.add('mouseHole-top');
        }
      });
      document.querySelectorAll<HTMLElement>('.midRail span:nth-child(3)').forEach(sp => {
        if (sp.classList.contains('mouseHole-top-offset')) {
          sp.classList.remove('mouseHole-top-offset');
          sp.classList.add('mouseHole-top');
        }
      });
      document.querySelectorAll<HTMLElement>('.slats-pushrod div.pushrod, .slats-pushrod div.pushrod-offset').forEach(el => {
        (el as HTMLElement).style.display = 'none';
      });
    }
  }

  // ---------------------------
  // pushrod handler (wraps tiltrod)
  // ---------------------------
  pushrod(thisval: HTMLElement): void {
    const getvalue = thisval.getAttribute('data-value') || '';
    document.querySelectorAll<HTMLElement>('.js-tiltrod').forEach(el => el.classList.remove('is-selected'));
    thisval.classList.add('is-selected');
    const get_value = getvalue.toLowerCase();
    this.tiltrod(get_value);
  }

  // ---------------------------
  // change_color (major style/apply function)
  // ---------------------------
  change_color(color: string | undefined, imageurl: string | undefined): void {
    if (typeof color === 'undefined') color = '';
    if (typeof imageurl === 'undefined') imageurl = '';

    const selectColorElem = document.querySelector<HTMLInputElement>('#select_color') || null;
    const selectColorImageElem = document.querySelector<HTMLInputElement>('#select_color_image') || null;
    const previewImageElem = document.querySelector<HTMLImageElement>('#preview-image') || null;

    if (selectColorElem) selectColorElem.value = color;
    if (selectColorImageElem) selectColorImageElem.value = imageurl;
    if (previewImageElem && imageurl) previewImageElem.src = imageurl;

    // apply many background styles similar to original
    document.querySelectorAll<HTMLElement>('.panel').forEach(panel => {
      panel.style.backgroundImage = `url(${imageurl}),url(${imageurl})`;
      panel.style.backgroundPositionX = 'right, left';
      panel.style.backgroundPositionY = 'top, top';
      panel.style.backgroundRepeat = 'no-repeat, repeat';
      panel.style.backgroundSize = '16px';
    });

    document.querySelectorAll<HTMLElement>('.midRail').forEach(mr => {
      mr.style.background = `url(${imageurl}) no-repeat bottom left,url(${imageurl}) no-repeat bottom right`;
    });
    document.querySelectorAll<HTMLElement>('.midRail .rail-bg').forEach(rb => {
      (rb as HTMLElement).style.background = `url(${imageurl}) no-repeat bottom center`;
    });
    document.querySelectorAll<HTMLElement>('.pushrod, .pushrod-offset').forEach(pr => {
      (pr as HTMLElement).style.background = `url(${imageurl}) repeat-y`;
    });
    document.querySelectorAll<HTMLElement>('.topRail').forEach(tr => {
      (tr as HTMLElement).style.background = `url(${imageurl}) no-repeat bottom left,url(${imageurl}) no-repeat bottom right`;
    });
    document.querySelectorAll<HTMLElement>('.topRail .rail-bg').forEach(rbg => {
      (rbg as HTMLElement).style.background = `url(${imageurl}) no-repeat bottom center`;
    });
    document.querySelectorAll<HTMLElement>('.slats li span').forEach(s => {
      (s as HTMLElement).style.background = `url(${imageurl})`;
    });
    document.querySelectorAll<HTMLElement>('.bottomRail').forEach(br => {
      (br as HTMLElement).style.background = `url(${imageurl}) no-repeat bottom left,url(${imageurl}) no-repeat bottom right`;
    });
    document.querySelectorAll<HTMLElement>('.bottomRail .rail-bg').forEach(rbg => {
      (rbg as HTMLElement).style.background = `url(${imageurl}) no-repeat bottom center`;
    });

    // border style
    document.querySelectorAll<HTMLElement>('.topRail, .bottomRail, .midRail').forEach(el => {
      (el as HTMLElement).style.borderWidth = '0px 1px';
      (el as HTMLElement).style.borderStyle = 'unset';
      (el as HTMLElement).style.borderColor = '#03030380';
    });

    document.querySelectorAll<HTMLElement>('.panel').forEach(p => {
      p.style.borderLeftWidth = '0px';
      p.style.borderRightWidth = '0px';
    });

    // box shadows using style property
    document.querySelectorAll<HTMLElement>('.pushrod, .pushrod-offset').forEach(el => {
      (el as HTMLElement).style.boxShadow = 'rgb(5 5 5 / 8%) 0.1em 0.1em 0.1em inset, rgb(0 0 0 / 8%) -1px -1px 1px inset';
    });

    if (document.querySelector('.midpane-fill')?.classList.contains('slats-close')) {
      document.querySelectorAll<HTMLElement>('.slats li span').forEach(s => {
        (s as HTMLElement).style.boxShadow = 'rgb(5 5 5 / 15%) 0.1em 0.1em 0.1em inset, rgb(0 0 0 / 15%) 0px 8px 10px inset';
      });
      const first = document.querySelector('.slats li:first-child span') as HTMLElement | null;
      if (first) first.style.boxShadow = 'rgb(5 5 5 / 15%) 0.1em 0.1em 0.1em inset, rgb(5 5 5 / 15%) 0px 8px 10px  inset';
    } else {
      document.querySelectorAll<HTMLElement>('.slats li span').forEach(s => {
        (s as HTMLElement).style.boxShadow = 'rgb(5 5 5 / 15%) 0.1em 0.1em 0.1em inset, rgb(0 0 0 / 15%) 0px 8px 10px inset';
      });
    }

    const n1 = shuttertypeHas('half') ? 1 : -1;
    const n2 = shuttertypeHas('full solid') ? 1 : -1;
    if (n1 > -1 || n2 > -1) {
      document.querySelectorAll<HTMLElement>('.raisedPanel').forEach(rp => {
        (rp as HTMLElement).style.background = `url(${imageurl}) no-repeat top left`;
        (rp as HTMLElement).style.backgroundSize = '100% 100%';
        (rp as HTMLElement).style.filter = 'blur(5px)';
      });
    }

    // helper to check global shuttertype
    function shuttertypeHas(needle: string) {
      const shuttertype = (document.querySelector('#set_shuttertype') as HTMLInputElement | null)?.value || '';
      return shuttertype.toLowerCase().indexOf(needle) > -1;
    }
  }

  // small helper used above
  private showAllSelectors(selectors: string | string[]) {
    const arr = Array.isArray(selectors) ? selectors : [selectors];
    arr.forEach(sel => {
      document.querySelectorAll<HTMLElement>(sel).forEach(el => {
        (el as HTMLElement).style.display = '';
      });
    });
  }

  // ---------------------------
  // changecolor handlers (UI click wrappers)
  // ---------------------------
  changecolor(thisval: HTMLElement): void {
    const color = thisval.getAttribute('data-colorname') || '';
    const imageurl = thisval.getAttribute('data-img') || '';
    const select_imgid = thisval.getAttribute('data-id') || '';
    const selectImgIdElem = document.querySelector<HTMLInputElement>('#select_imgid');
    if (selectImgIdElem) selectImgIdElem.value = select_imgid;

    document.querySelectorAll<HTMLElement>('.js-config-color').forEach(el => el.classList.remove('is-selected'));
    thisval.classList.add('is-selected');
    this.change_color(color, imageurl);
  }

  change_hinge_color(imageurl: string): void {
    const selectElem = document.querySelector<HTMLInputElement>('.select_hingecolor_image');
    if (selectElem) selectElem.value = imageurl;
    const headstyle = document.querySelector('#headstyle') as HTMLElement | null;
    if (!headstyle) return;
    headstyle.innerHTML = ''; // clear
    headstyle.innerHTML = `<style>.shutters-configurator .configurator-preview .panel:last-child:after, .shutters-configurator .configurator-preview .panel:last-child:before, .shutters-configurator .configurator-preview .panel:first-child:after, .shutters-configurator .configurator-preview .panel:first-child:before{background:url(${imageurl}) no-repeat}</style>`;
  }

  changehingecolor(thisval: HTMLElement): void {
    const imageurl = thisval.getAttribute('data-img') || '';
    this.change_hinge_color(imageurl);
  }

  // ---------------------------
  // get_rgb / getBase64Image / getAverageRGB
  // ---------------------------
  get_rgb(id: string | number): void {
    const imgEl = document.getElementById(`imgid_${id}`) as HTMLImageElement | null;
    if (!imgEl) return;
    this.getBase64Image(imgEl);
    setTimeout(() => {
      const r = Array.from(document.getElementsByClassName('image_class') as HTMLCollectionOf<HTMLImageElement>);
      const rgb: any[] = [];
      for (let p = 0; p < r.length; p++) {
        rgb.push(this.getAverageRGB(r[p]));
      }
      rgb.forEach((el, i) => {
        if (el.r !== '0' && el.g !== '0' && el.b !== '0') {
          document.querySelectorAll<HTMLElement>('.slats li span').forEach(s => {
            (s as HTMLElement).style.background = 'none';
            (s as HTMLElement).style.backgroundColor = `rgb(${el.r},${el.g},${el.b})`;
          });
        }
        const r_c = el.r - 50;
        const g_c = el.g - 50;
        const b_c = el.b - 50;
        document.querySelectorAll<HTMLElement>('.topRail, .bottomRail, .midRail, .panel').forEach(e => {
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
        const imageClassEls = Array.from(document.getElementsByClassName('image_class') as HTMLCollectionOf<HTMLImageElement>);
        imageClassEls.forEach(ic => {
          ic.src = dataURL;
        });
      } catch (e) {
        // cross-origin may cause error
      }
    }, 150);
  }

  convert_canvas(id_div: string): string {
    const node = document.getElementById(id_div);
    if (!node) return 'no';
    const canvas = document.createElement('canvas');
    canvas.width = node.scrollWidth;
    canvas.height = node.scrollHeight;
    // domtoimage is not available by default - original used domtoimage.toJpeg
    // We attempt to call window.domtoimage if available. Otherwise return 'no'.
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
        const imagepathInput = document.querySelector<HTMLInputElement>('#imagepath');
        if (imagepathInput) imagepathInput.value = pngDataUrl;
      });
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
      // security error (cross domain)
      alert('x');
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

  // ---------------------------
  // Utility: set style on all nodes selector:key -> value
  // ---------------------------
  private setStyleToAll(selector: string, key: string, value: string): void {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
    nodes.forEach(n => {
      (n.style as any)[key] = value;
    });
  }

  // ---------------------------
  // Convenience wrappers for external calls (expose functions)
  // ---------------------------
  public callPreview(): void {
    this.configuratorpreview();
  }

  public changeColor(color: string, imageUrl: string): void {
    this.change_color(color, imageUrl);
  }

  public updatePanelCount(panelCount: number): void {
    this.update_Panel(panelCount);
  }
}
