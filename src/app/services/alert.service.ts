import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon, SweetAlertOptions } from 'sweetalert2';
import { ThemeService } from './theme.service';

@Injectable({ providedIn: 'root' })
export class AlertService {
  private isDark = false;

  constructor(private theme: ThemeService) {
    this.theme.isDark$.subscribe((v) => (this.isDark = v));
  }

  private themedBase(): Partial<SweetAlertOptions> {
    return this.isDark
      ? { background: '#1e1e1e', color: '#e5e5e5' }
      : { background: '#fefefe', color: '#333' };
  }

  fire(options: any) {
    const base = this.themedBase();
    const merged: any = { ...base, ...(options || {}) };
    return (Swal as any).fire(merged);
  }

  toast(
    title: string,
    text: string = '',
    icon: SweetAlertIcon = 'success',
    durationMs: number = 3000
  ) {
    return this.fire({
      title,
      text,
      icon,
      showConfirmButton: false,
      timer: durationMs,
      customClass: { popup: 'small-toast' }
    });
  }
}
