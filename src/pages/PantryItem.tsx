import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../app";

interface PantryDetail {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  sizes: string[];
  defaultSize: string | null;
  typicalPrice: number | null;
  notes: string | null;
  createdByName: string | null;
  createdAt: string;
  history: HistoryItem[];
}

interface HistoryItem {
  id: string;
  quantity: number;
  size: string | null;
  pricePaid: number | null;
  purchasedByName: string | null;
  purchasedAt: string | null;
  requestedByName: string;
  requestedAt: string;
  status: string;
}

const inputClass =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

export default function PantryItem() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const navigate = useNavigate();

  const [item, setItem] = useState<PantryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  // Edit form state
  const [formName, setFormName] = useState("");
  const [formBrand, setFormBrand] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formSizes, setFormSizes] = useState("");
  const [formDefaultSize, setFormDefaultSize] = useState("");
  const [formTypicalPrice, setFormTypicalPrice] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  async function load() {
    const res = await fetch(`/api/pantry/${id}`, { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setItem(data);
      setFormName(data.name);
      setFormBrand(data.brand ?? "");
      setFormCategory(data.category ?? "");
      setFormSizes((data.sizes ?? []).join(", "));
      setFormDefaultSize(data.defaultSize ?? "");
      setFormTypicalPrice(data.typicalPrice != null ? String(data.typicalPrice) : "");
      setFormNotes(data.notes ?? "");
    } else {
      navigate("/pantry");
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function handleSave() {
    if (!formName.trim()) { setFormError("Name is required"); return; }
    setSaving(true);
    setFormError("");
    const sizes = formSizes.split(",").map((s) => s.trim()).filter(Boolean);
    const res = await fetch(`/api/pantry/${id}`, {
      method: "PUT",
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
      setEditing(false);
      load();
    } else {
      const data = await res.json();
      setFormError(data.error ?? "Failed to save");
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${item?.name}" from the pantry? This cannot be undone.`)) return;
    const res = await fetch(`/api/pantry/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) navigate("/pantry");
  }

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-8 text-gray-400">Loading…</div>;
  if (!item) return null;

  const purchased = item.history.filter((h) => h.status === "purchased");
  const avgPrice =
    purchased.filter((h) => h.pricePaid != null).length > 0
      ? purchased.filter((h) => h.pricePaid != null).reduce((s, h) => s + h.pricePaid!, 0) /
        purchased.filter((h) => h.pricePaid != null).length
      : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/pantry" className="text-indigo-600 hover:underline text-sm">
          ← Pantry
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        {editing ? (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-800">Edit item</h2>
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
              <input type="text" value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Sizes (comma-separated)">
              <input type="text" value={formSizes} onChange={(e) => setFormSizes(e.target.value)} placeholder="e.g. 500g, 1kg" className={inputClass} />
            </Field>
            <Field label="Default size">
              <input type="text" value={formDefaultSize} onChange={(e) => setFormDefaultSize(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Typical price ($)">
              <input type="number" step="0.01" min="0" value={formTypicalPrice} onChange={(e) => setFormTypicalPrice(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Notes">
              <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} className={inputClass} />
            </Field>
            <div className="flex gap-3 pt-2">
              <button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50">
                {saving ? "Saving…" : "Save"}
              </button>
              <button onClick={() => setEditing(false)} className="border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
                {item.brand && <p className="text-gray-500">{item.brand}</p>}
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  <button onClick={() => setEditing(true)} className="border border-gray-300 text-gray-700 text-sm px-3 py-1.5 rounded-lg hover:bg-gray-50">
                    Edit
                  </button>
                  <button onClick={handleDelete} className="border border-red-200 text-red-600 text-sm px-3 py-1.5 rounded-lg hover:bg-red-50">
                    Delete
                  </button>
                </div>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <InfoRow label="Category" value={item.category ?? "—"} />
              <InfoRow label="Typical price" value={item.typicalPrice != null ? `$${item.typicalPrice.toFixed(2)}` : "—"} />
              <InfoRow label="Average paid" value={avgPrice != null ? `$${avgPrice.toFixed(2)}` : "—"} />
              <InfoRow label="Times purchased" value={String(purchased.length)} />
              {item.sizes.length > 0 && (
                <InfoRow label="Sizes" value={item.sizes.join(", ")} />
              )}
              {item.notes && <InfoRow label="Notes" value={item.notes} full />}
            </dl>

            <p className="text-xs text-gray-400 mt-4">
              Added by {item.createdByName ?? "unknown"} · {new Date(item.createdAt).toLocaleDateString()}
            </p>
          </>
        )}
      </div>

      {/* Shopping history */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">Shopping history</h2>
        </div>
        {item.history.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No history yet</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {item.history.map((h) => (
              <li key={h.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-800">
                    Qty {h.quantity}{h.size && ` · ${h.size}`}
                  </p>
                  <p className="text-xs text-gray-400">
                    {h.status === "purchased"
                      ? `Bought by ${h.purchasedByName} · ${new Date(h.purchasedAt!).toLocaleDateString()}`
                      : `Requested by ${h.requestedByName} · ${new Date(h.requestedAt).toLocaleDateString()} · ${h.status}`}
                  </p>
                </div>
                <p className="text-sm font-medium text-gray-700">
                  {h.pricePaid != null ? `$${h.pricePaid.toFixed(2)}` : "—"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

function InfoRow({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <dt className="text-gray-400 text-xs uppercase tracking-wide font-medium">{label}</dt>
      <dd className="mt-0.5 text-gray-800">{value}</dd>
    </div>
  );
}
