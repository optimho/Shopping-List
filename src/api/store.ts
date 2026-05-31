import { Hono } from "hono";
import { nanoid } from "nanoid";
import { getSession } from "../../lib/session";
import { query, get, run } from "../../lib/db";
import { logEvent } from "../../lib/event-log";

const pantry = new Hono();

interface PantryItem {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  sizes: string | null;
  defaultSize: string | null;
  typicalPrice: number | null;
  notes: string | null;
  createdByName: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

// GET /api/pantry — list all items
pantry.get("/", async (c) => {
  const session = await getSession(c.req.raw);
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const search = c.req.query("search") ?? "";
  const category = c.req.query("category") ?? "";

  let sql = "SELECT * FROM pantry_items WHERE deletedAt IS NULL";
  const params: string[] = [];

  if (search) {
    sql += " AND (name LIKE ? OR brand LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category) {
    sql += " AND category = ?";
    params.push(category);
  }
  sql += " ORDER BY name ASC";

  const rows = await query<PantryItem>(sql, params);
  return c.json(rows);
});

// GET /api/store/export — download all store items as CSV (admin only)
pantry.get("/export", async (c) => {
  const session = await getSession(c.req.raw);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  if (session.user.role !== "admin") return c.json({ error: "Forbidden" }, 403);

  const rows = await query<PantryItem>(
    "SELECT * FROM pantry_items WHERE deletedAt IS NULL ORDER BY name ASC"
  );

  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };

  const headers = ["name", "brand", "category", "sizes", "defaultSize", "typicalPrice", "notes"];
  const csv = [
    headers.join(","),
    ...rows.map((row) => [
      escape(row.name),
      escape(row.brand),
      escape(row.category),
      escape(row.sizes ? (JSON.parse(row.sizes) as string[]).join("|") : ""),
      escape(row.defaultSize),
      escape(row.typicalPrice),
      escape(row.notes),
    ].join(",")),
  ].join("\n");

  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="store-items-${date}.csv"`,
    },
  });
});

// GET /api/pantry/categories — distinct categories
pantry.get("/categories", async (c) => {
  const session = await getSession(c.req.raw);
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const rows = await query<{ category: string }>(
    "SELECT DISTINCT category FROM pantry_items WHERE category IS NOT NULL AND deletedAt IS NULL ORDER BY category ASC"
  );
  return c.json(rows.map((r) => r.category));
});

// POST /api/pantry — create item (any logged-in user)
pantry.post("/", async (c) => {
  const session = await getSession(c.req.raw);
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.json();
  if (!body.name) return c.json({ error: "name is required" }, 400);

  const id = nanoid();
  const now = new Date().toISOString();

  await run(
    `INSERT INTO pantry_items
       (id, name, brand, category, sizes, defaultSize, typicalPrice, notes, createdByName, createdById, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      body.name,
      body.brand ?? null,
      body.category ?? null,
      body.sizes ? JSON.stringify(body.sizes) : null,
      body.defaultSize ?? null,
      body.typicalPrice != null ? Number(body.typicalPrice) : null,
      body.notes ?? null,
      session.user.name,
      session.user.id,
      now,
      now,
    ]
  );

  await logEvent({
    eventType: "pantry_item_created",
    entityId: id,
    entityType: "pantry_item",
    actorName: session.user.name,
    actorId: session.user.id,
    detail: { name: body.name },
  });

  return c.json({ id }, 201);
});

