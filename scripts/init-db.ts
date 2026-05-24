import { Database } from "bun:sqlite";
import { mkdirSync } from "fs";

mkdirSync("data", { recursive: true });

const db = new Database("data/app.db");
db.exec("PRAGMA journal_mode=WAL;");
db.exec("PRAGMA foreign_keys=ON;");

// ── better-auth tables ──────────────────────────────────────────────────────
db.exec(`
CREATE TABLE IF NOT EXISTS "user" (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  emailVerified  INTEGER NOT NULL DEFAULT 0,
  image          TEXT,
  createdAt      TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt      TEXT NOT NULL DEFAULT (datetime('now')),
  role           TEXT NOT NULL DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS "session" (
  id          TEXT PRIMARY KEY,
  expiresAt   TEXT NOT NULL,
  token       TEXT NOT NULL UNIQUE,
  createdAt   TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt   TEXT NOT NULL DEFAULT (datetime('now')),
  ipAddress   TEXT,
  userAgent   TEXT,
  userId      TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account" (
  id                      TEXT PRIMARY KEY,
  accountId               TEXT NOT NULL,
  providerId              TEXT NOT NULL,
  userId                  TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  accessToken             TEXT,
  refreshToken            TEXT,
  idToken                 TEXT,
  accessTokenExpiresAt    TEXT,
  refreshTokenExpiresAt   TEXT,
  scope                   TEXT,
  password                TEXT,
  createdAt               TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt               TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "verification" (
  id          TEXT PRIMARY KEY,
  identifier  TEXT NOT NULL,
  value       TEXT NOT NULL,
  expiresAt   TEXT NOT NULL,
  createdAt   TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt   TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// ── Application tables ──────────────────────────────────────────────────────
db.exec(`
CREATE TABLE IF NOT EXISTS pantry_items (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  brand         TEXT,
  category      TEXT,
  sizes         TEXT,
  defaultSize   TEXT,
  typicalPrice  REAL,
  notes         TEXT,
  createdByName TEXT,
  createdById   TEXT,
  createdAt     TEXT NOT NULL,
  updatedAt     TEXT NOT NULL,
  deletedAt     TEXT
);

CREATE TABLE IF NOT EXISTS shopping_list (
  id               TEXT PRIMARY KEY,
  pantryItemId     TEXT NOT NULL REFERENCES pantry_items(id),
  size             TEXT,
  quantity         INTEGER NOT NULL DEFAULT 1,
  requestedByName  TEXT NOT NULL,
  requestedById    TEXT,
  requestedAt      TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending',
  purchasedByName  TEXT,
  purchasedById    TEXT,
  purchasedAt      TEXT,
  pricePaid        REAL,
  notes            TEXT,
  createdAt        TEXT NOT NULL,
  updatedAt        TEXT NOT NULL,
  deletedAt        TEXT
);

CREATE TABLE IF NOT EXISTS event_log (
  id         TEXT PRIMARY KEY,
  eventType  TEXT NOT NULL,
  entityId   TEXT,
  entityType TEXT,
  actorName  TEXT,
  actorId    TEXT,
  detail     TEXT,
  createdAt  TEXT NOT NULL,
  updatedAt  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cupboard_items (
  id            TEXT PRIMARY KEY,
  pantryItemId  TEXT NOT NULL,
  name          TEXT NOT NULL,
  brand         TEXT,
  size          TEXT,
  quantity      INTEGER NOT NULL DEFAULT 1,
  createdAt     TEXT NOT NULL,
  updatedAt     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pantry_name     ON pantry_items(name);
CREATE INDEX IF NOT EXISTS idx_pantry_category ON pantry_items(category);
CREATE INDEX IF NOT EXISTS idx_list_status     ON shopping_list(status);
CREATE INDEX IF NOT EXISTS idx_event_type      ON event_log(eventType);
CREATE INDEX IF NOT EXISTS idx_event_created   ON event_log(createdAt);
CREATE INDEX IF NOT EXISTS idx_cupboard_pantry ON cupboard_items(pantryItemId);
`);

console.log("Database initialised successfully.");
