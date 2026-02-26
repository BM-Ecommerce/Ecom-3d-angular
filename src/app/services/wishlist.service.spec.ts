import { WishlistItem, WishlistService } from './wishlist.service';

describe('WishlistService', () => {
  const storageKey = 'ecom_wishlist_v1';

  const buildItem = (key = 'item_1'): WishlistItem => ({
    key,
    productId: 101,
    variantKey: `variant_${key}`,
    productName: 'Roller Blinds',
    displayName: 'Linen White',
    fabricName: 'Linen',
    colorName: 'White',
    imageUrl: 'assets/no-image.jpg',
    price: 99,
    addedAt: '2026-02-26T00:00:00.000Z'
  });

  beforeEach(() => {
    localStorage.removeItem(storageKey);
  });

  afterEach(() => {
    localStorage.removeItem(storageKey);
  });

  it('should add and persist a wishlist item', () => {
    const service = new WishlistService();
    const item = buildItem('item_add');

    const added = service.add(item);

    expect(added).toBeTrue();
    expect(service.has(item.key)).toBeTrue();
    expect(service.getItems().length).toBe(1);

    const raw = localStorage.getItem(storageKey);
    expect(raw).toBeTruthy();
  });

  it('should toggle remove an existing item', () => {
    const service = new WishlistService();
    const item = buildItem('item_toggle');

    service.toggle(item);
    expect(service.has(item.key)).toBeTrue();

    const addedOnSecondToggle = service.toggle(item);
    expect(addedOnSecondToggle).toBeFalse();
    expect(service.has(item.key)).toBeFalse();
    expect(service.getItems().length).toBe(0);
  });

  it('should hydrate items from local storage', () => {
    const seeded = [buildItem('seeded_item')];
    localStorage.setItem(storageKey, JSON.stringify(seeded));

    const service = new WishlistService();

    expect(service.has('seeded_item')).toBeTrue();
    expect(service.getItems().length).toBe(1);
    expect(service.getItems()[0].displayName).toBe('Linen White');
  });

  it('should ignore invalid items', () => {
    const service = new WishlistService();
    const invalidItem = {
      ...buildItem(''),
      key: '',
      variantKey: ''
    } as WishlistItem;

    const added = service.add(invalidItem);

    expect(added).toBeFalse();
    expect(service.getItems().length).toBe(0);
  });

  it('should replace wishlist items in bulk', () => {
    const service = new WishlistService();
    service.add(buildItem('old_item'));

    const next = [buildItem('new_item_1'), buildItem('new_item_2')];
    service.replaceItems(next);

    expect(service.has('old_item')).toBeFalse();
    expect(service.has('new_item_1')).toBeTrue();
    expect(service.has('new_item_2')).toBeTrue();
    expect(service.getItems().length).toBe(2);
  });
});
