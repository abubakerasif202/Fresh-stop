"use client";

import { useState } from "react";
import Image from "next/image";
import { Edit2, Download, Search, CheckCircle2, Clock } from "lucide-react";

interface ProductItem {
  id: string;
  slug: string;
  name: string;
  unit: string | null;
  price: number | null;
  priceCents: number | null;
  marketPrice: number | null;
  marketSource: string | null;
  approvalStatus: string;
  isPurchasable: boolean;
  category: { id: string; name: string; slug: string };
  imageUrl: string;
}

export function PricingDashboard({
  initialProducts,
  categories
}: {
  initialProducts: ProductItem[];
  categories: { id: string; name: string; slug: string }[];
}) {
  const [products, setProducts] = useState<ProductItem[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const approvedCount = products.filter((p) => p.approvalStatus === "APPROVED").length;
  const pendingCount = products.filter((p) => p.approvalStatus === "PENDING").length;

  const filtered = products.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "all" || p.category.slug === selectedCategory;
    const matchesStatus = filterStatus === "all" || p.approvalStatus === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleApprove = async (productId: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, action: "approve" })
      });
      const data = await res.json();
      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, approvalStatus: "APPROVED", isPurchasable: true } : p))
        );
        setMessage("Price approved successfully.");
      } else {
        setMessage(data.error || "Approval failed.");
      }
    } catch {
      setMessage("Network error.");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveEdit = async (productId: string) => {
    const num = parseFloat(editPrice);
    if (isNaN(num) || num <= 0) {
      setMessage("Please enter a valid price.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          action: "update",
          price: num,
          unit: editUnit || undefined,
          approvalStatus: "APPROVED"
        })
      });
      const data = await res.json();
      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === productId
              ? { ...p, price: num, unit: editUnit || p.unit, approvalStatus: "APPROVED", isPurchasable: true }
              : p
          )
        );
        setEditingId(null);
        setMessage("Price updated and approved.");
      } else {
        setMessage(data.error || "Update failed.");
      }
    } catch {
      setMessage("Network error.");
    } finally {
      setBusy(false);
    }
  };

  const handleBulkApprove = async () => {
    if (!confirm(`Are you sure you want to approve all ${pendingCount} pending product prices?`)) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bulk_approve" })
      });
      const data = await res.json();
      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) => ({ ...p, approvalStatus: "APPROVED", isPurchasable: true }))
        );
        setMessage(`Approved ${data.count} products.`);
      } else {
        setMessage(data.error || "Bulk approval failed.");
      }
    } catch {
      setMessage("Network error.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-forest/10 bg-white p-5 shadow-soft">
          <span className="text-xs font-bold text-ink-soft">Total Catalog</span>
          <p className="font-display text-3xl font-black text-forest mt-1">{products.length}</p>
          <span className="text-[11px] text-ink-soft">Across {categories.length} categories</span>
        </div>

        <div className="rounded-2xl border border-forest/10 bg-white p-5 shadow-soft">
          <span className="text-xs font-bold text-ink-soft">Approved Prices</span>
          <p className="font-display text-3xl font-black text-deep-green mt-1">{approvedCount}</p>
          <span className="text-[11px] text-deep-green font-semibold">Active for online purchase</span>
        </div>

        <div className="rounded-2xl border border-forest/10 bg-white p-5 shadow-soft">
          <span className="text-xs font-bold text-ink-soft">Pending Approval</span>
          <p className="font-display text-3xl font-black text-amber-700 mt-1">{pendingCount}</p>
          <span className="text-[11px] text-ink-soft">Shown as enquiry-only in store</span>
        </div>

        <div className="rounded-2xl border border-forest/10 bg-white p-5 shadow-soft">
          <span className="text-xs font-bold text-ink-soft">Sydney Benchmark</span>
          <p className="font-display text-lg font-black text-forest mt-1">Woolworths &bull; Coles &bull; Harris Farm</p>
          <span className="text-[11px] text-ink-soft">Australian unit pricing compliant</span>
        </div>
      </div>

      {/* Control Actions & Search */}
      <div className="rounded-2xl border border-forest/10 bg-white p-5 shadow-soft space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-wrap gap-2">
            <div className="relative min-w-64 flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by product name or slug…"
                className="w-full rounded-xl border border-forest/20 pl-9 pr-4 py-2 text-sm"
              />
              <Search className="absolute left-3 top-2.5 text-forest/40" size={16} />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-xl border border-forest/20 px-3 py-2 text-xs font-bold bg-white"
            >
              <option value="all">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl border border-forest/20 px-3 py-2 text-xs font-bold bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="APPROVED">Approved ({approvedCount})</option>
              <option value="PENDING">Pending Approval ({pendingCount})</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            {pendingCount > 0 && (
              <button
                type="button"
                onClick={handleBulkApprove}
                disabled={busy}
                className="button button-green text-xs"
              >
                <CheckCircle2 size={15} /> Bulk Approve ({pendingCount})
              </button>
            )}
            <a
              href="/api/admin/pricing/export"
              className="button button-outline text-forest text-xs"
            >
              <Download size={15} /> Export CSV
            </a>
          </div>
        </div>

        {message && (
          <div className="rounded-xl bg-leaf-soft p-3 text-xs font-bold text-deep-green border border-deep-green/20">
            {message}
          </div>
        )}
      </div>

      {/* Pricing Table */}
      <div className="overflow-hidden rounded-2xl border border-forest/10 bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="border-b border-forest/10 bg-cream/50 text-[11px] font-black uppercase tracking-wider text-forest/70">
              <tr>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Unit</th>
                <th className="py-3 px-4">Sydney Market Benchmark</th>
                <th className="py-3 px-4">Fresh Stop Price</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-forest/10">
              {filtered.map((product) => {
                const isEditing = editingId === product.id;
                const isApproved = product.approvalStatus === "APPROVED";

                return (
                  <tr key={product.id} className="hover:bg-cream/20">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-forest/10 bg-cream">
                          <Image
                            src={product.imageUrl}
                            alt=""
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-extrabold text-forest">{product.name}</p>
                          <span className="text-[10px] text-ink-soft font-mono">{product.slug}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-xs font-medium text-ink-soft">
                      {product.category.name}
                    </td>

                    <td className="py-3 px-4">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editUnit}
                          onChange={(e) => setEditUnit(e.target.value)}
                          className="w-20 rounded border border-forest/20 p-1 text-xs"
                        />
                      ) : (
                        <span className="font-bold text-forest">{product.unit || "—"}</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {product.marketPrice ? (
                        <div>
                          <span className="font-bold text-ink">
                            ${product.marketPrice.toFixed(2)} AUD
                          </span>
                          <p className="text-[10px] text-ink-soft">{product.marketSource}</p>
                        </div>
                      ) : (
                        <span className="text-ink-soft text-xs">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-24 rounded border border-forest/20 p-1 font-bold text-xs"
                        />
                      ) : product.price !== null ? (
                        <span className="font-display font-black text-forest text-base">
                          ${product.price.toFixed(2)} AUD
                        </span>
                      ) : (
                        <span className="text-amber-800 font-semibold text-xs">Unpriced</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                          isApproved
                            ? "bg-leaf-soft text-deep-green border border-deep-green/20"
                            : "bg-sun/20 text-amber-800 border border-amber-800/20"
                        }`}
                      >
                        {isApproved ? (
                          <>
                            <CheckCircle2 size={11} /> Approved
                          </>
                        ) : (
                          <>
                            <Clock size={11} /> Pending
                          </>
                        )}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(product.id)}
                            disabled={busy}
                            className="rounded-lg bg-deep-green px-2.5 py-1 text-xs font-bold text-white hover:bg-forest"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="rounded-lg border border-forest/20 px-2 py-1 text-xs font-bold text-ink-soft"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1.5">
                          {!isApproved && (
                            <button
                              type="button"
                              onClick={() => handleApprove(product.id)}
                              disabled={busy}
                              className="rounded-lg bg-leaf-soft border border-deep-green/30 px-2.5 py-1 text-xs font-black text-deep-green hover:bg-leaf"
                            >
                              Approve
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(product.id);
                              setEditPrice(product.price ? String(product.price) : "");
                              setEditUnit(product.unit || "");
                            }}
                            className="rounded-lg border border-forest/20 p-1.5 text-forest hover:bg-cream"
                            title="Edit Price"
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
