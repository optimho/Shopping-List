import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../app";

interface Stats {
  pendingCount: number;
  purchasedThisMonth: number;
  spendThisMonth: number;
  pantryCount: number;
}

interface RecentPurchase {
  id: string;
  itemName: string;
  itemBrand: string | null;
  size: string | null;
  quantity: number;
  pricePaid: number | null;
  purchasedByName: string | null;
  purchasedAt: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<RecentPurchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [statsRes, recentRes] = await Promise.all([
        fetch("/api/list/stats", { credentials: "include" }),
        fetch("/api/list/recent", { credentials: "include" }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (recentRes.ok) setRecent(await recentRes.json());
      setLoading(false);
    }
    load();
  }, []);

  const fmt = (n: number) =>
    n.toLocaleString("en-NZ", { style: "currency", currency: "NZD", minimumFractionDigits: 2 });

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 text-gray-500 text-center">Loading…</div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm">Welcome back, {user?.name}</p>
        </div>
        <Link
          to="/list"
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          View shopping list
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Items on list"
          value={stats?.pendingCount ?? 0}
          color="indigo"
          link="/list"
        />
        <StatCard
          label="Purchased this month"
          value={stats?.purchasedThisMonth ?? 0}
          color="green"
        />
        <StatCard
          label="Spent this month"
          value={stats ? fmt(stats.spendThisMonth) : "$0.00"}
          color="yellow"
          isText
        />
        <StatCard
          label="Pantry items"
          value={stats?.pantryCount ?? 0}
          color="gray"
          link="/pantry"
        />
      </div>

      {/* Recent purchases */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Recent purchases</h2>
          <Link to="/list" className="text-indigo-600 hover:underline text-sm">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No purchases yet this month</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recent.map((r) => (
              <li key={r.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {r.itemName}
                    {r.itemBrand && <span className="text-gray-400 font-normal"> — {r.itemBrand}</span>}
                    {r.size && <span className="text-gray-400 font-normal"> {r.size}</span>}
                  </p>
                  <p className="text-xs text-gray-400">
                    {r.purchasedByName} · {new Date(r.purchasedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-800">
                    {r.pricePaid != null ? fmt(r.pricePaid) : "—"}
                  </p>
                  <p className="text-xs text-gray-400">qty {r.quantity}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  link,
  isText = false,
}: {
  label: string;
  value: number | string;
  color: "indigo" | "green" | "yellow" | "gray";
  link?: string;
  isText?: boolean;
}) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-700",
    green: "bg-green-50 text-green-700",
    yellow: "bg-yellow-50 text-yellow-700",
    gray: "bg-gray-100 text-gray-700",
  };

  const inner = (
    <div className={`rounded-xl p-4 ${colors[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className={`mt-1 font-bold ${isText ? "text-xl" : "text-3xl"}`}>{value}</p>
    </div>
  );

  return link ? <Link to={link}>{inner}</Link> : inner;
}
