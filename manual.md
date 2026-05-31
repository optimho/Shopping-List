# ShoppingList — User Manual

<div align="center">

```text
🛒 ✨ 🥛 🥖 🍎 ✨ 🧀 🍌 🧃
```

**Your cheerful family shopping sidekick**

```text
╭───────────────────────────────╮
│   Plan it • Grab it • Done!   │
╰───────────────────────────────╯
```

</div>

---

## What is it?

<div align="center">

```text
🏡 📡 🛒 ➜ 📱
```

</div>

ShoppingList is a shared family shopping list that runs on a Raspberry Pi at home and is
accessible from anywhere — including at the supermarket on your phone. No app to install;
it opens in your browser.

Everyone in the family sees the same live list. When someone is at the shops and picks up
an item, they tap **Got it** and it disappears from the list for everyone. The item is
then automatically added to the **Cupboard** — your home inventory of what's in the house.

> 🎉 **Good to know:** the list is shared, simple, and designed for quick use on a phone.

---

## Getting Started

<div align="center">

```text
🚪 ➜ 🔐 ➜ ✅ ➜ 🛒
```

</div>

### Signing in

Open the app in your browser (ask your administrator for the address).

On the login page, enter your **email address** and **password**, then tap **Sign in**.

If you do not have an account yet, tap **Register** and create one.
New accounts start with standard user access. Ask your administrator if you need
elevated permissions.

> 💡 **Tip:** Save the site as a bookmark on your phone so it is easy to open at the shop.

### Signing out

Tap your name or the **Sign out** link in the navigation bar at the top of the page.
On a phone, tap the menu icon (three lines) to find the Sign out option.

---

## The Shopping List

<div align="center">

```text
📝 ➕ 🛍️ ➜ ✅ ➜ 🎉
```

</div>

This is the main page you will use. Navigate to it by tapping **Shopping List** in the
navigation bar.

### What you see

The page shows every item that still needs to be bought, in the order they were added.
Each card shows:

- The **item name** and brand
- The **size or variant** (e.g. 2L, 1kg)
- How many are needed (**quantity**)
- Any **notes** left by the person who added it (e.g. "no-name brand is fine")
- Who added it and when

### Adding an item to the list

1. Tap **+ Add item** in the top-right corner.
2. A search panel appears. Start typing the name of the item (e.g. "milk", "bread").
3. Matching items from the store appear as you type. Tap the one you want.
4. Select the **size** if the item has multiple sizes. The default size is pre-selected.
5. Set the **quantity** (default is 1).
6. Optionally add a **note** for the shopper (e.g. "reduced-salt version if available").
7. Tap **Add to list**.

The item appears on the list immediately and is visible to everyone.

> 🛍️ **Shopping magic:** once added, everyone sees it straight away.

**Item not in the list?**
If no matching items appear, the item is not in the store catalogue yet. Tap the link
*"Add it to the store first"* to go and create it (see the Store section below),
then come back and add it to the list.

### Marking an item as purchased — "Got it"

When you are at the shops and pick up an item:

1. Find the item on the list.
2. Tap the green **Got it** button.
3. A small box appears asking for the **price paid** — this is optional. Enter it if
   you want to track household spending. Leave it blank if you don't care.
4. Tap **Confirm**.

The item is removed from the active list for everyone, the purchase is recorded in
the history, and the item automatically appears in your **Cupboard**.

<div align="center">

```text
🥫  🥛  🍞  ➜  ✅ Got it!  ➜  🧺 In the cupboard
```

</div>

### Removing an item without buying it

If an item no longer needs to be bought (for example, someone already has it at home):

- Tap **Remove** (shown in small red text below the Got it button).
- You can only remove items you added yourself. Administrators can remove any item.

The item disappears from the list without being recorded as a purchase.

---

## The Cupboard

<div align="center">

```text
🧺 🥛 🧈 🍯 🥫 📦
```

</div>

The Cupboard tracks what you actually have at home right now. Every time you press
**Got it** on the shopping list, the item is automatically added to the Cupboard.

Navigate to it by tapping **Cupboard** in the navigation bar.

### What you see

A table of everything currently in your cupboard, showing the item name, brand, size,
and quantity (shown as a small purple badge).

### Marking an item as used up

When you finish using something:

1. Find the item in the Cupboard.
2. Tap the **Used up** button.
3. The quantity decrements by 1.
4. When the last one is gone, a prompt appears:

```text
🛒  All used up!
    Add [item name] to the shopping list?
    [ No thanks ]  [ Yes, add it ]
```

- Tap **Yes, add it** — the item is immediately added to the shopping list so the next
  shopper knows to pick it up.
- Tap **No thanks** — nothing happens; you can add it to the list manually later.

> 💡 **Tip:** if you bought 3 of something, the Cupboard shows Qty 3. Each "Used up"
> press decrements by one, so you get a prompt only when the very last one is gone.

---

## The Store

<div align="center">

```text
🥫 🧈 🧼 📦 🍯 🥣
```

</div>

