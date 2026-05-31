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
  notes: string | null;
}

interface ParsedRow {
  name: string;
  brand: string;
  category: string;
  sizes: string[];
  defaultSize: string;
  typicalPrice: number | null;
  notes: string;
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

  // New/edit item form
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);
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

  // Import modal
  const [importOpen, setImportOpen] = useState(false);
  const [importStep, setImportStep] = useState<"idle" | "preview" | "done">("idle");
  const [importRows, setImportRows] = useState<ParsedRow[]>([]);
  const [importFileError, setImportFileError] = useState("");
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; skippedNames: string[] } | null>(null);
  const [importing, setImporting] = useState(false);

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

  function closeForm() {
    setFormOpen(false);
    setEditingItem(null);
    setFormName(""); setFormBrand(""); setFormCategory("");
    setFormSizes(""); setFormDefaultSize(""); setFormTypicalPrice(""); setFormNotes("");
    setFormError("");
  }

  function openEdit(item: PantryItem) {
    setEditingItem(item);
    setFormName(item.name);
    setFormBrand(item.brand ?? "");
    setFormCategory(item.category ?? "");
    const sizes = item.sizes ? JSON.parse(item.sizes) as string[] : [];
    setFormSizes(sizes.join(", "));
    setFormDefaultSize(item.defaultSize ?? "");
    setFormTypicalPrice(item.typicalPrice != null ? String(item.typicalPrice) : "");
    setFormNotes(item.notes ?? "");
    setFormError("");
    setFormOpen(true);
  }

  async function handleUpdate() {
    if (!editingItem) return;
    if (!formName.trim()) { setFormError("Name is required"); return; }
    setSaving(true);
    setFormError("");
    const sizes = formSizes.split(",").map((s) => s.trim()).filter(Boolean);
    const res = await fetch(`/api/store/${editingItem.id}`, {
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
      closeForm();
      load();
    } else {
      const data = await res.json();
      setFormError(data.error ?? "Failed to save");
    }
  }

  async function handleDelete(item: PantryItem) {
    if (!confirm(`Delete "${item.name}" from the store?`)) return;
    const res = await fetch(`/api/store/${item.id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) {
      closeForm();
      load();
    }
  }

  function parseStoreCsv(text: string): ParsedRow[] {
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) return [];

    function parseLine(line: string): string[] {
      const fields: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
          else inQuotes = !inQuotes;
        } else if (ch === "," && !inQuotes) {
          fields.push(current); current = "";
        } else {
          current += ch;
        }
      }
      fields.push(current);
      return fields;
    }

    const headers = parseLine(lines[0]).map((h) => h.trim().toLowerCase());
    const idx = (name: string) => headers.indexOf(name);
    const nameIdx = idx("name");
    if (nameIdx === -1) return [];

    const rows: ParsedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const f = parseLine(line);
      const name = (f[nameIdx] ?? "").trim();
      if (!name) continue;
      const sizesRaw = (f[idx("sizes")] ?? "").trim();
      const priceRaw = (f[idx("typicalprice")] ?? "").trim();
      const priceNum = Number(priceRaw);
      rows.push({
        name,
        brand: (f[idx("brand")] ?? "").trim(),
        category: (f[idx("category")] ?? "").trim(),
        sizes: sizesRaw ? sizesRaw.split("|").map((s) => s.trim()).filter(Boolean) : [],
        defaultSize: (f[idx("defaultsize")] ?? "").trim(),
        typicalPrice: priceRaw && !isNaN(priceNum) ? priceNum : null,
        notes: (f[idx("notes")] ?? "").trim(),
      });
    }
    return rows;
  }

  function downloadTemplate() {
    const csv = [
      "name,brand,category,sizes,defaultSize,typicalPrice,notes",
      "Peanut Butter,Sanitarium,pantry,375g|750g,375g,5.99,",
      "Milk,Anchor,dairy,1L|2L,2L,3.50,",
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "store-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(file: File) {
    setImportFileError("");
    const text = await file.text();
    const rows = parseStoreCsv(text);
    if (rows.length === 0) {
      setImportFileError("No valid rows found. Check your file matches the template format.");
      return;
    }
    setImportRows(rows);
    setImportStep("preview");
  }

  async function handleImport() {
    setImporting(true);
    setImportFileError("");
    const res = await fetch("/api/store/import", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(importRows.map((r) => ({
        name: r.name,
        brand: r.brand || null,
        category: r.category || null,
        sizes: r.sizes.length ? r.sizes : null,
        defaultSize: r.defaultSize || null,
        typicalPrice: r.typicalPrice,
        notes: r.notes || null,
      }))),
    });
    setImporting(false);
    if (res.ok) {
      const result = await res.json();
      setImportResult(result);
      setImportStep("done");
      load();
    } else {
      const data = await res.json();
      setImportFileError(data.error ?? "Import failed");
    }
  }

  function closeImport() {
    setImportOpen(false);
    setImportStep("idle");
    setImportRows([]);
    setImportFileError("");
    setImportResult(null);
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
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <button
                onClick={() => { window.location.href = "/api/store/export"; }}
                className="border border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Export CSV
              </button>
              <button
                onClick={() => setImportOpen(true)}
                className="border border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Import CSV
              </button>
            </>
          )}
          <button
            onClick={() => setFormOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + New item
          </button>
        </div>
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
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(item); }}
                        className="text-gray-500 hover:text-gray-700 text-xs font-medium border border-gray-200 hover:border-gray-400 rounded px-2 py-1 transition-colors whitespace-nowrap"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); openAdd(item); }}
                        className="text-indigo-600 hover:text-indigo-800 text-xs font-medium border border-indigo-200 hover:border-indigo-400 rounded px-2 py-1 transition-colors whitespace-nowrap"
                      >
                        + Add
                      </button>
                    </div>
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

      {/* New / edit item modal */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">{editingItem ? "Edit store item" : "New store item"}</h2>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
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

            <div className="px-5 py-4 border-t border-gray-200 flex gap-3">
              {editingItem && isAdmin && (
                <button
                  onClick={() => handleDelete(editingItem)}
                  disabled={saving}
                  className="flex-none border border-red-200 text-red-600 hover:bg-red-50 font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  Delete
                </button>
              )}
              <button
                onClick={editingItem ? handleUpdate : handleCreate}
                disabled={saving}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? "Saving…" : editingItem ? "Save changes" : "Create item"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Import CSV modal */}
      {importOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Import store items</h2>
              <button onClick={closeImport} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            {importStep === "idle" && (
              <>
                <div className="p-5 space-y-4">
                  <p className="text-sm text-gray-600">Upload a CSV file to bulk-import items into the Store catalogue.</p>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-500 space-y-2">
                    <p className="font-medium text-gray-700">Required CSV format:</p>
                    <code className="block font-mono text-gray-600">name,brand,category,sizes,defaultSize,typicalPrice,notes</code>
                    <p>Use <code className="bg-gray-100 px-1 rounded">|</code> to separate multiple sizes — e.g. <code className="bg-gray-100 px-1 rounded">375g|750g|1kg</code></p>
                    <p>Items with the same name as an existing store item will be skipped.</p>
                  </div>
                  <button onClick={downloadTemplate} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium hover:underline">
                    Download template CSV
                  </button>
                  {importFileError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">{importFileError}</div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Choose CSV file</label>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportFile(f); }}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 file:cursor-pointer"
                    />
                  </div>
                </div>
              </>
            )}

            {importStep === "preview" && (
              <>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-900">{importRows.length} item{importRows.length !== 1 ? "s" : ""}</span> ready to import. Review then confirm.
                  </p>
                  {importFileError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">{importFileError}</div>
                  )}
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left px-3 py-2 font-medium text-gray-600">Name</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600">Brand</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600">Category</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600">Sizes</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {importRows.map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium text-gray-900">{row.name}</td>
                            <td className="px-3 py-2 text-gray-500">{row.brand || "—"}</td>
                            <td className="px-3 py-2 text-gray-500">{row.category || "—"}</td>
                            <td className="px-3 py-2 text-gray-500">{row.sizes.join(", ") || "—"}</td>
                            <td className="px-3 py-2 text-right text-gray-700">
                              {row.typicalPrice != null ? `$${row.typicalPrice.toFixed(2)}` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="px-5 py-4 border-t border-gray-200 flex gap-3">
                  <button
                    onClick={() => { setImportStep("idle"); setImportRows([]); setImportFileError(""); }}
                    className="flex-none border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {importing ? "Importing…" : `Import ${importRows.length} item${importRows.length !== 1 ? "s" : ""}`}
                  </button>
                </div>
              </>
            )}

            {importStep === "done" && importResult && (
              <>
                <div className="p-8 text-center space-y-3">
                  <div className="text-5xl">✓</div>
                  <p className="text-xl font-semibold text-gray-900">
                    {importResult.imported} item{importResult.imported !== 1 ? "s" : ""} imported
                  </p>
                  {importResult.skipped > 0 && (
                    <p className="text-sm text-gray-500">
                      {importResult.skipped} skipped (already exist{importResult.skipped === 1 ? "s" : ""}): {importResult.skippedNames.join(", ")}
                    </p>
                  )}
                </div>
                <div className="px-5 py-4 border-t border-gray-200">
                  <button
                    onClick={closeImport}
                    className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
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
