import { Hono } from "hono";
import listRoutes from "./list";
import storeRoutes from "./store";
import cupboardRoutes from "./cupboard";
import eventRoutes from "./events";
import adminUsers from "./admin-users";
import adminDb from "./admin-db";

const api = new Hono();
api.route("/list", listRoutes);
api.route("/store", storeRoutes);
api.route("/cupboard", cupboardRoutes);
api.route("/events", eventRoutes);
api.route("/admin/users", adminUsers);
api.route("/admin/db", adminDb);

export default api;
