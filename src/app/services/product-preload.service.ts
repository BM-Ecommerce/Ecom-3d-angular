import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ProductPreloadService {
  private productDataCache = new Map<string, any>();

  set(productId: string | number | null | undefined, payload: any): void {
    if (productId === null || productId === undefined || payload === null || payload === undefined) {
      return;
    }
    this.productDataCache.set(String(productId), payload);
  }

  consume(productId: string | number | null | undefined): any | null {
    if (productId === null || productId === undefined) {
      return null;
    }

    const key = String(productId);
    const payload = this.productDataCache.get(key) ?? null;
    if (payload !== null) {
      this.productDataCache.delete(key);
    }
    return payload;
  }
}
