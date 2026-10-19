"use client";

import { useState } from "react";
import { Plus, Edit2, Truck } from "lucide-react";

interface DeliveryZoneItem {
  id: string;
  name: string;
  postcodes: string;
  deliveryFee: number;
  freeDeliveryMinSpend: number;
  minOrderAmount: number;
  primaryBranchSlug: string;
  isActive: boolean;
  orderCutoffHour?: number | null;
  deliveryDays?: string | null;
  maxDailyOrders?: number | null;
}

export function DeliveryZoneManager({ initialZones }: { initialZones: DeliveryZoneItem[] }) {
  const [zones, setZones] = useState<DeliveryZoneItem[]>(initialZones);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [postcodes, setPostcodes] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("9.99");
  const [freeDeliveryMinSpend, setFreeDeliveryMinSpend] = useState("150.0");
  const [minOrderAmount, setMinOrderAmount] = useState("50.0");
  const [primaryBranchSlug, setPrimaryBranchSlug] = useState("rockdale");
  const [orderCutoffHour, setOrderCutoffHour] = useState("14");
  const [deliveryDays, setDeliveryDays] = useState("Mon,Tue,Wed,Thu,Fri,Sat");
  const [maxDailyOrders, setMaxDailyOrders] = useState("30");
  const [showAddForm, setShowAddForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const startEdit = (zone: DeliveryZoneItem) => {
    setEditingId(zone.id);
    setName(zone.name);
    setPostcodes(zone.postcodes);
    setDeliveryFee(String(zone.deliveryFee));
    setFreeDeliveryMinSpend(String(zone.freeDeliveryMinSpend));
    setMinOrderAmount(String(zone.minOrderAmount));
    setPrimaryBranchSlug(zone.primaryBranchSlug);
    setOrderCutoffHour(String(zone.orderCutoffHour ?? 14));
    setDeliveryDays(zone.deliveryDays ?? "Mon,Tue,Wed,Thu,Fri,Sat");
    setMaxDailyOrders(String(zone.maxDailyOrders ?? 30));
  };

  const handleSave = async (id: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/delivery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name,
          postcodes,
          deliveryFee: parseFloat(deliveryFee),
          freeDeliveryMinSpend: parseFloat(freeDeliveryMinSpend),
          minOrderAmount: parseFloat(minOrderAmount),
          primaryBranchSlug,
          orderCutoffHour: parseInt(orderCutoffHour),
          deliveryDays,
          maxDailyOrders: parseInt(maxDailyOrders)
        })
      });
      const data = await res.json();
      if (res.ok) {
        setZones((prev) => prev.map((z) => (z.id === id ? data.zone : z)));
        setEditingId(null);
        setMessage("Delivery zone updated.");
      } else {
        setMessage(data.error || "Update failed.");
      }
    } catch {
      setMessage("Network error.");
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          postcodes,
          deliveryFee: parseFloat(deliveryFee),
          freeDeliveryMinSpend: parseFloat(freeDeliveryMinSpend),
          minOrderAmount: parseFloat(minOrderAmount),
          primaryBranchSlug,
          orderCutoffHour: parseInt(orderCutoffHour),
          deliveryDays,
          maxDailyOrders: parseInt(maxDailyOrders)
        })
      });
      const data = await res.json();
      if (res.ok) {
        setZones((prev) => [...prev, data.zone]);
        setShowAddForm(false);
        setMessage("New delivery zone created.");
      } else {
        setMessage(data.error || "Creation failed.");
      }
    } catch {
      setMessage("Network error.");
    } finally {
      setBusy(false);
    }
  };

  const toggleZoneActive = async (id: string, current: boolean) => {
    try {
      const res = await fetch("/api/admin/delivery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !current })
      });
      if (res.ok) {
        setZones((prev) => prev.map((z) => (z.id === id ? { ...z, isActive: !current } : z)));
      }
    } catch {
      // Ignored
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-ink-soft">
          Configure eligible Sydney postcodes, delivery fees, cutoff times and minimum spend thresholds.
        </p>
        <button
          type="button"
          onClick={() => {
            setShowAddForm(!showAddForm);
            setName("");
            setPostcodes("");
          }}
          className="button button-green text-xs"
        >
          <Plus size={15} /> Add Delivery Zone
        </button>
      </div>

      {message && (
        <div className="rounded-xl bg-leaf-soft p-3 text-xs font-bold text-deep-green border border-deep-green/20">
          {message}
        </div>
      )}

      {/* Add New Zone Form */}
      {showAddForm && (
        <form onSubmit={handleCreate} className="rounded-2xl border border-forest/15 bg-white p-5 shadow-soft space-y-4">
          <h3 className="font-display font-black text-forest text-base">New Sydney Delivery Zone</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-ink mb-1">Zone Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Inner West Metro"
                className="w-full rounded-xl border border-forest/20 p-2.5 text-xs font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink mb-1">Fulfillment Hub *</label>
              <select
                value={primaryBranchSlug}
                onChange={(e) => setPrimaryBranchSlug(e.target.value)}
                className="w-full rounded-xl border border-forest/20 p-2.5 text-xs font-bold bg-white"
              >
                <option value="rockdale">Rockdale Hub</option>
                <option value="riverwood">Riverwood Hub</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-ink mb-1">Eligible Sydney Postcodes (comma-separated) *</label>
              <input
                type="text"
                required
                value={postcodes}
                onChange={(e) => setPostcodes(e.target.value)}
                placeholder="2000, 2010, 2042, 2048, 2050"
                className="w-full rounded-xl border border-forest/20 p-2.5 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink mb-1">Standard Delivery Fee (AUD) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                className="w-full rounded-xl border border-forest/20 p-2.5 text-xs font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink mb-1">Free Delivery Threshold (AUD) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={freeDeliveryMinSpend}
                onChange={(e) => setFreeDeliveryMinSpend(e.target.value)}
                className="w-full rounded-xl border border-forest/20 p-2.5 text-xs font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink mb-1">Minimum Order Amount (AUD) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={minOrderAmount}
                onChange={(e) => setMinOrderAmount(e.target.value)}
                className="w-full rounded-xl border border-forest/20 p-2.5 text-xs font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink mb-1">Order Cutoff Hour (24h format) *</label>
              <input
                type="number"
                min="0"
                max="23"
                required
                value={orderCutoffHour}
                onChange={(e) => setOrderCutoffHour(e.target.value)}
                className="w-full rounded-xl border border-forest/20 p-2.5 text-xs font-semibold"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="button button-outline text-forest text-xs"
            >
              Cancel
            </button>
            <button type="submit" disabled={busy} className="button button-green text-xs">
              Save Zone
            </button>
          </div>
        </form>
      )}

      {/* Existing Zones List */}
      <div className="grid gap-4 md:grid-cols-2">
        {zones.map((zone) => {
          const isEditing = editingId === zone.id;

          return (
            <div
              key={zone.id}
              className={`rounded-2xl border p-5 shadow-soft transition bg-white ${
                zone.isActive ? "border-forest/15" : "border-neutral-200 opacity-60"
              }`}
            >
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">Zone Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded border border-forest/20 p-2 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">Postcodes</label>
                    <textarea
                      rows={2}
                      value={postcodes}
                      onChange={(e) => setPostcodes(e.target.value)}
                      className="w-full rounded border border-forest/20 p-2 text-xs font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-ink mb-1">Fee ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={deliveryFee}
                        onChange={(e) => setDeliveryFee(e.target.value)}
                        className="w-full rounded border border-forest/20 p-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-ink mb-1">Free Over ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={freeDeliveryMinSpend}
                        onChange={(e) => setFreeDeliveryMinSpend(e.target.value)}
                        className="w-full rounded border border-forest/20 p-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-ink mb-1">Min Order ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={minOrderAmount}
                        onChange={(e) => setMinOrderAmount(e.target.value)}
                        className="w-full rounded border border-forest/20 p-1 text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-lg border border-forest/20 px-3 py-1 text-xs font-bold text-ink-soft"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSave(zone.id)}
                      disabled={busy}
                      className="rounded-lg bg-deep-green px-3 py-1 text-xs font-bold text-white"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Truck className="text-deep-green" size={18} />
                        <h3 className="font-display font-black text-forest text-lg">{zone.name}</h3>
                      </div>
                      <p className="text-xs text-ink-soft mt-0.5">
                        Hub: <strong className="capitalize">{zone.primaryBranchSlug}</strong> &bull; Cutoff: {zone.orderCutoffHour ?? 14}:00
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleZoneActive(zone.id, zone.isActive)}
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                          zone.isActive ? "bg-leaf-soft text-deep-green" : "bg-neutral-200 text-neutral-600"
                        }`}
                      >
                        {zone.isActive ? "Active" : "Disabled"}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(zone)}
                        className="rounded-lg border border-forest/20 p-1 text-forest hover:bg-cream"
                        title="Edit Zone"
                      >
                        <Edit2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-forest/10 pt-3 text-xs space-y-1 text-ink-soft">
                    <div className="flex justify-between">
                      <span>Standard Delivery Fee:</span>
                      <strong className="text-ink">${zone.deliveryFee.toFixed(2)} AUD</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Free Delivery Spend Threshold:</span>
                      <strong className="text-deep-green">${zone.freeDeliveryMinSpend.toFixed(2)} AUD</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Minimum Order Amount:</span>
                      <strong className="text-ink">${zone.minOrderAmount.toFixed(2)} AUD</strong>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg bg-cream/70 p-2.5 text-[11px]">
                    <span className="font-bold text-forest block mb-1">Eligible Sydney Postcodes:</span>
                    <span className="font-mono text-ink-soft break-words leading-relaxed">
                      {zone.postcodes}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
