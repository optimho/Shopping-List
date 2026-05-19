# ShoppingList — Raspberry Pi Deployment Guide

This guide walks through setting up the ShoppingList application on a Raspberry Pi so
that family members can access it from their phones anywhere — at the supermarket, at
a friend's place, or on the couch.

---

## How remote access works

The Pi runs the application at home on your local network. **Tailscale Funnel** gives
it a permanent public web address (like `https://mypi.tail1234.ts.net`) that works
over the internet without port-forwarding, a fixed IP, or a VPN app on anyone's phone.
Family members just open that URL in their phone browser — nothing to install.

```
Phone (anywhere)
     │
     │  HTTPS  (Tailscale Funnel — public internet)
     ▼
Raspberry Pi at home  →  ShoppingList app (port 3000)
```

---

## What you need

| Item | Notes |
|------|-------|
| Raspberry Pi 3B+, 4, or 5 | 3B+ is fine; the app is very lightweight |
| MicroSD card, 8 GB minimum | 16 GB or larger recommended |
| Power supply | Official Pi power supply preferred |
| Network connection | Ethernet is more reliable than Wi-Fi for a server |
| A computer to do the initial setup | Windows, Mac, or Linux |
| A free Tailscale account | Sign up at tailscale.com — the free plan is sufficient |

---

## Part 1 — Prepare the Raspberry Pi

### 1.1 Flash the operating system

1. Download and install **Raspberry Pi Imager** from `raspberrypi.com/software`.
2. Insert your microSD card into your computer.
3. Open Raspberry Pi Imager:
   - **Device:** choose your Pi model
   - **OS:** choose **Raspberry Pi OS Lite (64-bit)** — this is the server version
     without a desktop, which is ideal
   - **Storage:** choose your microSD card
4. Click the **gear icon** (or "Edit Settings") before writing:
   - Set a **hostname** — e.g. `shopping` (this becomes part of your URL)
   - Enable **SSH** and choose "Use password authentication"
   - Set a **username** and **password** (the default username is `pi`)
   - Configure your **Wi-Fi** if you are not using ethernet
5. Click **Save**, then **Write**. Wait for it to finish.

### 1.2 Boot and connect

1. Insert the microSD card into the Pi and power it on.
2. Wait about 60 seconds for it to finish booting.
3. From your computer, open a terminal and connect via SSH:

```bash
ssh pi@shopping.local
```

Replace `pi` with the username you chose, and `shopping.local` with your hostname.
If that does not work, try `ssh pi@<pi-ip-address>` — find the IP in your router's
device list.

### 1.3 Update the system

```bash
sudo apt update && sudo apt upgrade -y
```

This takes a few minutes. Do it once when the Pi is fresh.

---

## Part 2 — Install the application

### 2.1 Install Bun

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
```

Verify it works:

```bash
bun --version
```

You should see a version number like `1.3.14`.

### 2.2 Copy the application to the Pi

**Option A — from GitHub (if you pushed the repo):**

```bash
cd /home/pi
git clone https://github.com/optimho/Shopping-List.git shopping-list
```

**Option B — copy from your Windows machine:**

Open a terminal on your Windows machine (not on the Pi) and run:

```bash
scp -r C:/Users/micha/claudeProject/ShoppingList pi@shopping.local:/home/pi/shopping-list
```

### 2.3 Install dependencies and initialise the database

Back on the Pi:

```bash
cd /home/pi/shopping-list
bun install
bun scripts/init-db.ts
bun scripts/seed-admin.ts
```

You will see:

```
Database initialised successfully.
✓ Default admin user created:
  Email:    admin@admin.com
  Password: Admin1234!
```

---

## Part 3 — Set up Tailscale

### 3.1 Install Tailscale on the Pi

```bash
curl -fsSL https://tailscale.com/install.sh | sh
```

### 3.2 Connect the Pi to your Tailscale account

```bash
sudo tailscale up
```

A URL will appear in the terminal. Open it on any device and log in to your
Tailscale account to authorise the Pi. Come back to the terminal when done.

### 3.3 Find your Pi's Tailscale hostname

```bash
tailscale status
```

Look for a line like:

```
100.x.x.x   shopping   linux   -
```

The full Tailscale domain name for your Pi is:

```
shopping.<your-tailnet-name>.ts.net
```

To find your exact domain:

```bash
tailscale status --self | grep "DNS name"
```

It will print something like `shopping.tail1a2b3c.ts.net`. Note this down — it is
your Pi's permanent address.

### 3.4 Enable Funnel to expose the app to the internet

Tailscale Funnel makes your Pi reachable from outside your home network without
port-forwarding or a fixed IP.

```bash
sudo tailscale funnel --bg 3000
```

The `--bg` flag runs Funnel in the background and makes it survive reboots.

Verify it is active:

```bash
sudo tailscale funnel status
```

You should see port 3000 listed as active.

Your app is now accessible at:

```
https://shopping.<your-tailnet-name>.ts.net
```

This is the URL you will share with family members.

---

## Part 4 — Configure and build the application

### 4.1 Create the environment file

The application needs to know its public URL so that authentication cookies work
correctly from phones on remote networks.

```bash
cd /home/pi/shopping-list
nano .env.local
```

Add the following line, replacing the URL with your actual Tailscale Funnel address:

```
BETTER_AUTH_URL=https://shopping.tail1a2b3c.ts.net
```

Save and exit: press `Ctrl+X`, then `Y`, then `Enter`.

### 4.2 Build the frontend

```bash
bun run build
```

This compiles the React frontend and CSS. You should see:

```
Bundled 28 modules in ~50ms
Done in ~50ms
```

---

## Part 5 — Run as a system service

Setting up a systemd service ensures the application starts automatically when the
Pi boots and restarts itself if it ever crashes.

### 5.1 Create the service file

```bash
sudo nano /etc/systemd/system/shopping-list.service
```

Paste the following (adjust the username `pi` if you used a different one):

```ini
[Unit]
Description=ShoppingList
After=network-online.target
Wants=network-online.target

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

