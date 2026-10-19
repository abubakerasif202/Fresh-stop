export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  price: number; // In AUD (e.g. 3.99)
  priceCents: number; // In integer cents (e.g. 399)
  unit: string;
  imageUrl: string;
  imageAlt?: string | null;
  taxCategory: "GST_FREE" | "TAXABLE_10";
  quantity: number;
}

export interface CartTotals {
  itemCount: number;
  subtotal: number;
  subtotalCents: number;
  gstTotal: number;
  gstTotalCents: number;
  deliveryFee: number;
  deliveryFeeCents: number;
  total: number;
  totalCents: number;
}

export const MIN_ORDER_AMOUNT = 50.0;
export const FREE_DELIVERY_THRESHOLD = 150.0;
export const STANDARD_DELIVERY_FEE = 9.99;
