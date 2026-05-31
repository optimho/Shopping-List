import { Hono } from "hono";
import { getSession } from "../../lib/session";
import { run, execDirect, closeDb } from "../../lib/db";
import { closeAuthDb } from "../../lib/auth";
import { logEvent } from "../../lib/event-log";
import { zipSync, unzipSync } from "fflate";
import { readFileSync, unlinkSync, renameSync } from "fs";

const adminDb = new Hono();

const TABLES_TO_CLEAR = ["shopping_list", "pantry_items", "cupboard_items", "event_log"];

// GET /api/admin/db/backup — download ZIP of the database
adminDb.get("/backup", async (c) => {
  const session = await getSession(c.req.raw);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  if (session.user.role !== "admin") return c.json({ error: "Forbidden" }, 403);

  // VACUUM INTO creates a consistent snapshot that includes all committed WAL
  // data, even if other connections prevent a full WAL checkpoint.
  const tempPath = "data/app.db.backup_temp";
  try { unlinkSync(tempPath); } catch {}
  execDirect(`VACUUM INTO '${tempPath}'`);
  const dbBytes = readFileSync(tempPath);
  unlinkSync(tempPath);
  const zip = zipSync({ "app.db": new Uint8Array(dbBytes) });
  const filename = `shopping-list-backup-${new Date().toISOString().slice(0, 10)}.zip`;

  await logEvent({
    eventType: "db_backup",
    actorName: session.user.name,
    actorId: session.user.id,
  });

  return new Response(zip, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});

// POST /api/admin/db/restore — upload ZIP and restore
adminDb.post("/restore", async (c) => {
  const session = await getSession(c.req.raw);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  if (session.user.role !== "admin") return c.json({ error: "Forbidden" }, 403);

  const form = await c.req.formData();
  const file = form.get("file") as File | null;
  if (!file) return c.json({ error: "No file provided" }, 400);

  const bytes = new Uint8Array(await file.arrayBuffer());
  let unzipped: Record<string, Uint8Array>;
  try {
    unzipped = unzipSync(bytes);
  } catch {
    return c.json({ error: "Invalid ZIP file" }, 400);
  }

  const dbFile = unzipped["app.db"];
  if (!dbFile) return c.json({ error: "app.db not found in ZIP" }, 400);

  // Write to a temp file then atomically rename into place.
  // Bun's SQLite mmaps the DB file; even after db.close(), the mmap may linger
  // until GC. Truncating app.db in-place while that mmap exists corrupts it.
  // renameSync replaces the directory entry without touching the old inode, so
  // any surviving mmap keeps reading valid (old) data while new connections
  // see the restored file.
  closeDb();
  closeAuthDb();
  const tempPath = "data/app.db.restore_temp";
  try { unlinkSync(tempPath); } catch {}
  await Bun.write(tempPath, dbFile);
  // Remove WAL/SHM that belong to the old DB — new DB starts clean without them
  try { unlinkSync("data/app.db-wal"); } catch {}
  try { unlinkSync("data/app.db-shm"); } catch {}
  renameSync(tempPath, "data/app.db");

  return c.json({ ok: true });
});

// POST /api/admin/db/clear — delete all application data (keeps auth tables)
adminDb.post("/clear", async (c) => {
  const session = await getSession(c.req.raw);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  if (session.user.role !== "admin") return c.json({ error: "Forbidden" }, 403);

  for (const table of TABLES_TO_CLEAR) {
    await run(`DELETE FROM ${table}`);
  }

  await logEvent({
    eventType: "db_cleared",
    actorName: session.user.name,
    actorId: session.user.id,
  });

  return c.json({ ok: true });
});

export default adminDb;
