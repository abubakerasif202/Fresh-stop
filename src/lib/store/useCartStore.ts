import { create } from "zustand";
import { persist } from "zustand/middleware";
import { checkDeliveryEligibility } from "../delivery";
import { MAX_ITEM_QUANTITY } from "../checkout-pricing";

export interface CartProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  unit: string;
  imageUrl: string;
}

export interface CartItem extends CartProduct {
  quantity: number;
}

export interface CartState {
  items: CartItem[];
  fulfillmentType: "PICKUP" | "DELIVERY";
  deliveryPostcode: string;
  deliveryFee: number;
  isOpen: boolean;
  addItem: (product: CartProduct, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setFulfillmentType: (type: "PICKUP" | "DELIVERY") => void;
  setDeliveryPostcode: (postcode: string, fee: number) => void;
  openCart: () => void;
  closeCart: () => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTotal: () => number;
  getTotalCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      fulfillmentType: "PICKUP",
      deliveryPostcode: "",
      deliveryFee: 0,
      isOpen: false,

      addItem: (product, quantity = 1) => {
        if (!Number.isInteger(quantity) || quantity <= 0 || quantity > MAX_ITEM_QUANTITY) return;
        set((state) => {
          const existing = state.items.find((item) => item.id === product.id);
          if (existing) {
            return {
              items: state.items.map((item) =>
                item.id === product.id ? { ...item, quantity: Math.min(MAX_ITEM_QUANTITY, item.quantity + quantity) } : item
              ),
              isOpen: true
            };
          }
          return { items: [...state.items, { ...product, quantity }], isOpen: true };
        });
      },

      removeItem: (productId) => {
        set((state) => ({ items: state.items.filter((item) => item.id !== productId) }));
      },

      updateQuantity: (productId, quantity) => {
        if (!Number.isInteger(quantity) || quantity > MAX_ITEM_QUANTITY) return;
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set((state) => ({
          items: state.items.map((item) => (item.id === productId ? { ...item, quantity } : item))
        }));
      },

      setFulfillmentType: (fulfillmentType) => set({ fulfillmentType }),
      setDeliveryPostcode: (deliveryPostcode, deliveryFee) => set({ deliveryPostcode, deliveryFee }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      clearCart: () => set({ items: [], deliveryFee: 0 }),

      getSubtotal: () => {
        return Number(
          get()
            .items.reduce((sum, item) => sum + item.price * item.quantity, 0)
            .toFixed(2)
        );
      },

      getTotal: () => {
        const subtotal = get().getSubtotal();
        const delivery = checkDeliveryEligibility(get().deliveryPostcode, subtotal);
        const fee = get().fulfillmentType === "DELIVERY" && delivery.eligible ? delivery.deliveryFee : 0;
        return Number((subtotal + fee).toFixed(2));
      },

      getTotalCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      }
    }),
    {
      name: "fresh-stop-cart-v1",
      partialize: (state) => ({
        items: state.items,
        fulfillmentType: state.fulfillmentType,
        deliveryPostcode: state.deliveryPostcode,
        deliveryFee: state.deliveryFee
      })
    }
  )
);

export const selectCartItems = (state: CartState) => state.items;
export const selectCartCount = (state: CartState) => state.getTotalCount();
export const selectCartSubtotal = (state: CartState) => state.getSubtotal();
export const selectCartTotal = (state: CartState) => state.getTotal();
