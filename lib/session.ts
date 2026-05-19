import { auth } from "./auth";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AppSession {
  user: SessionUser;
  session: { id: string };
}

export async function getSession(request: Request): Promise<AppSession | null> {
  return auth.api.getSession({ headers: request.headers }) as Promise<AppSession | null>;
}

export function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return Response.json({ error: "Forbidden" }, { status: 403 });
}

export function notFound() {
  return Response.json({ error: "Not found" }, { status: 404 });
}

export function badRequest(msg: string) {
  return Response.json({ error: msg }, { status: 400 });
}
