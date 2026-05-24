import { Hono } from "hono";
import { nanoid } from "nanoid";
import { getSession } from "../../lib/session";
import { query, get, run } from "../../lib/db";
import { logEvent } from "../../lib/event-log";

const list = new Hono();

interface ListRow {
  id: string;
  pantryItemId: string;
  itemName: string;
  itemBrand: string | null;
  size: string | null;
  quantity: number;
  requestedByName: string;
  requestedAt: string;
  status: string;
  purchasedByName: string | null;
  purchasedAt: string | null;
  pricePaid: number | null;
  notes: string | null;
}

// GET /api/list/stats — dashboard summary
list.get("/stats", async (c) => {
  const session = await getSession(c.req.raw);
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [pending, purchased, pantry] = await Promise.all([
    get<{ count: number }>("SELECT COUNT(*) AS count FROM shopping_list WHERE status = 'pending' AND deletedAt IS NULL"),
    get<{ count: number; total: number }>(
      "SELECT COUNT(*) AS count, COALESCE(SUM(pricePaid), 0) AS total FROM shopping_list WHERE status = 'purchased' AND purchasedAt >= ? AND deletedAt IS NULL",
      [monthStart]
    ),
    get<{ count: number }>("SELECT COUNT(*) AS count FROM pantry_items WHERE deletedAt IS NULL"),
  ]);

  return c.json({
    pendingCount: pending?.count ?? 0,
    purchasedThisMonth: purchased?.count ?? 0,
    spendThisMonth: purchased?.total ?? 0,
    pantryCount: pantry?.count ?? 0,
  });
});

// GET /api/list/recent — recently purchased items
list.get("/recent", async (c) => {
  const session = await getSession(c.req.raw);
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const rows = await query<{
    id: string; quantity: number; size: string | null; pricePaid: number | null;
    purchasedByName: string | null; purchasedAt: string; itemName: string; itemBrand: string | null;
  }>(`
    SELECT sl.id, sl.quantity, sl.size, sl.pricePaid, sl.purchasedByName, sl.purchasedAt,
           p.name AS itemName, p.brand AS itemBrand
    FROM shopping_list sl
    JOIN pantry_items p ON p.id = sl.pantryItemId
    WHERE sl.status = 'purchased' AND sl.deletedAt IS NULL
    ORDER BY sl.purchasedAt DESC LIMIT 10
  `);
  return c.json(rows);
});

// GET /api/list — all pending items with pantry item details
list.get("/", async (c) => {
  const session = await getSession(c.req.raw);
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const rows = await query<ListRow>(`
    SELECT
      sl.id, sl.pantryItemId, sl.size, sl.quantity,
      sl.requestedByName, sl.requestedAt, sl.status,
      sl.purchasedByName, sl.purchasedAt, sl.pricePaid, sl.notes,
      p.name AS itemName, p.brand AS itemBrand
    FROM shopping_list sl
    JOIN pantry_items p ON p.id = sl.pantryItemId
    WHERE sl.status = 'pending' AND sl.deletedAt IS NULL
    ORDER BY sl.requestedAt ASC
  `);
  return c.json(rows);
});

