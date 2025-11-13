import { Injectable, Inject } from '@angular/core';
import { OverlayContainer } from '@angular/cdk/overlay';
import { DOCUMENT } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export type ThemeName = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private current: ThemeName = 'light';
  private theme$ = new BehaviorSubject<ThemeName>(this.current);

  constructor(
    private overlayContainer: OverlayContainer,
    @Inject(DOCUMENT) private document: Document
  ) {
    // Initialize from localStorage or prefers-color-scheme
    try {
      const saved = localStorage.getItem('theme') as ThemeName | null;
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initial: ThemeName = saved ?? (prefersDark ? 'dark' : 'light');
      this.applyTheme(initial);
      this.theme$.next(initial);
    } catch {
      this.applyTheme('light');
    }
  }

  get isDark$(): Observable<boolean> {
    return this.theme$.asObservable().pipe(map((t) => t === 'dark'));
  }

  get themeChanges(): Observable<ThemeName> {
    return this.theme$.asObservable();
  }

  toggle(): void {
    this.setTheme(this.current === 'dark' ? 'light' : 'dark');
  }

  setTheme(name: ThemeName): void {
    try { localStorage.setItem('theme', name); } catch {}
    this.applyTheme(name);
    this.theme$.next(name);
  }

  private applyTheme(name: ThemeName): void {
    this.current = name;
    const isDark = name === 'dark';
    const root = this.document.documentElement;
    root.classList.toggle('dark-theme', isDark);
    root.classList.toggle('light-theme', !isDark);

    // Mirror theme class to CDK overlay container so menus/tooltips match
    const overlayEl = this.overlayContainer.getContainerElement();
    overlayEl.classList.toggle('dark-theme', isDark);
    overlayEl.classList.toggle('light-theme', !isDark);
  }
}

