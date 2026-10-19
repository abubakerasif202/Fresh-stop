import { db } from "@/lib/db";
import { usesReviewedSnapshot } from "@/lib/catalogue-data";
import { Store, Truck, ShoppingBag, DollarSign, Tag, Settings, ExternalLink } from "lucide-react";
import Link from "next/link";
import { OrderStatusSelect } from "./OrderStatusSelect";

export const dynamic = "force-dynamic";

interface OrderItem {
  name: string;
  quantity: number;
  unit?: string;
  price: number;
}

function parseItems(json: string): OrderItem[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const telHref = (phone: string) => `tel:${phone.replace(/[^0-9+]/g, "")}`;

const formatDate = (d: Date) =>
  new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

const cardClass = "rounded-2xl border border-cream-deep bg-white shadow-soft";
const chipLink =
  "inline-flex min-h-10 items-center gap-1.5 rounded-full border border-forest/20 bg-white px-4 text-xs font-bold text-forest shadow-soft transition hover:bg-leaf-soft focus-visible:outline-3 focus-visible:outline-citrus";

export default async function AdminPage() {
  if (usesReviewedSnapshot()) return (
    <div className="page-width py-12">
      <p className="eyebrow text-deep-green">Protected operator portal</p>
      <h1 className="section-title mt-4">Catalogue review</h1>
      <p className="mt-5 max-w-2xl leading-relaxed text-ink-soft">This Preview is read-only. Review catalogue names, images and proposed entries here. Database changes are disabled; historical customer orders remain protected in the live administration system.</p>
      <Link className="button button-green mt-7" href="/admin/products">Review catalogue products</Link>
    </div>
  );
  const [orders, branches] = await Promise.all([
    db.order.findMany({ include: { storeBranch: true }, orderBy: { createdAt: "desc" } }),
    db.storeBranch.findMany({ where: { isActive: true }, orderBy: { name: "asc" } })
  ]);

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const pickupOrders = orders.filter((o) => o.fulfillmentType === "PICKUP");
  const deliveryOrders = orders.filter((o) => o.fulfillmentType === "DELIVERY");
  const activeOrders = orders.filter((o) => ["RECEIVED", "PREPARING", "READY"].includes(o.orderStatus));

  const stats = [
    { label: "Total orders", value: String(orders.length), note: `${activeOrders.length} active in progress`, Icon: ShoppingBag, tint: "bg-sun" },
    { label: "Click & Collect", value: String(pickupOrders.length), note: "Rockdale & Riverwood hubs", Icon: Store, tint: "bg-leaf" },
    { label: "Sydney dispatches", value: String(deliveryOrders.length), note: "St George & Canterbury zones", Icon: Truck, tint: "bg-citrus" },
    { label: "Sales volume", value: `$${totalRevenue.toFixed(2)}`, note: "AUD gross merchandise value", Icon: DollarSign, tint: "bg-forest text-cream" }
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <header className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-leaf-soft px-3 py-1 text-xs font-bold text-forest">
            <span className="h-2 w-2 animate-pulse rounded-full bg-forest" aria-hidden="true" />
            Multi-branch live operations
          </span>
          <h1 className="font-display text-3xl font-black tracking-tight text-forest sm:text-4xl">
            Fresh Stop operator portal
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Real-time fulfillment management across Rockdale &amp; Riverwood.
          </p>
        </div>
        <nav aria-label="Portal shortcuts" className="flex flex-wrap gap-2">
          <Link href="/admin/products" className={chipLink}>
            <Store className="h-4 w-4" aria-hidden="true" />
            <span>Products</span>
          </Link>
          <Link href="/admin/pricing" className={chipLink}>
            <Tag className="h-4 w-4" aria-hidden="true" />
            <span>Sydney Pricing</span>
          </Link>
          <Link href="/admin/orders" className={chipLink}>
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            <span>Orders</span>
          </Link>
          <Link href="/admin/delivery" className={chipLink}>
            <Truck className="h-4 w-4" aria-hidden="true" />
            <span>Delivery Zones</span>
          </Link>
          <Link href="/admin/settings" className={chipLink}>
            <Settings className="h-4 w-4" aria-hidden="true" />
            <span>Settings</span>
          </Link>
          <Link href="/products" className={chipLink}>
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            <span>Storefront</span>
          </Link>
        </nav>
      </header>

      <section aria-label="Key figures" className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, note, Icon, tint }) => (
          <div key={label} className={`${cardClass} p-4 sm:p-5`}>
            <div className="mb-3 flex items-center justify-between text-xs font-semibold text-ink-soft">
              <span>{label}</span>
              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-ink ${tint}`}>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <div className="font-display text-2xl font-black text-ink sm:text-3xl">{value}</div>
            <div className="mt-1 text-[11px] text-ink-soft">{note}</div>
          </div>
        ))}
      </section>

      <section aria-label="Branches" className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        {branches.map((b) => {
          const branchOrders = orders.filter((o) => o.storeBranchId === b.id);
          const branchRevenue = branchOrders.reduce((sum, o) => sum + o.total, 0);
          return (
            <div key={b.id} className={`${cardClass} p-5`}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-black text-forest">{b.name}</h2>
                  <p className="text-xs text-ink-soft">
                    {b.address}, {b.suburb} NSW {b.postcode}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-leaf px-2.5 py-0.5 text-[11px] font-bold text-ink">
                  Online
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-cream-deep pt-3 text-xs text-ink-soft">
                <div>
                  Phone:{" "}
                  <a href={telHref(b.phone)} className="font-semibold text-ink underline-offset-2 hover:underline">
                    {b.phone}
                  </a>
                </div>
                <div>
                  Orders: <strong className="text-ink">{branchOrders.length}</strong> (${branchRevenue.toFixed(2)})
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section aria-labelledby="orders-heading" className={`${cardClass} overflow-hidden`}>
        <div className="border-b border-cream-deep bg-cream-deep/50 p-5">
          <h2 id="orders-heading" className="font-display text-xl font-black text-forest">
            Recent customer orders ({orders.length})
          </h2>
          <p className="mt-0.5 text-xs text-ink-soft">Use the status menu on each order to advance fulfillment.</p>
        </div>

        {orders.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingBag className="mx-auto mb-2 h-8 w-8 text-leaf" aria-hidden="true" />
            <p className="text-sm font-bold text-ink">No orders logged yet</p>
            <p className="mt-1 text-xs text-ink-soft">Historical order records are retained here. Customer online ordering has been retired.</p>
          </div>
        ) : (
          <>
            {/* Mobile: card layout */}
            <ul className="divide-y divide-cream-deep md:hidden">
              {orders.map((o) => {
                const items = parseItems(o.itemsJson);
                const isPickup = o.fulfillmentType === "PICKUP";
                return (
                  <li key={o.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/order-confirmation/${o.id}`}
                          className="inline-flex items-center gap-1 font-black text-forest hover:underline"
                        >
                          {o.orderNumber}
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </Link>
                        <div className="text-[11px] text-ink-soft">{formatDate(o.createdAt)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-ink">${o.total.toFixed(2)}</div>
                        <PaymentBadge method={o.paymentMethod} status={o.paymentStatus} />
                      </div>
                    </div>
                    <div className="text-sm">
                      <div className="font-bold text-ink">{o.customerName}</div>
                      <a href={telHref(o.customerPhone)} className="text-xs text-ink-soft underline-offset-2 hover:underline">
                        {o.customerPhone}
                      </a>
                      <div className="break-all text-xs text-ink-soft">{o.customerEmail}</div>
                    </div>
                    <div className="space-y-1 text-xs text-ink-soft">
                      <FulfillmentBadge isPickup={isPickup} />
                      <p>
                        <span className="font-semibold text-ink">{o.storeBranch?.name.replace("Fresh Stop ", "") || "Sydney Hub"}</span>
                        {" · "}
                        {isPickup ? o.pickupTimeslot || "Ready in 2h" : `${o.deliveryAddress}, ${o.deliveryPostcode}`}
                      </p>
                      <p>{items.map((it) => `${it.name} (${it.quantity})`).join(", ") || "No items"}</p>
                    </div>
                    <OrderStatusSelect orderId={o.id} orderNumber={o.orderNumber} initialStatus={o.orderStatus} />
                  </li>
                );
              })}
            </ul>

            {/* Desktop: table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-xs">
                <caption className="sr-only">Recent customer orders</caption>
                <thead className="border-b border-cream-deep bg-cream text-[11px] font-bold uppercase text-ink-soft">
                  <tr>
                    <th scope="col" className="p-3.5">Order</th>
                    <th scope="col" className="p-3.5">Customer</th>
                    <th scope="col" className="p-3.5">Branch</th>
                    <th scope="col" className="p-3.5">Fulfillment</th>
                    <th scope="col" className="p-3.5">Items</th>
                    <th scope="col" className="p-3.5">Total &amp; payment</th>
                    <th scope="col" className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-deep text-ink">
                  {orders.map((o) => {
                    const items = parseItems(o.itemsJson);
                    const isPickup = o.fulfillmentType === "PICKUP";
                    return (
                      <tr key={o.id} className="transition hover:bg-cream">
                        <td className="p-3.5 align-top">
                          <Link
                            href={`/order-confirmation/${o.id}`}
                            className="inline-flex items-center gap-1 font-black text-forest hover:underline"
                          >
                            <span>{o.orderNumber}</span>
                            <ExternalLink className="h-3 w-3" aria-hidden="true" />
                          </Link>
                          <div className="mt-0.5 text-[11px] text-ink-soft">{formatDate(o.createdAt)}</div>
                        </td>
                        <td className="p-3.5 align-top">
                          <div className="font-bold">{o.customerName}</div>
                          <a href={telHref(o.customerPhone)} className="mt-0.5 block text-[11px] text-ink-soft hover:underline">
                            {o.customerPhone}
                          </a>
                          <div className="max-w-[160px] truncate text-[11px] text-ink-soft" title={o.customerEmail}>
                            {o.customerEmail}
                          </div>
                        </td>
                        <td className="p-3.5 align-top font-semibold">{o.storeBranch?.name.replace("Fresh Stop ", "") || "Sydney Hub"}</td>
                        <td className="p-3.5 align-top">
                          <FulfillmentBadge isPickup={isPickup} />
                          <p className="mt-1 text-[11px] text-ink-soft">
                            {isPickup ? o.pickupTimeslot || "Ready in 2h" : `${o.deliveryAddress}, ${o.deliveryPostcode}`}
                          </p>
                        </td>
                        <td className="p-3.5 align-top">
                          <div className="text-[11px] font-semibold">
                            {items.length} line {items.length === 1 ? "item" : "items"}
                          </div>
                          <div className="mt-0.5 line-clamp-2 max-w-[200px] text-[11px] text-ink-soft">
                            {items.map((it) => `${it.name} (${it.quantity})`).join(", ")}
                          </div>
                        </td>
                        <td className="p-3.5 align-top">
                          <div className="font-black">${o.total.toFixed(2)} AUD</div>
                          <PaymentBadge method={o.paymentMethod} status={o.paymentStatus} />
                        </td>
                        <td className="p-3.5 align-top">
                          <OrderStatusSelect orderId={o.id} orderNumber={o.orderNumber} initialStatus={o.orderStatus} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function FulfillmentBadge({ isPickup }: { isPickup: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold text-ink ${
        isPickup ? "bg-leaf-soft" : "bg-sun"
      }`}
    >
      {isPickup ? <Store className="h-3 w-3" aria-hidden="true" /> : <Truck className="h-3 w-3" aria-hidden="true" />}
      <span>{isPickup ? "Click & Collect" : "Sydney Delivery"}</span>
    </span>
  );
}

function PaymentBadge({ method, status }: { method: string; status: string }) {
  const paid = status === "PAID";
  return (
    <div className="mt-1 flex flex-wrap items-center justify-end gap-1.5 md:justify-start">
      <span className="text-[11px] text-ink-soft">{method === "STRIPE" ? "Card" : "Pay at collection"}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
          paid ? "bg-forest text-cream" : "bg-cream-deep text-ink"
        }`}
      >
        {status}
      </span>
    </div>
  );
}
