# VolumeWatch — Angel One SmartAPI Volume Alert System

A full-stack app to monitor NSE stocks and get alerted when volume crosses your threshold.

---

## Project Structure

```
volumewatch/
├── backend/
│   ├── server.js        ← Express + WebSocket server
│   └── package.json
└── frontend/
    └── src/
        └── App.jsx      ← React dashboard (use with Vite or CRA)
```

---

## Prerequisites

- Node.js 18+
- Angel One SmartAPI account → https://smartapi.angelbroking.com
- API key from your SmartAPI app
- TOTP authenticator (Google Authenticator linked to your Angel account)

---

## Backend Setup

```bash
cd backend
npm install
node server.js
# Server starts on http://localhost:3001
```

### Dependencies installed:
- `express` — HTTP server
- `cors` — Cross-origin requests
- `axios` — Angel One API calls
- `ws` — WebSocket for real-time push
- `node-cron` — Poll volume every 30 seconds

---

## Frontend Setup (Vite recommended)

```bash
npm create vite@latest frontend -- --template react
cd frontend
# Replace src/App.jsx with the provided App.jsx
npm install
npm run dev
# Opens on http://localhost:5173
```

---

## How It Works

1. **Login** — Enter your SmartAPI key, Angel One client ID, password, and TOTP
2. **Add Alert** — Search for any NSE stock, set volume threshold + condition (above/below)
3. **Monitor** — Backend polls volume every 30 seconds via SmartAPI quote API
4. **Alert** — When threshold is crossed:
   - Toast notification in the UI
   - Browser push notification
   - WebSocket real-time update
   - Alert auto-deactivates (to avoid repeated firing)
5. **History** — View all triggered alerts in the "Triggered" tab

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/login | Authenticate with SmartAPI |
| GET | /api/session | Check login status |
| POST | /api/logout | Logout |
| GET | /api/search?q= | Search NSE stocks |
| POST | /api/quote | Get live volume/LTP |
| GET | /api/alerts | List all alerts |
| POST | /api/alerts | Create alert |
| DELETE | /api/alerts/:id | Delete alert |
| PATCH | /api/alerts/:id/toggle | Pause/resume alert |
| GET | /api/triggered | Alert history |

---

## Notes

- Volume polling is every **30 seconds** — adjust the cron in server.js if needed
- Alerts auto-deactivate after triggering (re-enable manually)
- Supports NSE stocks; change `exchange` to `BSE` for BSE stocks
- For production: add a database (SQLite/PostgreSQL) to persist alerts across restarts
- TOTP is required by Angel One — use Google Authenticator linked to your account
