import { Database } from "bun:sqlite";
import type { SQLQueryBindings } from "bun:sqlite";

let _db: Database | null = null;

function getDb(): Database {
  if (!_db) {
    const db = new Database("data/app.db");
    db.exec("PRAGMA journal_mode=WAL;");
    db.exec("PRAGMA foreign_keys=ON;");
    _db = db;
  }
  return _db;
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

export async function query<T>(sql: string, params: SQLQueryBindings[] = []): Promise<T[]> {
  return getDb().query(sql).all(...params) as T[];
}

export async function get<T>(sql: string, params: SQLQueryBindings[] = []): Promise<T | undefined> {
  return (getDb().query(sql).get(...params) as T | undefined) ?? undefined;
}

export async function run(sql: string, params: SQLQueryBindings[] = []): Promise<void> {
  getDb().query(sql).run(...params);
}

export function execDirect(sql: string): void {
  getDb().exec(sql);
}
