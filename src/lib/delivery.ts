export const MIN_ORDER_AMOUNT = 50.0;
export const FREE_DELIVERY_THRESHOLD = 150.0;
export const STANDARD_DELIVERY_FEE = 9.99;

export const ST_GEORGE_POSTCODES = ["2216", "2217", "2218", "2220", "2205", "2207", "2219", "2221"] as const;
export const CANTERBURY_POSTCODES = ["2210", "2209", "2211", "2212", "2196", "2213", "2208", "2214"] as const;

export interface DeliveryCheckResult {
  eligible: boolean;
  assignedBranch: "rockdale" | "riverwood" | null;
  zoneName: string | null;
  deliveryFee: number;
  isFreeDelivery: boolean;
  freeDeliveryThreshold: number;
  amountToFreeDelivery: number;
  meetsMinimumSpend: boolean;
  minOrderAmount: number;
  amountToMinimumSpend: number;
  message: string;
}

const roundCurrency = (val: number) => Math.max(0, Number(val.toFixed(2)));

export function checkDeliveryEligibility(postcode: string, subtotal: number): DeliveryCheckResult {
  const cleanPostcode = postcode.trim();
  const minOrderAmount = MIN_ORDER_AMOUNT;
  const freeDeliveryThreshold = FREE_DELIVERY_THRESHOLD;

  let assignedBranch: "rockdale" | "riverwood" | null = null;
  let zoneName: string | null = null;

  if ((ST_GEORGE_POSTCODES as readonly string[]).includes(cleanPostcode)) {
    assignedBranch = "rockdale";
    zoneName = "St George & Bayside (Dispatched from Rockdale)";
  } else if ((CANTERBURY_POSTCODES as readonly string[]).includes(cleanPostcode)) {
    assignedBranch = "riverwood";
    zoneName = "Canterbury-Bankstown (Dispatched from Riverwood)";
  }

  if (!assignedBranch) {
    return {
      eligible: false,
      assignedBranch: null,
      zoneName: null,
      deliveryFee: 0,
      isFreeDelivery: false,
      freeDeliveryThreshold,
      amountToFreeDelivery: roundCurrency(freeDeliveryThreshold - subtotal),
      meetsMinimumSpend: subtotal >= minOrderAmount,
      minOrderAmount,
      amountToMinimumSpend: roundCurrency(minOrderAmount - subtotal),
      message: "Postcode is outside our primary delivery corridors. Click & Collect is available at both stores!"
    };
  }

  const meetsMinimumSpend = subtotal >= minOrderAmount;
  const isFreeDelivery = subtotal >= freeDeliveryThreshold;
  const deliveryFee = isFreeDelivery ? 0.0 : STANDARD_DELIVERY_FEE;

  return {
    eligible: true,
    assignedBranch,
    zoneName,
    deliveryFee,
    isFreeDelivery,
    freeDeliveryThreshold,
    amountToFreeDelivery: roundCurrency(freeDeliveryThreshold - subtotal),
    meetsMinimumSpend,
    minOrderAmount,
    amountToMinimumSpend: roundCurrency(minOrderAmount - subtotal),
    message: isFreeDelivery
      ? "You've unlocked FREE local home delivery!"
      : meetsMinimumSpend
      ? `Delivery fee is $${STANDARD_DELIVERY_FEE.toFixed(2)}. Add $${(freeDeliveryThreshold - subtotal).toFixed(2)} more for FREE delivery!`
      : `Minimum order for delivery is $${minOrderAmount.toFixed(2)}. Please add $${(minOrderAmount - subtotal).toFixed(2)} to continue.`
  };
}
