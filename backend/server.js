const express = require('express');
const cors = require('cors');
const axios = require('axios');
const WebSocket = require('ws');
const cron = require('node-cron');

const app = express();
app.use(cors());
app.use(express.json());

// ─── In-memory store ───────────────────────────────────────────────────────
let angelSession = null;         // { jwtToken, feedToken, refreshToken }
let alerts = [];                 // Array of alert configs
let triggeredAlerts = [];        // History of fired alerts
let wsClients = new Set();       // Connected browser websocket clients

// ─── Angel One SmartAPI Auth ───────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  const { clientId, password, totp } = req.body;
  try {
    const resp = await axios.post(
      'https://apiconnect.angelbroking.com/rest/auth/angelbroking/user/v1/loginByPassword',
      { clientcode: clientId, password, totp },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '127.0.0.1',
          'X-ClientPublicIP': '106.193.147.98',
          'X-MACAddress': '00:00:00:00:00:00',
          'X-PrivateKey': req.headers['x-api-key'] || ''
        }
      }
    );
    if (resp.data.status) {
      angelSession = {
        jwtToken: resp.data.data.jwtToken,
        feedToken: resp.data.data.feedToken,
        refreshToken: resp.data.data.refreshToken,
        apiKey: req.headers['x-api-key']
      };
      res.json({ success: true, message: 'Logged in successfully' });
    } else {
      res.status(401).json({ success: false, message: resp.data.message });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/session', (req, res) => {
  res.json({ loggedIn: !!angelSession });
});

app.post('/api/logout', async (req, res) => {
  if (!angelSession) return res.json({ success: true });
  try {
    await axios.post(
      'https://apiconnect.angelbroking.com/rest/secure/angelbroking/user/v1/logout',
      { clientcode: req.body.clientId },
      { headers: authHeaders() }
    );
  } catch (_) {}
  angelSession = null;
  res.json({ success: true });
});

// ─── Search stocks ──────────────────────────────────────────────────────────
app.get('/api/search', async (req, res) => {
  if (!angelSession) return res.status(401).json({ error: 'Not logged in' });
  const { q } = req.query;
  try {
    const resp = await axios.post(
      'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/searchScrip',
      { exchange: 'NSE', searchscrip: q },
      { headers: authHeaders() }
    );
    res.json(resp.data.data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Get LTP + Volume ──────────────────────────────────────────────────────
app.post('/api/quote', async (req, res) => {
  if (!angelSession) return res.status(401).json({ error: 'Not logged in' });
  const { tokens } = req.body; // [{ exchange, symboltoken }]
  try {
    const resp = await axios.post(
      'https://apiconnect.angelbroking.com/rest/secure/angelbroking/market/v1/quote/',
      { mode: 'FULL', exchangeTokens: groupByExchange(tokens) },
      { headers: authHeaders() }
    );
    res.json(resp.data.data?.fetched || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Alerts CRUD ──────────────────────────────────────────────────────────
app.get('/api/alerts', (req, res) => res.json(alerts));

app.post('/api/alerts', (req, res) => {
  const alert = {
    id: Date.now().toString(),
    ...req.body,        // { symbol, symboltoken, exchange, threshold, condition }
    active: true,
    createdAt: new Date().toISOString()
  };
  alerts.push(alert);
  res.json(alert);
});

app.delete('/api/alerts/:id', (req, res) => {
  alerts = alerts.filter(a => a.id !== req.params.id);
  res.json({ success: true });
});

app.patch('/api/alerts/:id/toggle', (req, res) => {
  const a = alerts.find(a => a.id === req.params.id);
  if (a) a.active = !a.active;
  res.json(a || { error: 'Not found' });
});

app.get('/api/triggered', (req, res) => res.json(triggeredAlerts));

// ─── Volume polling (every 30s during market hours) ──────────────────────
cron.schedule('*/30 * * * * *', async () => {
  if (!angelSession || alerts.length === 0) return;
  const activeAlerts = alerts.filter(a => a.active);
  if (activeAlerts.length === 0) return;

  const tokens = activeAlerts.map(a => ({ exchange: a.exchange, symboltoken: a.symboltoken }));
  try {
    const resp = await axios.post(
      'https://apiconnect.angelbroking.com/rest/secure/angelbroking/market/v1/quote/',
      { mode: 'FULL', exchangeTokens: groupByExchange(tokens) },
      { headers: authHeaders() }
    );
    const quotes = resp.data.data?.fetched || [];

    quotes.forEach(q => {
      const volume = parseInt(q.tradeVolume || q.totTrdVol || 0);
      const matchingAlerts = activeAlerts.filter(a => a.symboltoken === q.symbolToken);
      matchingAlerts.forEach(alert => {
        const crossed =
          alert.condition === 'above' ? volume >= alert.threshold :
          alert.condition === 'below' ? volume <= alert.threshold : false;

        if (crossed) {
          const triggered = {
            id: Date.now().toString(),
            alertId: alert.id,
            symbol: alert.symbol,
            threshold: alert.threshold,
            condition: alert.condition,
            actualVolume: volume,
            triggeredAt: new Date().toISOString()
          };
          triggeredAlerts.unshift(triggered);
          if (triggeredAlerts.length > 100) triggeredAlerts.pop();

          // Broadcast to all WS clients
          broadcast({ type: 'ALERT_TRIGGERED', data: triggered });
          // Auto-deactivate after trigger
          alert.active = false;
        }
      });
    });
  } catch (err) {
    console.error('Poll error:', err.message);
  }
});

// ─── WebSocket server for real-time push ──────────────────────────────────
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });
wss.on('connection', ws => {
  wsClients.add(ws);
  ws.send(JSON.stringify({ type: 'CONNECTED', message: 'Real-time alerts active' }));
  ws.on('close', () => wsClients.delete(ws));
});

function broadcast(msg) {
  const str = JSON.stringify(msg);
  wsClients.forEach(ws => { if (ws.readyState === WebSocket.OPEN) ws.send(str); });
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${angelSession.jwtToken}`,
    'X-UserType': 'USER',
    'X-SourceID': 'WEB',
    'X-ClientLocalIP': '127.0.0.1',
    'X-ClientPublicIP': '106.193.147.98',
    'X-MACAddress': '00:00:00:00:00:00',
    'X-PrivateKey': angelSession.apiKey
  };
}

function groupByExchange(tokens) {
  return tokens.reduce((acc, t) => {
    if (!acc[t.exchange]) acc[t.exchange] = [];
    acc[t.exchange].push(t.symboltoken);
    return acc;
  }, {});
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
