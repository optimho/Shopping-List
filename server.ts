import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { auth } from "./lib/auth";
import apiRoutes from "./src/api/index";

const app = new Hono();

app.use("/api/auth/*", (c) => auth.handler(c.req.raw));
app.route("/api", apiRoutes);
app.use("/*", serveStatic({ root: "./public" }));

app.get("/*", async (c) => {
  const html = await Bun.file("./public/index.html").text();
  return c.html(html);
});

const port = Number(process.env.PORT ?? 3000);
console.log(`ShoppingList running on http://localhost:${port}`);

Bun.serve({ fetch: app.fetch, port });
