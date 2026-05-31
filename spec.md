# ShoppingList — Technical Specification

## 1. Overview

### Background

Keeping a shared household shopping list is a perennial problem — sticky notes get lost, text messages get buried, and nobody knows whether an item has already been bought. When one family member is at the shops, they have no reliable view of what is actually needed or what has already been picked up by someone else.

### Solution

ShoppingList is a lightweight family web application running on a single **Raspberry Pi** at home, exposed securely over **Tailscale Funnel** so any family member can access it from anywhere — at the supermarket, at the dairy, or at home on the couch. No app installation is required; it runs in the phone browser.

The application maintains two linked concepts:

- **Pantry** — the master catalogue of items the household buys. Any user can add a new item (name, brand/variant, available sizes, typical price). Items in the pantry are reusable — once added, they appear in search results forever and can be added to the shopping list repeatedly.
- **Shopping List** — the live list of what needs to be bought. Users select an item from the pantry (or add a new one if it isn't there yet) and it appears on the shopping list. When someone is at the shops and picks up an item, they tap **Got it** to mark it purchased, optionally recording the price they paid. The item is then removed from the active list and the purchase is recorded in the event log.

All significant actions are written to an append-only event log which can be filtered, exported as CSV, and printed — useful for tracking household spend over time.

### Key Principles

- **Simple** — the primary interface is a shopping list and a search box; no unnecessary complexity
- **Shared** — any logged-in family member sees the same live list
- **Accessible anywhere** — Tailscale Funnel exposes the Pi server securely over the internet; family members access it via their Tailscale-connected phone browser
- **Traceable** — purchases are recorded in an event log with price paid, making it easy to review household spend
- **Single node** — no peer-to-peer sync; one Pi, one database, one source of truth

---

## 2. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Runtime | **Bun** v1.3+ | Native SQLite, fast startup, runs on Raspberry Pi |
| HTTP server | **Hono** v4 | Lightweight, runs directly under `Bun.serve()` |
| Database | **bun:sqlite** | Built into Bun, no compilation required |
| Authentication | **better-auth** v1.6 | Email/password, session cookies, `role` field on user |
| Frontend | **React** 19 + **React Router** v7 | SPA built with `bun build`, served as static files |
| Styling | **TailwindCSS** v4 | CSS-first config, compiled with `@tailwindcss/cli` |
| Deployment | **Raspberry Pi** + **Tailscale Funnel** | Single node; Funnel exposes the server to the internet |

### Why Bun + Hono instead of Next.js

Next.js with Bun was evaluated first but rejected because Turbopack (Next.js's bundler) compiles API routes into Node.js chunks, making Bun's built-in `bun:sqlite` module unavailable at runtime. Running Hono directly under `Bun.serve()` means the entire process — HTTP server, database, and API — runs inside the Bun runtime where `bun:sqlite` works natively with no native add-ons or compilation required.

### No sync required

This application runs on a single node. There are no peers, no sync tables, and no sync loop. Tailscale Funnel handles remote access; all family members connect to the same Pi.

---

## 3. Data Model

### Auth tables (managed by better-auth)

`user`, `session`, `account`, `verification` — created automatically by better-auth on first run. The `user` table has an additional `role TEXT NOT NULL DEFAULT 'user'` column (values: `'user'` or `'admin'`).

---

### `pantry_items` table _(master catalogue of purchasable items)_

The pantry is the household's catalogue of items it buys. An item is added once and reused every time it goes on the shopping list.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | nanoid |
| `name` | TEXT NOT NULL | Product name (e.g. `Peanut Butter`) |
| `brand` | TEXT | Brand or variant (e.g. `Black Cat`, `Woolworths Home Brand`) |
| `category` | TEXT | `'dairy'` \| `'bakery'` \| `'meat'` \| `'produce'` \| `'frozen'` \| `'pantry'` \| `'beverages'` \| `'cleaning'` \| `'personal care'` \| `'other'` |
| `sizes` | TEXT | JSON array of available sizes/volumes, e.g. `["400g","800g","1kg"]` |
| `defaultSize` | TEXT | The size most commonly bought |
| `typicalPrice` | REAL | Rough price for reference (updated from purchase history) |
| `notes` | TEXT | Any notes (e.g. "only buy if on special") |
| `createdByName` | TEXT | Name of the user who added this item |
| `createdById` | TEXT | FK → `user.id` |
| `createdAt` | TEXT | |
| `updatedAt` | TEXT | |
| `deletedAt` | TEXT | Soft-delete — admin can remove items from the catalogue |

---

### `shopping_list` table _(live list of items to buy)_

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | nanoid |
| `pantryItemId` | TEXT FK | → `pantry_items.id` |
| `size` | TEXT | The specific size for this purchase (chosen from the item's sizes list) |
| `quantity` | INTEGER | How many to buy (default 1) |
| `requestedByName` | TEXT | Name of the user who added it to the list |
| `requestedById` | TEXT | FK → `user.id` |
| `requestedAt` | TEXT | When it was added to the list |
| `status` | TEXT | `'pending'` \| `'purchased'` |
| `purchasedByName` | TEXT | Name of the user who marked it as purchased |
| `purchasedById` | TEXT | FK → `user.id` |
| `purchasedAt` | TEXT | When it was marked purchased |
| `pricePaid` | REAL | Price paid at purchase (optional — entered when tapping Got it) |
| `notes` | TEXT | Any note for this request (e.g. "get the reduced-salt version") |
| `createdAt` | TEXT | |
| `updatedAt` | TEXT | |
| `deletedAt` | TEXT | Soft-delete — removes item from the list without purchasing it |

---

### `event_log` table _(append-only purchase history and audit journal)_

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | nanoid |
| `eventType` | TEXT | See event types below |
| `entityId` | TEXT | ID of the affected record |
| `entityType` | TEXT | `'shopping_list'` \| `'pantry_item'` \| `'user'` |
| `actorName` | TEXT | Name of the user who triggered the event |
| `actorId` | TEXT | FK → `user.id` |
| `detail` | TEXT | JSON blob — e.g. `{"itemName":"Peanut Butter","size":"400g","pricePaid":4.99}` |
| `createdAt` | TEXT | When the event occurred |
| `updatedAt` | TEXT | Always equal to `createdAt` |

**Event types:** `'item_added_to_list'` · `'item_purchased'` · `'item_removed_from_list'` · `'pantry_item_created'` · `'pantry_item_updated'` · `'pantry_item_deleted'` · `'pantry_items_imported'` · `'user_login'` · `'db_backup'` · `'db_restore'`

> The event log is **append-only** — entries are never modified or deleted. This makes it a reliable purchase history for reviewing household spend over time.

---

## 4. User Roles

| Role | Capabilities |
|------|-------------|
| **User** | View the shopping list, add items to the shopping list, mark items as purchased (Got it) and record the price paid, add new items to the store catalogue, edit any store item, search the store |
| **Admin** | All user capabilities + manage users (add, edit role, reset password, delete), delete any store item, remove items from the shopping list without purchasing them, view and export the event log, backup and restore the database |

Users can register themselves at `/register` but their role defaults to `'user'`. Only an existing admin can elevate a user to admin.

---

## 5. Application Pages

### Public (no login required)

| Route | Page | Description |
|-------|------|-------------|
| `/` | Login | Email + password sign-in |
| `/register` | Register | Create a new account (role always defaults to `'user'`) |

### Protected (login required)

| Route | Page | Description |
|-------|------|-------------|
| `/dashboard` | Dashboard | Active shopping list count, recently purchased items, quick-add search box |
| `/list` | Shopping List | Live list of pending items — tap Got it to mark purchased |
| `/store` | Store | Searchable catalogue of all items; add new items; browse by category; quick-add to list; all users can edit inline; admin can also delete |
| `/store/:id` | Store Item | Detail — sizes, typical price, full purchase history for this item |
| `/cupboard` | Cupboard | Home inventory; auto-populated on Got it; Used up decrements and prompts re-add |

### Admin only

| Route | Page | Description |
|-------|------|-------------|
| `/users` | User Management | Add, edit role, reset password, delete users |
| `/admin/events` | Event Log | Filter by type/date/user, export CSV |
| `/admin/database` | Database Admin | Backup, restore, clear data |

---

## 6. Core Workflows

### Adding an item to the shopping list

```
1. User opens /list or /dashboard
2. Types in the search box — pantry items matching the name appear instantly
3a. Item exists in the pantry:
    - User clicks it → selects size (from item's sizes) and quantity
    - Optionally adds a note (e.g. "reduced salt if available")
    - Clicks "Add to list"
3b. Item not in the pantry:
    - User clicks "Add new item"
    - Fills in: name, brand, category, one or more sizes, typical price, notes
    - Saves → item added to pantry, then immediately added to the shopping list
4. Event logged: item_added_to_list
5. Item appears on the live list for all users
```

### Marking an item as purchased (Got it)

```
1. User is at the shops, opens /list on their phone
2. Finds the item they just picked up
3. Taps "Got it"
4. Optional: enters the price paid
5. Confirms
6. shopping_list.status → 'purchased', purchasedAt = now
7. Event logged: item_purchased (with itemName, size, quantity, pricePaid)
8. Item moves off the active list (visible in purchase history)
```

### Removing an item from the list (without purchasing)

```
1. User opens /list
2. Taps the remove (×) button on an item
3. shopping_list.deletedAt = now (soft-delete)
4. Event logged: item_removed_from_list
5. Item disappears from the active list
```

---

## 7. API Routes

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET/POST | `/api/auth/**` | — | Handled by better-auth |

### Shopping List

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/list` | User | Get all pending shopping list items |
| POST | `/api/list` | User | Add an item to the shopping list |
| POST | `/api/list/:id/purchase` | User | Mark item as purchased (optionally record price paid) |
| DELETE | `/api/list/:id` | User | Remove item from list without purchasing (soft-delete) |

### Store

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/store` | User | List/search store items (`?search=`, `?category=`) |
| GET | `/api/store/categories` | User | Distinct category list |
| GET | `/api/store/export` | Admin | Download all store items as CSV (sizes pipe-separated, import-compatible) |
| POST | `/api/store` | User | Add new store item |
| POST | `/api/store/import` | Admin | Bulk-import items from a JSON array (parsed from CSV) |
| GET | `/api/store/:id` | User | Single store item + purchase history |
| PUT | `/api/store/:id` | User | Update store item |
| DELETE | `/api/store/:id` | Admin | Soft-delete store item |

### Event Log

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/events` | Admin | List events with filter (type, date range, user) |
| GET | `/api/events/export` | Admin | Download as CSV |

### Admin — Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/users` | Admin | List users |
| POST | `/api/admin/users` | Admin | Create user |
| PUT | `/api/admin/users/:uid` | Admin | Update role or name |
| DELETE | `/api/admin/users/:uid` | Admin | Delete user |
| POST | `/api/admin/users/:uid/reset-password` | Admin | Reset password |

### Admin — Database

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/db/backup` | Admin | Download ZIP backup — uses `VACUUM INTO` for a consistent WAL-safe snapshot |
| POST | `/api/admin/db/restore` | Admin | Upload ZIP and restore — closes both DB connections then `renameSync` into place |
| POST | `/api/admin/db/clear` | Admin | Clear all application data (keeps auth tables) |

> **WAL mode gotcha:** The app runs two separate SQLite connections — one in `lib/db.ts` and one opened by better-auth in `lib/auth.ts`. Both must be closed before writing a restored DB file. `VACUUM INTO` is used for backup because a plain file read misses WAL data when the second connection holds a read lock. `renameSync` is used for restore (not `Bun.write`) because bun:sqlite mmaps the DB file and truncating it in-place while the mmap lingers corrupts it even after `db.close()`.

---

## 8. Raspberry Pi Setup

### Hardware

- Raspberry Pi 3B+ or newer
- MicroSD card, 8 GB minimum
- Power supply and home network connection (ethernet recommended)

### Software setup

```bash
# 1. Install Bun
curl -fsSL https://bun.sh/install | bash

# 2. Install and configure Tailscale with Funnel
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
sudo tailscale funnel 3000   # expose port 3000 to the internet

# 3. Clone / copy the application
cd /home/pi
git clone <repo> shopping-list
cd shopping-list
bun install
bun scripts/init-db.ts
bun scripts/seed-admin.ts

# 4. Create environment config
cat > .env.local << EOF
BETTER_AUTH_URL=https://<your-tailscale-funnel-hostname>
EOF

# 5. Build client
bun run build

# 6. Install as a systemd service
sudo systemctl enable shopping-list
sudo systemctl start shopping-list
```

### systemd service file `/etc/systemd/system/shopping-list.service`

```ini
[Unit]
Description=ShoppingList
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/shopping-list
ExecStart=/home/pi/.bun/bin/bun server.ts
Restart=always
RestartSec=5
EnvironmentFile=/home/pi/shopping-list/.env.local

[Install]
WantedBy=multi-user.target
```

---

## 9. Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP server port |
| `BETTER_AUTH_URL` | `http://localhost:3000` | Base URL — set to your Tailscale Funnel hostname for remote access |
| `BETTER_AUTH_TRUSTED_ORIGINS` | — | Comma-separated extra trusted origins |

---

## 10. Reports

### Purchase History / Spend Report

Accessible at `/admin/events`, filtered to `item_purchased` events. Shows: date, item name, brand, size, quantity, who bought it, price paid.

**Export CSV** — calls `GET /api/events/export?type=item_purchased`. CSV columns: Date, Item, Brand, Size, Quantity, Purchased By, Price Paid.

Filterable by date range and by user — useful for producing a weekly or monthly household spend summary.

---

## 11. Development Workflow

### Start development server

```bash
# Terminal 1 — backend
bun --hot server.ts

# Terminal 2 — frontend JS
bun build src/main.tsx --outdir public --target browser --watch

# Terminal 3 — CSS
bunx @tailwindcss/cli -i src/globals.css -o public/globals.css --watch
```

### Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start server with hot reload |
| `bun run build` | Build client JS + CSS |
| `bun run build:client` | Build JS only |
| `bun run build:css` | Build CSS only |
| `bun scripts/init-db.ts` | Create database tables |
| `bun scripts/seed-admin.ts` | Create default admin user |

### Default admin credentials

```
Email:    admin@admin.com
Password: Admin1234!
```

Change immediately after first login.
