import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  public readonly enabled = environment.loaderEnabled;
  private counters = new Map<string, number>();
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  private visibleSubject = new BehaviorSubject<boolean>(false);
  private progressSubject = new BehaviorSubject<number>(0);

  // Progress smoothing
  private currentProgress = 0;
  private targetProgress = 0;
  private rafId: number | null = null;
  private hideTimer: any = null;
  private resetTimer: any = null;
  private readonly minVisibleMs = 200; // keep bar visible briefly to avoid flicker

  readonly isLoading$: Observable<boolean> = this.isLoadingSubject.asObservable();
  readonly visible$: Observable<boolean> = this.visibleSubject.asObservable();
  readonly progress$: Observable<number> = this.progressSubject.asObservable();

  start(key: string): void {
    if (!this.enabled) return;
    const current = this.counters.get(key) ?? 0;
    this.counters.set(key, current + 1);
    this.update(true);
  }

  end(key: string): void {
    if (!this.enabled) return;
    const current = this.counters.get(key) ?? 0;
    const next = Math.max(0, current - 1);
    if (next === 0) {
      this.counters.delete(key);
    } else {
      this.counters.set(key, next);
    }
    this.update(false);
  }

  setProgress(percent: number): void {
    if (!this.enabled) return;
    // Progress primarily used for assets (e.g., Three.js)
    const clamped = Math.max(0, Math.min(100, Math.round(percent)));
    this.targetProgress = clamped;
    this.kickAnimation();
  }

  private update(isStart: boolean): void {
    const active = this.counters.size > 0;
    this.isLoadingSubject.next(active);

    if (active) {
      // becoming active: show immediately and cancel any pending hides
      if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null; }
      if (this.resetTimer) { clearTimeout(this.resetTimer); this.resetTimer = null; }
      this.visibleSubject.next(true);
      if (isStart && this.currentProgress < 5) {
        // give a head start to avoid seeing 0% stuck
        this.setProgress(10);
      }
    } else {
      // push to 100 and hide smoothly after a short delay
      this.setProgress(100);
      if (this.hideTimer) { clearTimeout(this.hideTimer); }
      this.hideTimer = setTimeout(() => {
        this.visibleSubject.next(false);
        // after fade-out, reset progress
        if (this.resetTimer) { clearTimeout(this.resetTimer); }
        this.resetTimer = setTimeout(() => {
          this.currentProgress = 0;
          this.targetProgress = 0;
          this.progressSubject.next(0);
        }, 200);
      }, this.minVisibleMs);
    }
  }

  private kickAnimation(): void {
    if (this.rafId != null) return;
    const step = () => {
      const diff = this.targetProgress - this.currentProgress;
      // easing factor: larger when far, smaller when close
      const ease = Math.max(0.1, Math.min(0.3, Math.abs(diff) / 100));
      this.currentProgress += diff * ease;
      // snap when very close
      if (Math.abs(diff) < 0.5) {
        this.currentProgress = this.targetProgress;
      }
      this.progressSubject.next(Math.round(this.currentProgress));

      if (this.currentProgress !== this.targetProgress) {
        this.rafId = requestAnimationFrame(step);
      } else {
        this.rafId = null;
      }
    };
    this.rafId = requestAnimationFrame(step);
  }
}
