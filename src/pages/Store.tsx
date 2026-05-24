import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../app";

interface PantryItem {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  sizes: string | null;
  defaultSize: string | null;
  typicalPrice: number | null;
}

export default function Pantry() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const navigate = useNavigate();

  const [items, setItems] = useState<PantryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);

  // New item form (admin only)
  const [formOpen, setFormOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formBrand, setFormBrand] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formSizes, setFormSizes] = useState("");
  const [formDefaultSize, setFormDefaultSize] = useState("");
  const [formTypicalPrice, setFormTypicalPrice] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Quick-add to list
  const [addingItem, setAddingItem] = useState<PantryItem | null>(null);
  const [addSize, setAddSize] = useState("");
  const [addQty, setAddQty] = useState(1);
  const [addNotes, setAddNotes] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState(false);

  async function load() {
    const [itemsRes, catsRes] = await Promise.all([
      fetch(`/api/store?search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}`, { credentials: "include" }),
      fetch("/api/store/categories", { credentials: "include" }),
    ]);
    if (itemsRes.ok) setItems(await itemsRes.json());
    if (catsRes.ok) setCategories(await catsRes.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, [search, category]);

  async function handleCreate() {
    if (!formName.trim()) { setFormError("Name is required"); return; }
    setSaving(true);
    setFormError("");

    const sizes = formSizes.split(",").map((s) => s.trim()).filter(Boolean);

    const res = await fetch("/api/store", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formName.trim(),
        brand: formBrand.trim() || null,
        category: formCategory.trim() || null,
        sizes: sizes.length ? sizes : null,
        defaultSize: formDefaultSize.trim() || null,
        typicalPrice: formTypicalPrice ? Number(formTypicalPrice) : null,
        notes: formNotes.trim() || null,
      }),
    });

    setSaving(false);
    if (res.ok) {
      const { id } = await res.json();
      navigate(`/store/${id}`);
    } else {
      const data = await res.json();
      setFormError(data.error ?? "Failed to create item");
    }
  }

  function openAdd(item: PantryItem) {
    setAddingItem(item);
    const sizes = item.sizes ? JSON.parse(item.sizes) as string[] : [];
    setAddSize(item.defaultSize ?? sizes[0] ?? "");
    setAddQty(1);
    setAddNotes("");
    setAddError("");
    setAddSuccess(false);
  }

  async function handleAddToList() {
    if (!addingItem) return;
    setAddSaving(true);
    setAddError("");
    const res = await fetch("/api/list", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pantryItemId: addingItem.id,
        size: addSize || null,
        quantity: addQty,
        notes: addNotes || null,
      }),
    });
    setAddSaving(false);
    if (res.ok) {
      setAddSuccess(true);
      setTimeout(() => setAddingItem(null), 900);
    } else {
      const data = await res.json();
      setAddError(data.error ?? "Failed to add item");
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Store</h1>
        <button
          onClick={() => setFormOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + New item
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="search"
          placeholder="Search by name or brand…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-12">Loading…</p>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="font-medium text-gray-600">No items found</p>
          <button onClick={() => setFormOpen(true)} className="mt-3 text-indigo-600 hover:underline text-sm">
            Add the first store item
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Brand</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Category</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Typical price</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td
                    className="px-4 py-3 font-medium text-gray-900 cursor-pointer"
                    onClick={() => navigate(`/store/${item.id}`)}
                  >{item.name}</td>
                  <td
                    className="px-4 py-3 text-gray-500 hidden sm:table-cell cursor-pointer"
                    onClick={() => navigate(`/store/${item.id}`)}
                  >{item.brand ?? "—"}</td>
                  <td
                    className="px-4 py-3 text-gray-500 hidden sm:table-cell cursor-pointer"
                    onClick={() => navigate(`/store/${item.id}`)}
                  >{item.category ?? "—"}</td>
                  <td
                    className="px-4 py-3 text-right text-gray-700 cursor-pointer"
                    onClick={() => navigate(`/store/${item.id}`)}
                  >
                    {item.typicalPrice != null ? `$${item.typicalPrice.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); openAdd(item); }}
                      className="text-indigo-600 hover:text-indigo-800 text-xs font-medium border border-indigo-200 hover:border-indigo-400 rounded px-2 py-1 transition-colors whitespace-nowrap"
                    >
                      + Add
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Quick-add to shopping list modal */}
      {addingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Add to shopping list</h2>
              <button onClick={() => setAddingItem(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-gray-700 font-medium">{addingItem.name}{addingItem.brand ? ` — ${addingItem.brand}` : ""}</p>

              {addError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">{addError}</div>
              )}
              {addSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-2 text-sm font-medium">Added to list!</div>
              )}

              {(() => {
                const sizes = addingItem.sizes ? JSON.parse(addingItem.sizes) as string[] : [];
                return sizes.length > 0 ? (
                  <Field label="Size">
                    <select value={addSize} onChange={(e) => setAddSize(e.target.value)} className={inputClass}>
                      <option value="">— no size —</option>
                      {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                ) : (
                  <Field label="Size (optional)">
                    <input type="text" value={addSize} onChange={(e) => setAddSize(e.target.value)} placeholder="e.g. 500g" className={inputClass} />
                  </Field>
                );
              })()}

              <Field label="Quantity">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAddQty((q) => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors text-lg leading-none"
                  >−</button>
                  <span className="w-8 text-center font-medium text-gray-900">{addQty}</span>
                  <button
                    onClick={() => setAddQty((q) => q + 1)}
                    className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors text-lg leading-none"
                  >+</button>
                </div>
              </Field>

              <Field label="Note (optional)">
                <textarea value={addNotes} onChange={(e) => setAddNotes(e.target.value)} rows={2} placeholder="e.g. get reduced-salt version" className={inputClass} />
              </Field>
            </div>
            <div className="px-5 py-4 border-t border-gray-200">
              <button
                onClick={handleAddToList}
                disabled={addSaving || addSuccess}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {addSaving ? "Adding…" : addSuccess ? "Added!" : "Add to list"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New item modal */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">New store item</h2>
              <button onClick={() => setFormOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">{formError}</div>
              )}

              <Field label="Name *">
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} autoFocus className={inputClass} />
              </Field>
              <Field label="Brand">
                <input type="text" value={formBrand} onChange={(e) => setFormBrand(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Category">
                <input type="text" value={formCategory} onChange={(e) => setFormCategory(e.target.value)} placeholder="e.g. Dairy, Snacks, Cleaning" className={inputClass} />
              </Field>
              <Field label="Sizes (comma-separated)">
                <input type="text" value={formSizes} onChange={(e) => setFormSizes(e.target.value)} placeholder="e.g. 500g, 1kg, 2kg" className={inputClass} />
              </Field>
              <Field label="Default size">
                <input type="text" value={formDefaultSize} onChange={(e) => setFormDefaultSize(e.target.value)} placeholder="e.g. 1kg" className={inputClass} />
              </Field>
              <Field label="Typical price ($)">
                <input type="number" step="0.01" min="0" value={formTypicalPrice} onChange={(e) => setFormTypicalPrice(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Notes">
                <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} className={inputClass} />
              </Field>
            </div>

            <div className="px-5 py-4 border-t border-gray-200">
              <button
                onClick={handleCreate}
                disabled={saving}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? "Saving…" : "Create item"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputClass =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
