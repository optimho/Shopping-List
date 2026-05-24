import { Hono } from "hono";
import { getSession } from "../../lib/session";
import { query, get, run } from "../../lib/db";

const cupboard = new Hono();

interface CupboardRow {
  id: string;
  pantryItemId: string;
  name: string;
  brand: string | null;
  size: string | null;
  quantity: number;
}

// GET /api/cupboard — all items with quantity > 0
cupboard.get("/", async (c) => {
  const session = await getSession(c.req.raw);
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const rows = await query<CupboardRow>(
    "SELECT id, pantryItemId, name, brand, size, quantity FROM cupboard_items WHERE quantity > 0 ORDER BY name ASC"
  );
  return c.json(rows);
});

// POST /api/cupboard/:id/use — decrement quantity by 1
cupboard.post("/:id/use", async (c) => {
  const session = await getSession(c.req.raw);
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const item = await get<CupboardRow>(
    "SELECT id, pantryItemId, name, brand, size, quantity FROM cupboard_items WHERE id = ?",
    [c.req.param("id")]
  );
  if (!item) return c.json({ error: "Not found" }, 404);

  const now = new Date().toISOString();

  if (item.quantity > 1) {
    await run(
      "UPDATE cupboard_items SET quantity = ?, updatedAt = ? WHERE id = ?",
      [item.quantity - 1, now, item.id]
    );
    return c.json({ remaining: item.quantity - 1 });
  } else {
    await run("DELETE FROM cupboard_items WHERE id = ?", [item.id]);
    return c.json({
      remaining: 0,
      pantryItemId: item.pantryItemId,
      name: item.name,
      size: item.size,
    });
  }
});

export default cupboard;
