import { db } from "@/lib/db";
import { Store, Truck, ShoppingBag, DollarSign, Clock, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import Link from "next/link";
import { OrderStatusSelect } from "./OrderStatusSelect";

export const dynamic = "force-dynamic";

interface OrderItem {
  name: string;
  quantity: number;
  unit?: string;
  price: number;
}

export default async function AdminPage() {
  const [orders, branches] = await Promise.all([
    db.order.findMany({
      include: { storeBranch: true },
      orderBy: { createdAt: "desc" }
    }),
    db.storeBranch.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" }
    })
  ]);

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const pickupOrders = orders.filter((o) => o.fulfillmentType === "PICKUP");
  const deliveryOrders = orders.filter((o) => o.fulfillmentType === "DELIVERY");
  const activeOrders = orders.filter((o) => ["RECEIVED", "PREPARING", "READY"].includes(o.orderStatus));

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-800 border border-green-200 mb-2">
            <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse" aria-hidden="true" />
            <span>Multi-Branch Live Operations</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Fresh Stop Operator Portal</h1>
          <p className="text-xs text-slate-600 mt-1">
            Real-time fulfillment management across Rockdale &amp; Riverwood store branches.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-green-800 bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-2xs hover:shadow-xs transition"
          >
            <ShoppingBag className="h-4 w-4 text-green-700" aria-hidden="true" />
            <span>Storefront Catalog</span>
          </Link>
          <Link
            href="/stores"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-green-800 bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-2xs hover:shadow-xs transition"
          >
            <Store className="h-4 w-4 text-green-700" aria-hidden="true" />
            <span>Store Locations</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Total Orders Logged</span>
            <ShoppingBag className="h-4 w-4 text-slate-400" aria-hidden="true" />
          </div>
          <div className="text-2xl font-black text-slate-900">{orders.length}</div>
          <div className="text-[11px] text-green-700 font-semibold mt-1">
            {activeOrders.length} active in progress
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Click &amp; Collect</span>
            <Store className="h-4 w-4 text-blue-500" aria-hidden="true" />
          </div>
          <div className="text-2xl font-black text-slate-900">{pickupOrders.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Rockdale &amp; Riverwood hubs</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Sydney Dispatches</span>
            <Truck className="h-4 w-4 text-purple-500" aria-hidden="true" />
          </div>
          <div className="text-2xl font-black text-slate-900">{deliveryOrders.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">St George &amp; Canterbury zones</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Total Sales Volume</span>
            <DollarSign className="h-4 w-4 text-green-600" aria-hidden="true" />
          </div>
          <div className="text-2xl font-black text-green-700">${totalRevenue.toFixed(2)}</div>
          <div className="text-[11px] text-slate-500 mt-1">AUD gross merchandise value</div>
        </div>
      </div>

      {/* Store Branch Operations Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {branches.map((b) => {
          const branchOrders = orders.filter((o) => o.storeBranchId === b.id);
          const branchRevenue = branchOrders.reduce((sum, o) => sum + o.total, 0);

          return (
            <div key={b.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h2 className="font-black text-slate-900 text-base">{b.name}</h2>
                  <p className="text-xs text-slate-500">
                    {b.address}, {b.suburb} NSW {b.postcode}
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">
                  Online Active
                </span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-600">
                <div>
                  Phone: <a href={`tel:${b.phone.replace(/[^0-9+]/g, "")}`} className="font-semibold text-slate-800 hover:underline">{b.phone}</a>
                </div>
                <div>
                  Assigned Orders: <strong className="text-slate-900">{branchOrders.length}</strong> (${branchRevenue.toFixed(2)})
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-900">Recent Customer Orders ({orders.length})</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click status badges to advance order fulfillment lifecycle.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 text-slate-600 uppercase font-bold text-[11px] border-b border-slate-200">
              <tr>
                <th scope="col" className="p-3.5">Order</th>
                <th scope="col" className="p-3.5">Customer</th>
                <th scope="col" className="p-3.5">Branch Hub</th>
                <th scope="col" className="p-3.5">Fulfillment &amp; Target</th>
                <th scope="col" className="p-3.5">Items Summary</th>
                <th scope="col" className="p-3.5">Total &amp; Payment</th>
                <th scope="col" className="p-3.5">Fulfillment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <ShoppingBag className="h-8 w-8 mx-auto mb-2 text-slate-300" aria-hidden="true" />
                    <p className="font-semibold text-sm text-slate-600">No orders logged yet</p>
                    <p className="text-xs text-slate-400 mt-1">
                      New orders placed through checkout will immediately populate here.
                    </p>
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  let itemsList: OrderItem[] = [];
                  try {
                    const parsed = JSON.parse(o.itemsJson);
                    if (Array.isArray(parsed)) itemsList = parsed;
                  } catch {
                    itemsList = [];
                  }

                  const isPickup = o.fulfillmentType === "PICKUP";

                  return (
                    <tr key={o.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3.5 align-top">
                        <Link
                          href={`/order-confirmation/${o.id}`}
                          className="font-black text-slate-900 hover:text-green-700 inline-flex items-center gap-1"
                        >
                          <span>{o.orderNumber}</span>
                          <ExternalLink className="h-3 w-3 text-slate-400" aria-hidden="true" />
                        </Link>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(o.createdAt).toLocaleDateString("en-AU", {
                            day: "numeric",
                            month: "short",
                            hour: "numeric",
                            minute: "2-digit"
                          })}
                        </div>
                      </td>

                      <td className="p-3.5 align-top">
                        <div className="font-bold text-slate-900">{o.customerName}</div>
                        <a
                          href={`tel:${o.customerPhone.replace(/[^0-9+]/g, "")}`}
                          className="text-[11px] text-slate-500 hover:text-green-700 block mt-0.5"
                        >
                          {o.customerPhone}
                        </a>
                        <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{o.customerEmail}</div>
                      </td>

                      <td className="p-3.5 align-top font-semibold text-slate-800">
                        {o.storeBranch.name.replace("Fresh Stop ", "")}
                      </td>

                      <td className="p-3.5 align-top">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[10px] ${
                              isPickup ? "bg-blue-50 text-blue-800" : "bg-purple-50 text-purple-800"
                            }`}
                          >
                            {isPickup ? (
                              <Store className="h-3 w-3" aria-hidden="true" />
                            ) : (
                              <Truck className="h-3 w-3" aria-hidden="true" />
                            )}
                            <span>{isPickup ? "Click & Collect" : "Sydney Delivery"}</span>
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          {isPickup ? o.pickupTimeslot || "Ready in 2h" : `${o.deliveryAddress}, ${o.deliveryPostcode}`}
                        </p>
                      </td>

                      <td className="p-3.5 align-top">
                        <div className="text-[11px] font-medium text-slate-800">
                          {itemsList.length} line {itemsList.length === 1 ? "item" : "items"}:
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 max-w-[180px] line-clamp-2">
                          {itemsList.map((it) => `${it.name} (${it.quantity})`).join(", ")}
                        </div>
                      </td>

                      <td className="p-3.5 align-top">
                        <div className="font-black text-slate-900">${o.total.toFixed(2)} AUD</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {o.paymentMethod === "STRIPE" ? "Stripe Card" : "Pay at Collection"}
                        </div>
                        <span
                          className={`inline-block mt-1 text-[9px] font-bold px-2 py-0.2 rounded-full ${
                            o.paymentStatus === "PAID"
                              ? "bg-green-100 text-green-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {o.paymentStatus}
                        </span>
                      </td>

                      <td className="p-3.5 align-top">
                        <OrderStatusSelect orderId={o.id} initialStatus={o.orderStatus} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