Save and exit: `Ctrl+X`, `Y`, `Enter`.

### 5.2 Enable and start the service

```bash
sudo systemctl daemon-reload
sudo systemctl enable shopping-list
sudo systemctl start shopping-list
```

### 5.3 Check it is running

```bash
sudo systemctl status shopping-list
```

You should see `Active: active (running)`. If something is wrong, the output will
show an error message.

To watch live logs:

```bash
sudo journalctl -u shopping-list -f
```

Press `Ctrl+C` to stop watching.

---

## Part 6 — First login and setup

1. On your phone, open your browser and go to:
   ```
   https://shopping.tail1a2b3c.ts.net
   ```
   (replace with your actual Funnel address)

2. You should see the ShoppingList login page.

3. Sign in with the default admin account:
   ```
   Email:    admin@admin.com
   Password: Admin1234!
   ```

4. **Change the default password immediately** — go to the admin tools or delete
   this account and create a personal one.

5. Create accounts for each family member:
   - Each person goes to `/register` on the site and creates their own account
   - Their role starts as **user** — sign in as admin and go to **Users** to
     promote someone to **admin** if needed

6. Share the URL with family members:
   ```
   https://shopping.tail1a2b3c.ts.net
   ```
   They can bookmark it on their phones. No app required.

---

## Part 7 — Add to phone home screen (optional)

Family members can add the site to their phone home screen so it feels like an app.

**iPhone (Safari):**
1. Open the URL in Safari
2. Tap the **Share** button (square with arrow)
3. Scroll down and tap **Add to Home Screen**
4. Tap **Add**

**Android (Chrome):**
1. Open the URL in Chrome
2. Tap the three-dot menu
3. Tap **Add to Home screen**
4. Tap **Add**

The site will appear as an icon on the home screen and open full-screen.

---

## Maintenance

### Checking application status

```bash
sudo systemctl status shopping-list
```

### Restarting the application

```bash
sudo systemctl restart shopping-list
```

### Viewing logs

```bash
# Last 100 lines
sudo journalctl -u shopping-list -n 100

# Live (follow)
sudo journalctl -u shopping-list -f
```

### Taking a backup

Log in to the app as admin, go to **Database → Download backup**, and save the ZIP
file somewhere safe (email it to yourself, save it to cloud storage, etc.).

Do this regularly — weekly is a good habit. The backup contains the full database
including all pantry items, shopping history, and event log.

### Updating the application

If you make changes to the code on your Windows machine and want to deploy them:

**Option A — via GitHub:**
```bash
cd /home/pi/shopping-list
git pull
bun install
bun run build
sudo systemctl restart shopping-list
```

**Option B — copy files manually:**
```bash
# On your Windows machine:
scp -r C:/Users/micha/claudeProject/ShoppingList/src pi@shopping.local:/home/pi/shopping-list/
scp -r C:/Users/micha/claudeProject/ShoppingList/lib pi@shopping.local:/home/pi/shopping-list/
scp C:/Users/micha/claudeProject/ShoppingList/server.ts pi@shopping.local:/home/pi/shopping-list/

# Then on the Pi:
cd /home/pi/shopping-list
bun install
bun run build
sudo systemctl restart shopping-list
```

### Pi goes offline / power cut

When the Pi comes back on, the shopping-list service starts automatically
(it is enabled in systemd). The Tailscale Funnel also re-establishes automatically.
Family members just need to wait a minute after the Pi boots before the URL works again.

---

## Troubleshooting

**The page does not load on my phone**

1. Check the Pi is powered on and connected to the network.
2. Check the service is running: `sudo systemctl status shopping-list`
3. Check Tailscale Funnel is active: `sudo tailscale funnel status`
4. Try restarting Funnel: `sudo tailscale funnel --bg 3000`

**Login fails / "Unauthorized" errors**

The `BETTER_AUTH_URL` in `.env.local` must exactly match the URL you are using in
your browser (including `https://`). If they do not match, session cookies will be
rejected.

Check it:
```bash
cat /home/pi/shopping-list/.env.local
```

It should read:
```
BETTER_AUTH_URL=https://shopping.tail1a2b3c.ts.net
```

After changing `.env.local`, rebuild and restart:
```bash
bun run build
sudo systemctl restart shopping-list
```

**"Port already in use" error in logs**

Another process is using port 3000. Find and stop it:
```bash
sudo lsof -i :3000
sudo kill <PID>
sudo systemctl restart shopping-list
```

**Pi is slow to respond**

A Raspberry Pi 3B+ is sufficient but not fast. The first page load after a period of
inactivity may take 2–3 seconds as Bun warms up. Subsequent requests are fast.
A Pi 4 or 5 will be noticeably quicker.

**Tailscale Funnel URL has changed**

If you re-run `tailscale funnel` or your tailnet name changes, update `.env.local`
with the new URL, rebuild, and restart the service.

---

## Quick reference

| Task | Command |
|------|---------|
| Check status | `sudo systemctl status shopping-list` |
| Start | `sudo systemctl start shopping-list` |
| Stop | `sudo systemctl stop shopping-list` |
| Restart | `sudo systemctl restart shopping-list` |
| View logs | `sudo journalctl -u shopping-list -f` |
| Check Funnel | `sudo tailscale funnel status` |
| Find Pi hostname | `tailscale status --self` |
| Rebuild frontend | `cd /home/pi/shopping-list && bun run build` |
