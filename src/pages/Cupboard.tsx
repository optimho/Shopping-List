import { useEffect, useState } from "react";

interface CupboardItem {
  id: string;
  pantryItemId: string;
  name: string;
  brand: string | null;
  size: string | null;
  quantity: number;
}

interface Prompt {
  pantryItemId: string;
  name: string;
  size: string | null;
}

export default function Cupboard() {
  const [items, setItems] = useState<CupboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);

  async function load() {
    const res = await fetch("/api/cupboard", { credentials: "include" });
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleUse(item: CupboardItem) {
    const res = await fetch(`/api/cupboard/${item.id}/use`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return;
    const data = await res.json();

    if (data.remaining > 0) {
      setItems((prev) =>
        prev.map((i) => i.id === item.id ? { ...i, quantity: data.remaining } : i)
      );
    } else {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setPrompt({ pantryItemId: data.pantryItemId, name: data.name, size: data.size });
    }
  }

  async function handleAddToList() {
    if (!prompt) return;
    await fetch("/api/list", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pantryItemId: prompt.pantryItemId,
        size: prompt.size,
        quantity: 1,
      }),
    });
    setAddSuccess(true);
    setTimeout(() => { setPrompt(null); setAddSuccess(false); }, 1200);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Cupboard</h1>

      {loading ? (
        <p className="text-gray-400 text-center py-12">Loading…</p>
      ) : items.length === 0 && !prompt ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🧺</p>
          <p className="font-medium text-gray-600">Your cupboard is empty</p>
          <p className="text-sm mt-1">Items appear here after you press "Got it" on the shopping list</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Item</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Size</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Qty</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    {item.brand && <p className="text-xs text-gray-400">{item.brand}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{item.size ?? "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                      {item.quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleUse(item)}
                      className="text-sm text-red-600 hover:text-red-800 border border-red-200 hover:border-red-400 rounded px-3 py-1 transition-colors"
                    >
                      Used up
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Re-add prompt */}
      {prompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
            {addSuccess ? (
              <p className="text-green-600 font-medium">Added to shopping list!</p>
            ) : (
              <>
                <p className="text-2xl mb-3">🛒</p>
                <p className="font-semibold text-gray-800 mb-1">All used up!</p>
                <p className="text-gray-500 text-sm mb-6">
                  Add <span className="font-medium text-gray-800">{prompt.name}</span>
                  {prompt.size ? ` (${prompt.size})` : ""} to the shopping list?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setPrompt(null)}
                    className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    No thanks
                  </button>
                  <button
                    onClick={handleAddToList}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg transition-colors text-sm font-medium"
                  >
                    Yes, add it
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
