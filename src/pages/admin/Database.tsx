import { useRef, useState } from "react";

export default function Database() {
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleBackup() {
    setBackingUp(true);
    window.location.href = "/api/admin/db/backup";
    setTimeout(() => setBackingUp(false), 2000);
  }

  async function handleRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm(`Restore database from "${file.name}"?\n\nThis will replace all current data with the backup. This cannot be undone.`)) {
      e.target.value = "";
      return;
    }

    setRestoring(true);
    setRestoreMsg(null);

    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/admin/db/restore", {
      method: "POST",
      credentials: "include",
      body: form,
    });

    setRestoring(false);
    e.target.value = "";

    if (res.ok) {
      setRestoreMsg({ type: "ok", text: "Database restored successfully. Reload the page to continue." });
    } else {
      const data = await res.json();
      setRestoreMsg({ type: "err", text: data.error ?? "Restore failed" });
    }
  }

  async function handleClear() {
    if (
      !confirm(
        "Clear all application data?\n\nThis will permanently delete all pantry items, shopping list entries, and event log records. User accounts will be kept.\n\nThis cannot be undone."
      )
    )
      return;

    setClearing(true);
    const res = await fetch("/api/admin/db/clear", { method: "POST", credentials: "include" });
    setClearing(false);

    if (res.ok) {
      alert("All application data cleared.");
    } else {
      const data = await res.json();
      alert(data.error ?? "Clear failed");
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Database Administration</h1>

      <div className="space-y-4">
        {/* Backup */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-1">Backup</h2>
          <p className="text-sm text-gray-500 mb-4">
            Download the full database as a ZIP file. Store it somewhere safe.
          </p>
          <button
            onClick={handleBackup}
            disabled={backingUp}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {backingUp ? "Preparing download…" : "Download backup"}
          </button>
        </div>

        {/* Restore */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-1">Restore</h2>
          <p className="text-sm text-gray-500 mb-4">
            Restore from a previously downloaded backup ZIP. All current data will be replaced.
          </p>

          {restoreMsg && (
            <div
              className={`mb-4 rounded-lg px-4 py-3 text-sm ${
                restoreMsg.type === "ok"
                  ? "bg-green-50 border border-green-200 text-green-700"
                  : "bg-red-50 border border-red-200 text-red-700"
              }`}
            >
              {restoreMsg.text}
              {restoreMsg.type === "ok" && (
                <button onClick={() => window.location.reload()} className="ml-3 underline font-medium">
                  Reload now
                </button>
              )}
            </div>
          )}

          <label className="cursor-pointer">
            <span className={`inline-block border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors ${restoring ? "opacity-50 pointer-events-none" : ""}`}>
              {restoring ? "Restoring…" : "Choose backup file…"}
            </span>
            <input
              type="file"
              accept=".zip"
              ref={fileRef}
              onChange={handleRestore}
              className="hidden"
            />
          </label>
        </div>

        {/* Clear data */}
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
          <h2 className="font-semibold text-red-700 mb-1">Clear application data</h2>
          <p className="text-sm text-gray-500 mb-4">
            Permanently delete all pantry items, shopping list entries, and event log records.
            User accounts are kept. This cannot be undone — download a backup first.
          </p>
          <button
            onClick={handleClear}
            disabled={clearing}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {clearing ? "Clearing…" : "Clear all data"}
          </button>
        </div>
      </div>
    </div>
  );
}
