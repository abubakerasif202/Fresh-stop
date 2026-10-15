export const ST_GEORGE_POSTCODES = ["2216", "2217", "2218", "2220", "2205", "2207", "2219", "2221"];
export const CANTERBURY_POSTCODES = ["2210", "2209", "2211", "2212", "2196", "2213", "2208", "2214"];

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

export function checkDeliveryEligibility(postcode: string, subtotal: number): DeliveryCheckResult {
  const cleanPostcode = postcode.trim();
  const minOrderAmount = 50.0;
  const freeDeliveryThreshold = 150.0;

  let assignedBranch: "rockdale" | "riverwood" | null = null;
  let zoneName: string | null = null;

  if (ST_GEORGE_POSTCODES.includes(cleanPostcode)) {
    assignedBranch = "rockdale";
    zoneName = "St George & Bayside (Dispatched from Rockdale)";
  } else if (CANTERBURY_POSTCODES.includes(cleanPostcode)) {
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
      amountToFreeDelivery: Math.max(0, freeDeliveryThreshold - subtotal),
      meetsMinimumSpend: subtotal >= minOrderAmount,
      minOrderAmount,
      amountToMinimumSpend: Math.max(0, minOrderAmount - subtotal),
      message: "Postcode is outside our primary delivery corridors. Click & Collect is available at both stores!"
    };
  }

  const meetsMinimumSpend = subtotal >= minOrderAmount;
  const isFreeDelivery = subtotal >= freeDeliveryThreshold;
  const deliveryFee = isFreeDelivery ? 0.0 : 9.99;

  return {
    eligible: true,
    assignedBranch,
    zoneName,
    deliveryFee,
    isFreeDelivery,
    freeDeliveryThreshold,
    amountToFreeDelivery: Math.max(0, Number((freeDeliveryThreshold - subtotal).toFixed(2))),
    meetsMinimumSpend,
    minOrderAmount,
    amountToMinimumSpend: Math.max(0, Number((minOrderAmount - subtotal).toFixed(2))),
    message: isFreeDelivery
      ? "You've unlocked FREE local home delivery!"
      : meetsMinimumSpend
      ? `Delivery fee is $9.99. Add $${(freeDeliveryThreshold - subtotal).toFixed(2)} more for FREE delivery!`
      : `Minimum order for delivery is $50.00. Please add $${(minOrderAmount - subtotal).toFixed(2)} to continue.`
  };
}
