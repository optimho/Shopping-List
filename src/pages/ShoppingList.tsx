import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../app";

interface ListItem {
  id: string;
  pantryItemId: string;
  itemName: string;
  itemBrand: string | null;
  size: string | null;
  quantity: number;
  requestedByName: string;
  requestedAt: string;
  status: string;
  notes: string | null;
}

interface PantryItem {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  sizes: string[];
  defaultSize: string | null;
  typicalPrice: number | null;
}

export default function ShoppingList() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [gotItId, setGotItId] = useState<string | null>(null);
  const [pricePaid, setPricePaid] = useState("");

  // Add form state
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<PantryItem | null>(null);
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  async function loadList() {
    const res = await fetch("/api/list", { credentials: "include" });
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }

  useEffect(() => { loadList(); }, []);

  useEffect(() => {
    if (!addOpen) return;
    fetch("/api/pantry", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setPantryItems(data.map((p: PantryItem & { sizes: string | string[] }) => ({
        ...p,
        sizes: typeof p.sizes === "string" ? JSON.parse(p.sizes) : (p.sizes ?? []),
      }))));
  }, [addOpen]);

  const filtered = pantryItems.filter((p) =>
    search.length === 0 ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.brand ?? "").toLowerCase().includes(search.toLowerCase())
  );

  async function handleAdd() {
    if (!selectedItem) return;
    setAdding(true);
    setAddError("");
    const res = await fetch("/api/list", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pantryItemId: selectedItem.id,
        size: size || null,
        quantity: Number(quantity) || 1,
        notes: notes || null,
      }),
    });
    setAdding(false);
    if (res.ok) {
      setAddOpen(false);
      setSelectedItem(null);
      setSearch("");
      setSize("");
      setQuantity("1");
      setNotes("");
      loadList();
    } else {
      const data = await res.json();
      setAddError(data.error ?? "Failed to add item");
    }
  }

  async function handleGotIt(id: string) {
    const price = pricePaid.trim() ? Number(pricePaid) : null;
    const res = await fetch(`/api/list/${id}/purchase`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pricePaid: price }),
    });
    if (res.ok) {
      setGotItId(null);
      setPricePaid("");
      loadList();
    }
  }

  async function handleRemove(id: string) {
    if (!confirm("Remove this item from the list?")) return;
    await fetch(`/api/list/${id}`, { method: "DELETE", credentials: "include" });
    loadList();
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Shopping List</h1>
        <button
          onClick={() => setAddOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Add item
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-12">Loading…</p>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-4">🛒</p>
          <p className="font-medium text-gray-600">Nothing on the list yet</p>
          <p className="text-sm mt-1">Tap + Add item to get started</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {item.itemName}
                    {item.itemBrand && (
                      <span className="text-gray-400 font-normal"> — {item.itemBrand}</span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500">
                    {item.size && <span>{item.size} · </span>}
                    Qty {item.quantity}
                    {item.notes && <span> · {item.notes}</span>}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Added by {item.requestedByName} · {new Date(item.requestedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-col gap-2 items-end shrink-0">
                  <button
                    onClick={() => { setGotItId(item.id); setPricePaid(""); }}
                    className="bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
                  >
                    Got it
                  </button>
                  {(isAdmin || item.requestedByName === user?.name) && (
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="text-red-400 hover:text-red-600 text-xs"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Got it inline form */}
              {gotItId === item.id && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Price paid (optional)"
                    value={pricePaid}
                    onChange={(e) => setPricePaid(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    autoFocus
                  />
                  <button
                    onClick={() => handleGotIt(item.id)}
                    className="bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setGotItId(null)}
                    className="text-gray-400 hover:text-gray-600 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Add item modal */}
      {addOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Add item to list</h2>
              <button onClick={() => setAddOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {!selectedItem ? (
                <>
                  <input
                    type="search"
                    placeholder="Search pantry…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoFocus
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                    {filtered.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">
                        {search ? "No items found" : "Start typing to search"}
                      </p>
                    ) : (
                      filtered.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setSelectedItem(p);
                            setSize(p.defaultSize ?? "");
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors"
                        >
                          <p className="text-sm font-medium text-gray-900">{p.name}</p>
                          {(p.brand || p.category) && (
                            <p className="text-xs text-gray-400">
                              {[p.brand, p.category].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-gray-400 text-center">
                    Item not in the list?{" "}
                    <Link to="/pantry" className="text-indigo-600 hover:underline">
                      Add it to the pantry first
                    </Link>
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{selectedItem.name}</p>
                      {selectedItem.brand && <p className="text-sm text-gray-500">{selectedItem.brand}</p>}
                    </div>
                    <button
                      onClick={() => setSelectedItem(null)}
                      className="text-indigo-600 text-sm hover:underline"
                    >
                      Change
                    </button>
                  </div>

                  {selectedItem.sizes.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                      <div className="flex flex-wrap gap-2">
                        {selectedItem.sizes.map((s) => (
                          <button
                            key={s}
                            onClick={() => setSize(s)}
                            className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                              size === s
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "border-gray-300 text-gray-700 hover:border-indigo-400"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedItem.sizes.length === 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Size / variant (optional)</label>
                      <input
                        type="text"
                        value={size}
                        onChange={(e) => setSize(e.target.value)}
                        placeholder="e.g. 1L, 500g"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. No-name brand is fine"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {selectedItem.typicalPrice != null && (
                    <p className="text-xs text-gray-400">
                      Typical price: ${selectedItem.typicalPrice.toFixed(2)}
                    </p>
                  )}

                  {addError && (
                    <p className="text-sm text-red-600">{addError}</p>
                  )}
                </>
              )}
            </div>

            {selectedItem && (
              <div className="px-5 py-4 border-t border-gray-200">
                <button
                  onClick={handleAdd}
                  disabled={adding}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {adding ? "Adding…" : "Add to list"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