The Store is the master catalogue of items your household buys. Think of it as your
personal product list — items are added once and then available forever for adding to
the shopping list.

Navigate to it by tapping **Store** in the navigation bar.

### Browsing and searching

- Use the **search box** to filter by name or brand (e.g. type "anchor" to find
  Anchor butter, Anchor cheese, etc.).
- Use the **category dropdown** to filter by category (Dairy, Cleaning, etc.).
- Tap any item's name to open its full detail page.

> 🔎 **Quick idea:** searching by brand is often the fastest way to find familiar items.

### Adding directly to the shopping list from the Store

Each item in the Store has a **+ Add** button on the right. Tap it to open a quick
add panel without leaving the Store page:

1. Select the **size** (or type one if no sizes are defined).
2. Set the **quantity** using the − / + buttons.
3. Optionally add a **note**.
4. Tap **Add to list** — the item goes straight onto the shopping list.

### Exporting the store catalogue to CSV (admin only)

Tap **Export CSV** at the top of the Store page to download all current store items as a CSV file. The file uses the same format as the import template (sizes pipe-separated), so you can export, edit in a spreadsheet, and re-import.

### Importing items from a CSV file (admin only)

If you have a spreadsheet of items to add in bulk, you can import them all at once using a CSV file.

1. Tap **Import CSV** at the top of the Store page (visible to admins only).
2. The import modal opens. Tap **Download template CSV** to get a pre-formatted file you can fill in.
3. Fill in the template in Excel or Google Sheets:
   - `name` is required; all other columns are optional
   - Use `|` to separate multiple sizes in the `sizes` column — e.g. `375g|750g|1kg`
4. Save the file as CSV and upload it using the **Choose file** button.
5. A preview table shows all the rows that will be imported. Check it, then tap **Import N items**.
6. The summary screen shows how many items were imported and how many were skipped (items are skipped if a store item with the same name already exists).

> A ready-to-use list of common NZ grocery items is included in the project at `grocery-items.csv`.

### Adding a new store item

Any logged-in user can add new items to the Store catalogue.

Tap **+ New item** at the top of the Store page and fill in the form:

| Field | What to enter |
|-------|--------------|
| **Name** | The product name — e.g. `Peanut Butter` |
| **Brand** | Brand or variant — e.g. `Sanitarium`, `Home Brand` |
| **Category** | Choose the category that fits best (Dairy, Pantry, Cleaning, etc.) |
| **Sizes** | Comma-separated list of sizes you buy — e.g. `375g, 750g` |
| **Default size** | The size you buy most often |
| **Typical price** | Rough price for reference. Updated automatically when purchases are recorded. |
| **Notes** | Any standing notes — e.g. `Only buy if on special` |

Tap **Create item**. You are taken straight to the new item's detail page.

### Store item detail page

Tap any item's name to open its detail page. You will see:

- All the item's details (category, sizes, typical price, notes)
- **Average price paid** — calculated from all recorded purchases of this item
- **Times purchased** — how many times this item has been marked purchased
- **Shopping history** — every time this item was on the list, who requested it, who
  bought it, the size, quantity, and price paid

**Editing an item:**
Tap the **Edit** button on any row in the Store list, or on the item's detail page.
A form opens pre-filled with the item's current details — change anything you like
and tap **Save changes** when done.

**Deleting an item (admin only):**
Open the Edit form for the item and tap **Delete** (shown in red at the bottom left).
The item is removed from the store catalogue. Items currently on the shopping list are
not affected.

---

## Dashboard

<div align="center">

```text
📊 🧾 💰 📦 📈 ✨
```

</div>

The dashboard gives a quick summary of household activity. Navigate to it by tapping
**Dashboard** or the **Shopping List** logo in the navigation bar.

The four summary cards show:

| Card | What it means |
|------|--------------|
| **Items on list** | How many items are currently waiting to be bought |
| **Purchased this month** | Number of items marked "Got it" since the 1st of this month |
| **Spent this month** | Total spend recorded this month (only counts purchases where a price was entered) |
| **Store items** | Total number of items in the store catalogue |

Below the cards, **Recent purchases** shows the last 10 items that were marked as
purchased, with who bought them and the price paid.

> 📈 **At a glance:** this is the best page for a quick household check-in.

---

## Administrator Functions

<div align="center">

```text
🛠️ 👤 📜 💾 🔐
```

</div>

The following pages are only visible to users with the **Admin** role.

### User Management (`/users`)

Shows a list of all accounts. From here an administrator can:

- **Change a user's role** — use the dropdown in the Role column to switch between
  `user` and `admin`. Changes take effect immediately.
- **Delete a user** — tap **Delete** on that user's row. This permanently removes
  the account. The user's activity (shopping list entries, purchases) is kept in
  the history. You cannot delete your own account.

New users register themselves at `/register`. Their role always starts as `user`;
promote them to `admin` here if needed.

### Event Log (`/admin/events`)

The event log is an append-only record of every significant action in the application.
It is never modified or deleted and is useful for reviewing household spend over time.

**Event types recorded:**

