import { Resend } from "resend";
import { CONTACT } from "./contact";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  fulfillmentType: string;
  deliveryAddress?: string | null;
  deliverySuburb?: string | null;
  deliveryPostcode?: string | null;
  deliveryNotes?: string | null;
  preferredDeliveryDate?: string | null;
  items: Array<{
    name: string;
    unit: string;
    quantity: number;
    priceDollars: number;
    totalDollars: number;
  }>;
  subtotal: number;
  deliveryFee: number;
  gstTotal: number;
  total: number;
}

export async function sendOrderConfirmationEmails(data: OrderEmailData): Promise<{ success: boolean; customerSent: boolean; adminSent: boolean; error?: string }> {
  const storeEmail = process.env.ORDERS_NOTIFICATION_EMAIL || CONTACT.email;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "Fresh Stop <orders@freshstop.com.au>";

  if (!resend) {
    console.log(`[EMAIL NOTICE] RESEND_API_KEY is not configured. Simulating order confirmation email for ${data.orderNumber} to ${data.customerEmail}.`);
    return { success: true, customerSent: false, adminSent: false };
  }

  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; font-weight: bold; color: #0B3D1B;">
          ${item.name} <span style="font-size: 12px; font-weight: normal; color: #666;">(${item.unit})</span>
        </td>
        <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; text-align: center; color: #333;">
          ${item.quantity}
        </td>
        <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; text-align: right; color: #333;">
          $${item.priceDollars.toFixed(2)}
        </td>
        <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; text-align: right; font-weight: bold; color: #0B3D1B;">
          $${item.totalDollars.toFixed(2)}
        </td>
      </tr>
    `
    )
    .join("");

  const emailHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #FFFDF9; border: 1px solid #EFE8DC; border-radius: 16px; overflow: hidden; padding: 28px;">
      <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #0B3D1B;">
        <h1 style="color: #0B3D1B; margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -0.5px;">FRESH STOP</h1>
        <p style="color: #7A2E1E; margin: 4px 0 0; font-size: 13px; font-weight: bold; text-transform: uppercase;">Sydney Farm Fresh Produce &amp; Groceries</p>
      </div>

      <div style="padding: 24px 0;">
        <h2 style="color: #0B3D1B; font-size: 20px; margin-top: 0;">Order Confirmed! 🎉</h2>
        <p style="color: #444; font-size: 15px; line-height: 1.6;">
          Hi ${data.customerName},<br />
          Thank you for shopping with Fresh Stop. Your payment has been received and our team is preparing your fresh order.
        </p>

        <div style="background: #F4EFE6; border-radius: 12px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #0B3D1B;">
            <strong>Order Reference:</strong> ${data.orderNumber}<br />
            <strong>Fulfillment:</strong> ${data.fulfillmentType === "DELIVERY" ? "Home Delivery" : "Store Pickup"}<br />
            ${
              data.fulfillmentType === "DELIVERY"
                ? `<strong>Delivery Address:</strong> ${data.deliveryAddress}, ${data.deliverySuburb} ${data.deliveryPostcode}<br />`
                : ""
            }
            ${data.preferredDeliveryDate ? `<strong>Preferred Date:</strong> ${data.preferredDeliveryDate}<br />` : ""}
            ${data.deliveryNotes ? `<strong>Special Notes:</strong> ${data.deliveryNotes}<br />` : ""}
          </p>
        </div>

        <h3 style="color: #0B3D1B; font-size: 16px; margin-bottom: 10px;">Order Items</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="border-bottom: 2px solid #0B3D1B; color: #0B3D1B;">
              <th style="text-align: left; padding: 8px 0;">Product</th>
              <th style="text-align: center; padding: 8px 0;">Qty</th>
              <th style="text-align: right; padding: 8px 0;">Price</th>
              <th style="text-align: right; padding: 8px 0;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="margin-top: 20px; padding-top: 14px; border-top: 2px solid #0B3D1B;">
          <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 6px; color: #555;">
            <span>Subtotal:</span>
            <span>$${data.subtotal.toFixed(2)} AUD</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 6px; color: #555;">
            <span>Delivery:</span>
            <span>${data.deliveryFee === 0 ? "FREE" : `$${data.deliveryFee.toFixed(2)} AUD`}</span>
          </div>
          ${
            data.gstTotal > 0
              ? `
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px; color: #777;">
              <span>Included GST:</span>
              <span>$${data.gstTotal.toFixed(2)} AUD</span>
            </div>
          `
              : ""
          }
          <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: 900; color: #0B3D1B; margin-top: 10px;">
            <span>Total Paid:</span>
            <span>$${data.total.toFixed(2)} AUD</span>
          </div>
        </div>
      </div>

      <div style="border-top: 1px solid #EFE8DC; padding-top: 20px; text-align: center; font-size: 13px; color: #777;">
        <p style="margin: 0;">Need help with your order? Contact Fresh Stop Sydney</p>
        <p style="margin: 4px 0 0;">
          <strong>Phone:</strong> ${CONTACT.phoneDisplay} | <strong>Email:</strong> ${CONTACT.email}
        </p>
      </div>
    </div>
  `;

  let customerSent = false;
  let adminSent = false;

  try {
    // 1. Send to Customer
    await resend.emails.send({
      from: fromEmail,
      to: [data.customerEmail],
      subject: `Fresh Stop Order Confirmation #${data.orderNumber}`,
      html: emailHtml
    });
    customerSent = true;
  } catch (err) {
    console.error("Failed to send customer order confirmation email:", err);
  }

  try {
    // 2. Send to Fresh Stop Admin
    await resend.emails.send({
      from: fromEmail,
      to: [storeEmail],
      subject: `🚨 [New Order] #${data.orderNumber} ($${data.total.toFixed(2)}) — ${data.customerName}`,
      html: `
        <h2>New Paid Online Order</h2>
        <p><strong>Order Number:</strong> ${data.orderNumber}</p>
        <p><strong>Customer:</strong> ${data.customerName} (${data.customerPhone}, ${data.customerEmail})</p>
        <p><strong>Fulfillment:</strong> ${data.fulfillmentType}</p>
        <p><strong>Address:</strong> ${data.deliveryAddress || "N/A"}, ${data.deliverySuburb || ""} ${data.deliveryPostcode || ""}</p>
        <p><strong>Total:</strong> $${data.total.toFixed(2)} AUD</p>
        ${emailHtml}
      `
    });
    adminSent = true;
  } catch (err) {
    console.error("Failed to send admin order notification email:", err);
  }

  return { success: true, customerSent, adminSent };
}