// POST /api/store/import — bulk import items (admin only)
pantry.post("/import", async (c) => {
  const session = await getSession(c.req.raw);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  if (session.user.role !== "admin") return c.json({ error: "Forbidden" }, 403);

  const body = await c.req.json();
  if (!Array.isArray(body) || body.length === 0)
    return c.json({ error: "Expected a non-empty array of items" }, 400);

  const now = new Date().toISOString();
  let imported = 0;
  const skippedNames: string[] = [];
  const importedNames: string[] = [];

  for (const item of body) {
    const name = typeof item.name === "string" ? item.name.trim() : "";
    if (!name) continue;

    const existing = await get<{ id: string }>(
      "SELECT id FROM pantry_items WHERE lower(name) = lower(?) AND deletedAt IS NULL",
      [name]
    );
    if (existing) { skippedNames.push(name); continue; }

    const id = nanoid();
    const sizes = Array.isArray(item.sizes) ? item.sizes : null;
    await run(
      `INSERT INTO pantry_items
         (id, name, brand, category, sizes, defaultSize, typicalPrice, notes, createdByName, createdById, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name,
        typeof item.brand === "string" ? item.brand.trim() || null : null,
        typeof item.category === "string" ? item.category.trim() || null : null,
        sizes ? JSON.stringify(sizes) : null,
        typeof item.defaultSize === "string" ? item.defaultSize.trim() || null : null,
        item.typicalPrice != null ? Number(item.typicalPrice) : null,
        typeof item.notes === "string" ? item.notes.trim() || null : null,
        session.user.name,
        session.user.id,
        now,
        now,
      ]
    );
    imported++;
    importedNames.push(name);
  }

  if (imported > 0) {
    await logEvent({
      eventType: "pantry_items_imported",
      entityId: "bulk",
      entityType: "pantry_item",
      actorName: session.user.name,
      actorId: session.user.id,
      detail: { count: imported, names: importedNames },
    });
  }

  return c.json({ imported, skipped: skippedNames.length, skippedNames });
});

// GET /api/pantry/:id — single item with shopping history
pantry.get("/:id", async (c) => {
  const session = await getSession(c.req.raw);
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const item = await get<PantryItem>(
    "SELECT * FROM pantry_items WHERE id = ? AND deletedAt IS NULL",
    [c.req.param("id")]
  );
  if (!item) return c.json({ error: "Not found" }, 404);

  const history = await query<{
    id: string;
    quantity: number;
    size: string | null;
    pricePaid: number | null;
    purchasedByName: string | null;
    purchasedAt: string | null;
    requestedByName: string;
    requestedAt: string;
    status: string;
  }>(
    `SELECT id, quantity, size, pricePaid, purchasedByName, purchasedAt, requestedByName, requestedAt, status
     FROM shopping_list WHERE pantryItemId = ? AND deletedAt IS NULL
     ORDER BY requestedAt DESC LIMIT 20`,
    [item.id]
  );

  return c.json({
    ...item,
    sizes: item.sizes ? JSON.parse(item.sizes) : [],
    history,
  });
});

// PUT /api/pantry/:id — update item (any logged-in user)
pantry.put("/:id", async (c) => {
  const session = await getSession(c.req.raw);
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const item = await get<{ id: string }>(
    "SELECT id FROM pantry_items WHERE id = ? AND deletedAt IS NULL",
    [c.req.param("id")]
  );
  if (!item) return c.json({ error: "Not found" }, 404);

  const body = await c.req.json();
  if (!body.name) return c.json({ error: "name is required" }, 400);

  const now = new Date().toISOString();
  await run(
    `UPDATE pantry_items
     SET name = ?, brand = ?, category = ?, sizes = ?, defaultSize = ?, typicalPrice = ?, notes = ?, updatedAt = ?
     WHERE id = ?`,
    [
      body.name,
      body.brand ?? null,
      body.category ?? null,
      body.sizes ? JSON.stringify(body.sizes) : null,
      body.defaultSize ?? null,
      body.typicalPrice != null ? Number(body.typicalPrice) : null,
      body.notes ?? null,
      now,
      item.id,
    ]
  );

  await logEvent({
    eventType: "pantry_item_updated",
    entityId: item.id,
    entityType: "pantry_item",
    actorName: session.user.name,
    actorId: session.user.id,
    detail: { name: body.name },
  });

  return c.json({ ok: true });
});

// DELETE /api/pantry/:id — soft delete (admin)
pantry.delete("/:id", async (c) => {
  const session = await getSession(c.req.raw);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  if (session.user.role !== "admin") return c.json({ error: "Forbidden" }, 403);

  const item = await get<{ id: string; name: string }>(
    "SELECT id, name FROM pantry_items WHERE id = ? AND deletedAt IS NULL",
    [c.req.param("id")]
  );
  if (!item) return c.json({ error: "Not found" }, 404);

  const now = new Date().toISOString();
  await run("UPDATE pantry_items SET deletedAt = ?, updatedAt = ? WHERE id = ?", [now, now, item.id]);

  await logEvent({
    eventType: "pantry_item_deleted",
    entityId: item.id,
    entityType: "pantry_item",
    actorName: session.user.name,
    actorId: session.user.id,
    detail: { name: item.name },
  });

  return c.json({ ok: true });
});

export default pantry;