| Event | When it happens |
|-------|----------------|
| `item_added_to_list` | Someone adds an item to the shopping list |
| `item_purchased` | Someone taps Got it (includes item name, size, quantity, price paid) |
| `item_removed_from_list` | An item is removed without being purchased |
| `pantry_item_created` | A new item is added to the store catalogue |
| `pantry_item_updated` | A store item is edited |
| `pantry_item_deleted` | A store item is deleted |
| `db_backup` | An admin downloads a database backup |
| `db_restore` | An admin restores from a backup |
| `db_cleared` | An admin clears all application data |

**Filtering:**

- **Event type** — select from the dropdown to show only one type of event
  (e.g. `item_purchased` to see a purchase history)
- **From / To dates** — narrow to a date range (useful for monthly spend reviews)
- Tap **Clear filters** to reset

**Exporting to CSV:**

Tap **Export CSV** to download the current filtered view as a spreadsheet. The file
can be opened in Excel or Google Sheets for further analysis.

**Spend report tip:**
To see this month's grocery spend: set the Event type to `item_purchased`, set the
From date to the 1st of this month, and tap Export CSV. The `detail` column contains
the item name, brand, size, quantity, and price paid for each purchase.

### Database Administration (`/admin/database`)

This page lets you back up, restore, and reset the database.

**Backup:**

Tap **Download backup** to download a ZIP file containing the database. Store this
file somewhere safe (a cloud folder, email it to yourself, etc.). The filename
includes today's date — e.g. `shopping-list-backup-2026-05-24.zip`.

Backups include all data: the store catalogue, shopping history, cupboard state,
event log, and user accounts.

**Restore:**

To restore from a backup:

1. Tap **Choose backup file…** and select a previously downloaded ZIP file.
2. A confirmation prompt appears — read it and confirm.
3. The database is replaced with the backup contents.
4. Tap **Reload now** when the success message appears.

> **Warning:** Restoring replaces all current data. Download a fresh backup first
> if you want to preserve recent activity.

**Clear all data:**

Tap **Clear all data** to permanently delete all store items, shopping list entries,
cupboard items, and event log records. User accounts are kept. This is intended for
a full reset (e.g. starting fresh after testing).

> **Warning:** This cannot be undone. Download a backup first.

---

## Tips for Using at the Shops

<div align="center">

```text
🛒 📱 ✅ 🧃 🎯
```

</div>

- Open **Shopping List** before you enter the shop so it loads while you still have
  a good connection.
- The list works on any phone browser — Safari on iPhone, Chrome on Android.
- Tap **Got it** as you put each item in your trolley so other family members can see
  the list updating in real time.
- If you pay a price you want to remember (e.g. an unusual special), enter it in the
  price field when you tap Got it. It will update the typical price shown in the store.
- If an item is unavailable at this shop, leave it on the list — someone else can
  pick it up elsewhere.

<div align="center">

```text
🧺 aisle by aisle ➜ tap tap ➜ trolley full ➜ home time
```

</div>

---

## Frequently Asked Questions

<div align="center">

```text
❓ 🥕 📦 🔄 💬
```

</div>

**Can two people use the list at the same time?**
Yes. The list is shared and live. If one family member is at the shop tapping Got it
and another is at home adding more items, both changes appear immediately when either
person refreshes the page.

**What happens if I accidentally tap Got it?**
The purchase is recorded and the item moves to the Cupboard. Contact an administrator —
they can see the event log but there is no undo button built in. The item can be added
back to the list manually.

**Why can't I add a new store item?**
Any logged-in user can add new items to the Store catalogue using the **+ New item**
button. Any logged-in user can edit existing items; deleting is admin-only.

**Can I see what we spent last month?**
Yes. Go to **Event Log** (admin only), set the event type to `item_purchased`, set the
date range to last month, and tap **Export CSV**. The spreadsheet will show every
item purchased, the price paid, and who bought it.

**The item I want isn't in the store — what do I do?**
Go to **Store → + New item**, fill in the details, and save. Then go back to
**Shopping List → + Add item** and search for the item you just added. Or use the
**+ Add** button directly from the Store page to add it to the list in one step.

**How do I access the app away from home?**
The app is exposed via Tailscale Funnel, which means it has a public web address that
works over the internet. Your administrator will give you the URL. No VPN or special
software is required — just open the URL in your phone browser.

**How do I change my password?**
There is no self-service password change currently built in. Ask your administrator to
delete your account and create a new one, or to reset your password directly in the
database.

**What is the Cupboard for?**
The Cupboard tracks what you physically have at home. Items land there automatically
when you press Got it on the shopping list. When you use the last of something, press
**Used up** and the app will offer to add it straight back onto the shopping list.

---

## Default Administrator Account

<div align="center">

```text
🔑 👑 ⚠️ 🚨
```

</div>

When the application is first set up, a default admin account is created:

```
Email:    admin@admin.com
Password: Admin1234!
```

**Change this password immediately after first login.** The administrator should
either update the password through the database tools or delete this account and
create a personal one.

> 🔒 **Important:** do not leave the default admin password in place.
