import { Hono } from "hono";
import { getSession } from "../../lib/session";
import { query } from "../../lib/db";

const events = new Hono();

interface EventRow {
  id: string;
  eventType: string;
  entityId: string | null;
  entityType: string | null;
  actorName: string | null;
  actorId: string | null;
  detail: string | null;
  createdAt: string;
  updatedAt: string;
}

// GET /api/events — list with optional filters (admin only)
events.get("/", async (c) => {
  const session = await getSession(c.req.raw);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  if (session.user.role !== "admin") return c.json({ error: "Forbidden" }, 403);

  const type = c.req.query("type") ?? "";
  const from = c.req.query("from") ?? "";
  const to = c.req.query("to") ?? "";

  let sql = "SELECT * FROM event_log WHERE 1=1";
  const params: unknown[] = [];

  if (type) {
    sql += " AND eventType = ?";
    params.push(type);
  }
  if (from) {
    sql += " AND createdAt >= ?";
    params.push(from);
  }
  if (to) {
    sql += " AND createdAt <= ?";
    params.push(`${to}T23:59:59Z`);
  }

  sql += " ORDER BY createdAt DESC LIMIT 500";

  const rows = await query<EventRow>(sql, params);
  return c.json(rows);
});

// GET /api/events/export — CSV download (admin only)
events.get("/export", async (c) => {
  const session = await getSession(c.req.raw);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  if (session.user.role !== "admin") return c.json({ error: "Forbidden" }, 403);

  const rows = await query<EventRow>("SELECT * FROM event_log ORDER BY createdAt DESC");

  const headers: (keyof EventRow)[] = [
    "id", "eventType", "entityId", "entityType", "actorName", "actorId", "detail", "createdAt",
  ];
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };

  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ].join("\n");

  const filename = `events-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});

export default events;
