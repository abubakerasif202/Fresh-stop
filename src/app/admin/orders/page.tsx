import Link from "next/link";
import { ArrowLeft, ShoppingBag, Truck, Store } from "lucide-react";
import { db } from "@/lib/db";
import { OrderStatusSelect } from "../OrderStatusSelect";

export const dynamic = "force-dynamic";

interface OrderItem {
  name: string;
  quantity: number;
  unit?: string;
  price?: number;
  priceDollars?: number;
}

function parseItems(json: string): OrderItem[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const formatDate = (d: Date) =>
  new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default async function AdminOrdersPage() {
  const orders = await db.order.findMany({
    include: { storeBranch: true, orderItems: true },
    orderBy: { createdAt: "desc" }
  });

  const activeOrders = orders.filter((o) =>
    ["RECEIVED", "PAID", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DISPATCHED"].includes(o.orderStatus)
  );
  const completedOrders = orders.filter((o) => ["DELIVERED", "COMPLETED"].includes(o.orderStatus));
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Link
            href="/admin"
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-forest hover:underline"
          >
            <ArrowLeft size={14} /> Back to Operator Portal
          </Link>
          <h1 className="font-display text-3xl font-black tracking-tight text-forest sm:text-4xl">
            Customer Orders &amp; Fulfillment
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Manage live grocery fulfillment across Sydney delivery routes and Rockdale/Riverwood hubs.
          </p>
        </div>

        <div className="flex gap-2">
          <Link href="/admin/pricing" className="button button-outline text-forest text-xs">
            Pricing Dashboard
          </Link>
        </div>
      </div>

      {/* Figures */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-forest/10 bg-white p-5 shadow-soft">
          <span className="text-xs font-bold text-ink-soft">Active Orders</span>
          <p className="font-display text-3xl font-black text-amber-800 mt-1">{activeOrders.length}</p>
          <span className="text-[11px] text-ink-soft">Currently being prepared or dispatched</span>
        </div>

        <div className="rounded-2xl border border-forest/10 bg-white p-5 shadow-soft">
          <span className="text-xs font-bold text-ink-soft">Completed</span>
          <p className="font-display text-3xl font-black text-deep-green mt-1">{completedOrders.length}</p>
          <span className="text-[11px] text-ink-soft">Delivered or collected</span>
        </div>

        <div className="rounded-2xl border border-forest/10 bg-white p-5 shadow-soft">
          <span className="text-xs font-bold text-ink-soft">Total Volume</span>
          <p className="font-display text-3xl font-black text-forest mt-1">{orders.length}</p>
          <span className="text-[11px] text-ink-soft">Total orders placed</span>
        </div>

        <div className="rounded-2xl border border-forest/10 bg-white p-5 shadow-soft">
          <span className="text-xs font-bold text-ink-soft">Gross Merchandise</span>
          <p className="font-display text-3xl font-black text-forest mt-1">${totalRevenue.toFixed(2)}</p>
          <span className="text-[11px] text-ink-soft">AUD sales revenue</span>
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-2xl border border-forest/10 bg-white shadow-soft">
        <div className="border-b border-forest/10 bg-cream/50 p-5 flex items-center justify-between">
          <h2 className="font-display text-xl font-black text-forest">
            Orders ({orders.length})
          </h2>
          <span className="text-xs font-bold text-ink-soft">
            Click status dropdown to update fulfillment
          </span>
        </div>

        {orders.length === 0 ? (
          <div className="p-16 text-center">
            <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-forest/40" />
            <h3 className="font-display text-lg font-black text-forest">No orders received yet</h3>
            <p className="mt-1 text-sm text-ink-soft">
              When customers complete Stripe checkout, orders will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-forest/10 bg-cream/30 text-[11px] font-black uppercase tracking-wider text-forest/70">
                <tr>
                  <th className="py-3 px-4">Order Ref</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer &amp; Address</th>
                  <th className="py-3 px-4">Fulfillment</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Fulfillment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forest/10">
                {orders.map((o) => {
                  const items = o.orderItems.length > 0
                    ? o.orderItems.map(i => ({ name: i.name, quantity: i.quantity, unit: i.unit, price: i.priceCents / 100 }))
                    : parseItems(o.itemsJson);
                  const isPickup = o.fulfillmentType === "PICKUP";

                  return (
                    <tr key={o.id} className="hover:bg-cream/20">
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/order-confirmation/${o.id}`}
                          className="font-mono font-black text-forest hover:underline"
                        >
                          {o.orderNumber}
                        </Link>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-ink-soft whitespace-nowrap">
                        {formatDate(o.createdAt)}
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-bold text-forest">{o.customerName}</p>
                        <p className="text-[11px] text-ink-soft">{o.customerPhone}</p>
                        {!isPickup && (
                          <p className="text-[11px] text-ink-soft truncate max-w-48">
                            {o.deliveryAddress}, {o.deliverySuburb} {o.deliveryPostcode}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isPickup ? "bg-leaf-soft text-deep-green" : "bg-citrus/20 text-forest"
                          }`}
                        >
                          {isPickup ? <Store size={11} /> : <Truck size={11} />}
                          {isPickup ? "Pickup" : "Delivery"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-xs text-forest">
                          {items.length} {items.length === 1 ? "item" : "items"}
                        </span>
                        <p className="text-[10px] text-ink-soft truncate max-w-44">
                          {items.map(i => `${i.quantity}x ${i.name}`).join(", ")}
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-black ${
                            o.paymentStatus === "PAID"
                              ? "bg-leaf-soft text-deep-green"
                              : o.paymentStatus === "FAILED"
                              ? "bg-red-100 text-brand-red"
                              : "bg-sun/20 text-amber-800"
                          }`}
                        >
                          {o.paymentStatus}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-display font-black text-forest whitespace-nowrap">
                        ${o.total.toFixed(2)} AUD
                      </td>

                      <td className="py-3.5 px-4">
                        <OrderStatusSelect
                          orderId={o.id}
                          orderNumber={o.orderNumber}
                          initialStatus={o.orderStatus}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
