import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface WishlistItem {
  key: string;
  productId: number;
  variantKey: string;
  productSlug?: string;
  selectionSlug?: string;
  fabricId?: number;
  colorId?: number;
  pricingGroupId?: number;
  supplierId?: number;
  matmapId?: number;
  productName: string;
  displayName: string;
  fabricName: string;
  colorName: string;
  imageUrl: string;
  price: number;
  addedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class WishlistService {
  private readonly storageKey = 'ecom_wishlist_v1';
  private readonly itemsMap = new Map<string, WishlistItem>();
  private readonly itemsSubject = new BehaviorSubject<WishlistItem[]>([]);
  readonly items$: Observable<WishlistItem[]> = this.itemsSubject.asObservable();

  constructor() {
    this.hydrateFromStorage();
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.onStorageChange);
    }
  }

  has(key: string): boolean {
    return this.itemsMap.has(String(key || '').trim());
  }

  getItems(): WishlistItem[] {
    return this.itemsSubject.value;
  }

  toggle(item: WishlistItem): boolean {
    const normalized = this.normalizeItem(item);
    if (!normalized) {
      return false;
    }

    if (this.itemsMap.has(normalized.key)) {
      this.itemsMap.delete(normalized.key);
      this.emitAndPersist();
      return false;
    }

    this.itemsMap.set(normalized.key, {
      ...normalized,
      addedAt: new Date().toISOString()
    });
    this.emitAndPersist();
    return true;
  }

  add(item: WishlistItem): boolean {
    const normalized = this.normalizeItem(item);
    if (!normalized) {
      return false;
    }
    this.itemsMap.set(normalized.key, {
      ...normalized,
      addedAt: new Date().toISOString()
    });
    this.emitAndPersist();
    return true;
  }

  remove(key: string): boolean {
    const normalizedKey = String(key || '').trim();
    if (!normalizedKey || !this.itemsMap.has(normalizedKey)) {
      return false;
    }
    this.itemsMap.delete(normalizedKey);
    this.emitAndPersist();
    return true;
  }

  clear(): void {
    if (this.itemsMap.size === 0) {
      return;
    }
    this.itemsMap.clear();
    this.emitAndPersist();
  }

  replaceItems(items: WishlistItem[]): void {
    const nextMap = new Map<string, WishlistItem>();
    (Array.isArray(items) ? items : []).forEach((entry) => {
      const normalized = this.normalizeItem(entry);
      if (!normalized) {
        return;
      }
      nextMap.set(normalized.key, normalized);
    });
    this.itemsMap.clear();
    nextMap.forEach((value, key) => this.itemsMap.set(key, value));
    this.emitAndPersist();
  }

  private readonly onStorageChange = (event: StorageEvent): void => {
    if (event.key !== this.storageKey) {
      return;
    }
    this.hydrateFromStorage();
  };

  private hydrateFromStorage(): void {
    const stored = this.readStoredItems();
    this.itemsMap.clear();

    stored.forEach((entry) => {
      const normalized = this.normalizeItem(entry);
      if (!normalized) {
        return;
      }
      this.itemsMap.set(normalized.key, normalized);
    });

    this.emit(false);
  }

  private emitAndPersist(): void {
    this.emit(true);
  }

  private emit(shouldPersist: boolean): void {
    const items = Array.from(this.itemsMap.values()).sort((left, right) =>
      String(right.addedAt || '').localeCompare(String(left.addedAt || ''))
    );
    this.itemsSubject.next(items);
    if (shouldPersist) {
      this.persist(items);
    }
  }

  private persist(items: WishlistItem[]): void {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(this.storageKey, JSON.stringify(items));
    } catch {
      // ignore storage quota and access errors
    }
  }

  private readStoredItems(): WishlistItem[] {
    if (typeof window === 'undefined') {
      return [];
    }
    try {
      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as WishlistItem[]) : [];
    } catch {
      return [];
    }
  }

  private normalizeItem(input: WishlistItem | null | undefined): WishlistItem | null {
    if (!input || typeof input !== 'object') {
      return null;
    }

    const key = String(input.key || '').trim();
    if (!key) {
      return null;
    }

    const variantKey = String(input.variantKey || '').trim();
    if (!variantKey) {
      return null;
    }

    const addedAtCandidate = String(input.addedAt || '').trim();
    const parsedAddedAt = Date.parse(addedAtCandidate);
    const addedAt = Number.isFinite(parsedAddedAt)
      ? new Date(parsedAddedAt).toISOString()
      : new Date().toISOString();

    return {
      key,
      productId: this.toNumber(input.productId),
      variantKey,
      productSlug: String(input.productSlug || '').trim(),
      selectionSlug: String(input.selectionSlug || '').trim(),
      fabricId: this.toNumber(input.fabricId),
      colorId: this.toNumber(input.colorId),
      pricingGroupId: this.toNumber(input.pricingGroupId),
      supplierId: this.toNumber(input.supplierId),
      matmapId: this.toNumber(input.matmapId),
      productName: String(input.productName || '').trim(),
      displayName: String(input.displayName || '').trim(),
      fabricName: String(input.fabricName || '').trim(),
      colorName: String(input.colorName || '').trim(),
      imageUrl: String(input.imageUrl || '').trim(),
      price: this.toNumber(input.price),
      addedAt
    };
  }

  private toNumber(value: any): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