// POST /api/list — add item to shopping list
list.post("/", async (c) => {
  const session = await getSession(c.req.raw);
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.json();
  if (!body.pantryItemId) return c.json({ error: "pantryItemId is required" }, 400);

  const item = await get<{ id: string; name: string }>(
    "SELECT id, name FROM pantry_items WHERE id = ? AND deletedAt IS NULL",
    [body.pantryItemId]
  );
  if (!item) return c.json({ error: "Pantry item not found" }, 404);

  const id  = nanoid();
  const now = new Date().toISOString();

  await run(
    `INSERT INTO shopping_list
       (id, pantryItemId, size, quantity, requestedByName, requestedById, requestedAt, status, notes, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
    [
      id,
      body.pantryItemId,
      body.size ?? null,
      body.quantity ?? 1,
      session.user.name,
      session.user.id,
      now,
      body.notes ?? null,
      now,
      now,
    ]
  );

  await logEvent({
    eventType: "item_added_to_list",
    entityId: id,
    entityType: "shopping_list",
    actorName: session.user.name,
    actorId: session.user.id,
    detail: { itemName: item.name, size: body.size, quantity: body.quantity ?? 1 },
  });

  return c.json({ id }, 201);
});

// POST /api/list/:id/purchase — mark as purchased
list.post("/:id/purchase", async (c) => {
  const session = await getSession(c.req.raw);
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const listItem = await get<{ id: string; pantryItemId: string; status: string; quantity: number; size: string | null }>(
    "SELECT id, pantryItemId, status, quantity, size FROM shopping_list WHERE id = ? AND deletedAt IS NULL",
    [c.req.param("id")]
  );
  if (!listItem) return c.json({ error: "Not found" }, 404);
  if (listItem.status !== "pending") return c.json({ error: "Item is already purchased" }, 400);

  const body = await c.req.json().catch(() => ({}));
  const pricePaid = body.pricePaid != null ? Number(body.pricePaid) : null;
  const now = new Date().toISOString();

  await run(
    `UPDATE shopping_list
     SET status = 'purchased', purchasedByName = ?, purchasedById = ?, purchasedAt = ?, pricePaid = ?, updatedAt = ?
     WHERE id = ?`,
    [session.user.name, session.user.id, now, pricePaid, now, listItem.id]
  );

  // Update typicalPrice on pantry item if a price was provided
  if (pricePaid != null) {
    await run(
      "UPDATE pantry_items SET typicalPrice = ?, updatedAt = ? WHERE id = ?",
      [pricePaid, now, listItem.pantryItemId]
    );
  }

  const pantryItem = await get<{ name: string; brand: string | null }>(
    "SELECT name, brand FROM pantry_items WHERE id = ?",
    [listItem.pantryItemId]
  );

  await logEvent({
    eventType: "item_purchased",
    entityId: listItem.id,
    entityType: "shopping_list",
    actorName: session.user.name,
    actorId: session.user.id,
    detail: { itemName: pantryItem?.name, brand: pantryItem?.brand, pricePaid },
  });

  // Upsert into cupboard — merge by pantryItemId + size
  const itemSize = listItem.size ?? null;
  const existing = await get<{ id: string; quantity: number }>(
    "SELECT id, quantity FROM cupboard_items WHERE pantryItemId = ? AND (size IS ? OR size = ?)",
    [listItem.pantryItemId, itemSize, itemSize]
  );
  if (existing) {
    await run(
      "UPDATE cupboard_items SET quantity = ?, updatedAt = ? WHERE id = ?",
      [existing.quantity + listItem.quantity, now, existing.id]
    );
  } else {
    await run(
      "INSERT INTO cupboard_items (id, pantryItemId, name, brand, size, quantity, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [nanoid(), listItem.pantryItemId, pantryItem?.name ?? "", pantryItem?.brand ?? null, itemSize, listItem.quantity, now, now]
    );
  }

  return c.json({ ok: true });
});

// DELETE /api/list/:id — remove from list without purchasing
list.delete("/:id", async (c) => {
  const session = await getSession(c.req.raw);
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const listItem = await get<{ id: string; requestedById: string | null }>(
    "SELECT id, requestedById FROM shopping_list WHERE id = ? AND deletedAt IS NULL AND status = 'pending'",
    [c.req.param("id")]
  );
  if (!listItem) return c.json({ error: "Not found" }, 404);

  const isAdmin = session.user.role === "admin";
  if (!isAdmin && listItem.requestedById !== session.user.id) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const now = new Date().toISOString();
  await run(
    "UPDATE shopping_list SET deletedAt = ?, updatedAt = ? WHERE id = ?",
    [now, now, listItem.id]
  );

  await logEvent({
    eventType: "item_removed_from_list",
    entityId: listItem.id,
    entityType: "shopping_list",
    actorName: session.user.name,
    actorId: session.user.id,
  });

  return c.json({ ok: true });
});

export default list;
