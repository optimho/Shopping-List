import { useEffect, useState } from "react";

interface EventRow {
  id: string;
  eventType: string;
  entityId: string | null;
  entityType: string | null;
  actorName: string | null;
  detail: string | null;
  createdAt: string;
}

const EVENT_TYPES = [
  "item_added_to_list",
  "item_purchased",
  "item_removed_from_list",
  "pantry_item_created",
  "pantry_item_updated",
  "pantry_item_deleted",
  "db_backup",
  "db_restore",
  "db_cleared",
];

export default function Events() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`/api/events?${params}`, { credentials: "include" });
    if (res.ok) setEvents(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, [type, from, to]);

  function handleExport() {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    window.location.href = `/api/events/export?${params}`;
  }

  function formatDetail(detail: string | null) {
    if (!detail) return "—";
    try {
      const obj = JSON.parse(detail);
      return Object.entries(obj)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
    } catch {
      return detail;
    }
  }

  const badgeColor = (t: string) => {
    if (t.includes("purchased")) return "bg-green-100 text-green-700";
    if (t.includes("removed") || t.includes("deleted") || t.includes("cleared")) return "bg-red-100 text-red-700";
    if (t.includes("created") || t.includes("added")) return "bg-blue-100 text-blue-700";
    if (t.includes("backup") || t.includes("restore")) return "bg-yellow-100 text-yellow-700";
    return "bg-gray-100 text-gray-600";
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Event Log</h1>
        <button
          onClick={handleExport}
          className="border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All event types</option>
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {(type || from || to) && (
          <button
            onClick={() => { setType(""); setFrom(""); setTo(""); }}
            className="text-indigo-600 hover:underline text-sm self-center"
          >
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-8">Loading…</p>
      ) : events.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No events found</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Time</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Event</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Actor</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {events.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(e.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${badgeColor(e.eventType)}`}>
                      {e.eventType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                    {e.actorName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell max-w-xs truncate">
                    {formatDetail(e.detail)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {events.length === 500 && (
            <p className="text-center text-xs text-gray-400 py-3">
              Showing most recent 500 events. Use filters to narrow down, or export CSV for full history.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
