export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  price: number; // In AUD (e.g. 3.99); display only, never trusted by the server
  priceCents: number; // In integer cents (e.g. 399); display only, never trusted by the server
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

// Delivery fees, free-delivery thresholds and minimum orders are NOT defined here.
// They come only from admin-approved DeliveryZone rows via /api/delivery/check.
