import { Hono } from "hono";
import { getSession } from "../../lib/session";
import { run, closeDb } from "../../lib/db";
import { logEvent } from "../../lib/event-log";
import { zipSync, unzipSync } from "fflate";
import { readFileSync, writeFileSync } from "fs";

const adminDb = new Hono();

const TABLES_TO_CLEAR = ["shopping_list", "pantry_items", "event_log"];

// GET /api/admin/db/backup — download ZIP of the database
adminDb.get("/backup", async (c) => {
  const session = await getSession(c.req.raw);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  if (session.user.role !== "admin") return c.json({ error: "Forbidden" }, 403);

  const dbBytes = readFileSync("data/app.db");
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

  closeDb();
  writeFileSync("data/app.db", dbFile);

  await logEvent({
    eventType: "db_restore",
    actorName: session.user.name,
    actorId: session.user.id,
  });

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
