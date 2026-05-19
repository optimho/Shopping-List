import { Hono } from "hono";
import { getSession } from "../../lib/session";
import { query, get, run } from "../../lib/db";

const adminUsers = new Hono();

// GET /api/admin/users — list all users
adminUsers.get("/", async (c) => {
  const session = await getSession(c.req.raw);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  if (session.user.role !== "admin") return c.json({ error: "Forbidden" }, 403);

  const rows = await query<{ id: string; name: string; email: string; role: string; createdAt: string }>(
    `SELECT id, name, email, role, createdAt FROM "user" ORDER BY name ASC`
  );
  return c.json(rows);
});

// PATCH /api/admin/users/:id — update role
adminUsers.patch("/:id", async (c) => {
  const session = await getSession(c.req.raw);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  if (session.user.role !== "admin") return c.json({ error: "Forbidden" }, 403);

  const body = await c.req.json();
  if (!body.role || !["user", "admin"].includes(body.role)) {
    return c.json({ error: "Invalid role — must be 'user' or 'admin'" }, 400);
  }

  const user = await get<{ id: string }>(
    `SELECT id FROM "user" WHERE id = ?`,
    [c.req.param("id")]
  );
  if (!user) return c.json({ error: "Not found" }, 404);

  const now = new Date().toISOString();
  await run(`UPDATE "user" SET role = ?, updatedAt = ? WHERE id = ?`, [body.role, now, user.id]);

  return c.json({ ok: true });
});

// DELETE /api/admin/users/:id — remove user
adminUsers.delete("/:id", async (c) => {
  const session = await getSession(c.req.raw);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  if (session.user.role !== "admin") return c.json({ error: "Forbidden" }, 403);

  if (c.req.param("id") === session.user.id) {
    return c.json({ error: "Cannot delete your own account" }, 400);
  }

  const user = await get<{ id: string }>(
    `SELECT id FROM "user" WHERE id = ?`,
    [c.req.param("id")]
  );
  if (!user) return c.json({ error: "Not found" }, 404);

  await run(`DELETE FROM "user" WHERE id = ?`, [user.id]);

  return c.json({ ok: true });
});

export default adminUsers;
