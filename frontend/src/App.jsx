import { useState, useEffect, useRef, useCallback } from "react";

const API = "http://localhost:3001/api";
const WS_URL = "ws://localhost:3001";

// ─── Utility ──────────────────────────────────────────────────────────────
const fmt = n => Number(n).toLocaleString("en-IN");
const timeAgo = iso => {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

// ─── Icons ────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 18 }) => {
  const icons = {
    bell: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    bellRing: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/><line x1="2" y1="2" x2="22" y2="22" style={{display:"none"}}/><circle cx="19" cy="4" r="3" fill="#f59e0b" stroke="none"/></svg>,
    search: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    trash: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
    plus: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    logout: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    activity: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    check: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
    x: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    pause: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>,
    play: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
    trend: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  };
  return icons[name] || null;
};

// ─── Toast ────────────────────────────────────────────────────────────────
function Toast({ toasts, remove }) {
  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === "error" ? "#ef4444" : t.type === "alert" ? "#f59e0b" : "#10b981",
          color: "#fff", padding: "12px 18px", borderRadius: 10, minWidth: 280,
          display: "flex", alignItems: "center", gap: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          animation: "slideIn 0.3s ease", fontFamily: "'DM Sans', sans-serif", fontWeight: 500
        }}>
          <Icon name={t.type === "alert" ? "bellRing" : t.type === "error" ? "x" : "check"} size={16} />
          <span style={{ flex: 1 }}>{t.message}</span>
          <button onClick={() => remove(t.id)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}>×</button>
        </div>
      ))}
    </div>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [form, setForm] = useState({ apiKey: "", clientId: "", password: "", totp: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setLoading(true); setError("");
    try {
      const resp = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": form.apiKey },
        body: JSON.stringify({ clientId: form.clientId, password: form.password, totp: form.totp })
      });
      const data = await resp.json();
      if (data.success) onLogin(form.clientId);
      else setError(data.message || "Login failed");
    } catch {
      setError("Cannot connect to backend. Make sure server is running on port 3001.");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0e1a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        input:focus { outline: none; border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #0a0e1a; } ::-webkit-scrollbar-thumb { background: #2d3548; border-radius: 3px; }
      `}</style>

      <div style={{ width: 420, animation: "fadeUp 0.5s ease" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 20, marginBottom: 16, boxShadow: "0 0 40px rgba(99,102,241,0.4)" }}>
            <Icon name="activity" size={28} />
          </div>
          <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>VolumeWatch</h1>
          <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>Angel One SmartAPI · Volume Alerts</p>
        </div>

        {/* Card */}
        <div style={{ background: "#111827", border: "1px solid #1e2a3a", borderRadius: 20, padding: 32 }}>
          <h2 style={{ color: "#e2e8f0", fontSize: 18, fontWeight: 600, marginBottom: 24 }}>Connect your account</h2>

          {["apiKey", "clientId", "password", "totp"].map(field => (
            <div key={field} style={{ marginBottom: 16 }}>
              <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                {field === "apiKey" ? "API Key" : field === "clientId" ? "Client ID" : field === "totp" ? "TOTP (Google Auth)" : "Password"}
              </label>
              <input
                type={field === "password" ? "password" : "text"}
                value={form[field]}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                placeholder={field === "apiKey" ? "Your SmartAPI key" : field === "totp" ? "6-digit code" : ""}
                style={{ width: "100%", background: "#0a0e1a", border: "1px solid #1e2a3a", borderRadius: 10, padding: "11px 14px", color: "#e2e8f0", fontSize: 14, fontFamily: "'DM Mono', monospace", transition: "all 0.2s" }}
              />
            </div>
          ))}

          {error && <div style={{ background: "#1c0a0a", border: "1px solid #ef4444", borderRadius: 8, padding: "10px 14px", color: "#ef4444", fontSize: 13, marginBottom: 16 }}>{error}</div>}

          <button onClick={handleSubmit} disabled={loading} style={{ width: "100%", background: loading ? "#2d3548" : "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 10, padding: "13px", color: "#fff", fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s", boxShadow: loading ? "none" : "0 4px 20px rgba(99,102,241,0.35)" }}>
            {loading ? "Connecting..." : "Connect to SmartAPI"}
          </button>

          <p style={{ color: "#475569", fontSize: 12, textAlign: "center", marginTop: 16, lineHeight: 1.6 }}>
            Get your API key from <span style={{ color: "#6366f1" }}>smartapi.angelbroking.com</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────
export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [clientId, setClientId] = useState("");
  const [alerts, setAlerts] = useState([]);
  const [triggered, setTriggered] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [tab, setTab] = useState("alerts");
  const [wsConnected, setWsConnected] = useState(false);

  // Add alert form
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [threshold, setThreshold] = useState("");
  const [condition, setCondition] = useState("above");
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);

  const wsRef = useRef(null);
  const searchTimer = useRef(null);

  const addToast = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 5000);
  }, []);

  // WebSocket
  useEffect(() => {
    if (!loggedIn) return;
    const connect = () => {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => { setWsConnected(false); setTimeout(connect, 3000); };
      ws.onmessage = e => {
        const msg = JSON.parse(e.data);
        if (msg.type === "ALERT_TRIGGERED") {
          const d = msg.data;
          addToast(`🔔 ${d.symbol} — Volume ${d.condition} ${fmt(d.threshold)} (actual: ${fmt(d.actualVolume)})`, "alert");
          setTriggered(t => [d, ...t]);
          setAlerts(prev => prev.map(a => a.id === d.alertId ? { ...a, active: false } : a));
          // Browser notification
          if (Notification.permission === "granted") {
            new Notification(`VolumeWatch: ${d.symbol}`, { body: `Volume crossed ${fmt(d.threshold)} — actual: ${fmt(d.actualVolume)}` });
          }
        }
      };
    };
    connect();
    Notification.requestPermission();
    return () => wsRef.current?.close();
  }, [loggedIn, addToast]);

  // Load alerts & triggered
  useEffect(() => {
    if (!loggedIn) return;
    fetch(`${API}/alerts`).then(r => r.json()).then(setAlerts).catch(() => {});
    fetch(`${API}/triggered`).then(r => r.json()).then(setTriggered).catch(() => {});
  }, [loggedIn]);

  // Stock search with debounce
  useEffect(() => {
    if (!searchQ || searchQ.length < 2) { setSearchResults([]); return; }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(`${API}/search?q=${encodeURIComponent(searchQ)}`);
        const data = await r.json();
        setSearchResults(Array.isArray(data) ? data.slice(0, 8) : []);
      } catch { setSearchResults([]); }
      setSearching(false);
    }, 400);
  }, [searchQ]);

  const handleAddAlert = async () => {
    if (!selectedStock || !threshold) return;
    setAdding(true);
    try {
      const r = await fetch(`${API}/alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: selectedStock.tradingsymbol,
          symboltoken: selectedStock.symboltoken,
          exchange: selectedStock.exch_seg || "NSE",
          threshold: Number(threshold),
          condition
        })
      });
      const alert = await r.json();
      setAlerts(prev => [...prev, alert]);
      setSelectedStock(null); setSearchQ(""); setThreshold(""); setSearchResults([]);
      addToast(`Alert set for ${alert.symbol}`, "success");
    } catch (e) { addToast(e.message, "error"); }
    setAdding(false);
  };

  const deleteAlert = async id => {
    await fetch(`${API}/alerts/${id}`, { method: "DELETE" });
    setAlerts(prev => prev.filter(a => a.id !== id));
    addToast("Alert removed", "success");
  };

  const toggleAlert = async id => {
    const r = await fetch(`${API}/alerts/${id}/toggle`, { method: "PATCH" });
    const updated = await r.json();
    setAlerts(prev => prev.map(a => a.id === id ? updated : a));
  };

  const handleLogout = async () => {
    await fetch(`${API}/logout`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId }) });
    setLoggedIn(false);
  };

  if (!loggedIn) return <LoginScreen onLogin={id => { setClientId(id); setLoggedIn(true); }} />;

  const s = {
    app: { minHeight: "100vh", background: "#0a0e1a", fontFamily: "'DM Sans', sans-serif", color: "#e2e8f0" },
    sidebar: { width: 240, background: "#0d1117", borderRight: "1px solid #1e2a3a", padding: "28px 16px", display: "flex", flexDirection: "column", gap: 4, position: "fixed", top: 0, left: 0, bottom: 0 },
    main: { marginLeft: 240, padding: 32, minHeight: "100vh" },
    navBtn: active => ({ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, border: "none", cursor: "pointer", width: "100%", textAlign: "left", fontSize: 14, fontWeight: active ? 600 : 400, fontFamily: "'DM Sans', sans-serif", background: active ? "rgba(99,102,241,0.15)" : "transparent", color: active ? "#818cf8" : "#64748b", transition: "all 0.15s" }),
    card: { background: "#111827", border: "1px solid #1e2a3a", borderRadius: 16, padding: 24, marginBottom: 20 },
    input: { background: "#0a0e1a", border: "1px solid #1e2a3a", borderRadius: 10, padding: "10px 14px", color: "#e2e8f0", fontSize: 14, fontFamily: "'DM Mono', monospace", transition: "all 0.2s", width: "100%" },
    badge: color => ({ background: `${color}20`, color, padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600 }),
    btn: (color, outline) => ({ background: outline ? "transparent" : color, border: `1px solid ${color}`, borderRadius: 8, padding: "7px 14px", color: outline ? color : "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, transition: "all 0.15s", fontFamily: "'DM Sans', sans-serif" }),
  };

  return (
    <div style={s.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ping { 0% { transform: scale(1); opacity: 1; } 75%,100% { transform: scale(2); opacity: 0; } }
        input:focus { outline: none; border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
        select:focus { outline: none; }
        button:hover { opacity: 0.85; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #0a0e1a; } ::-webkit-scrollbar-thumb { background: #2d3548; border-radius: 3px; }
      `}</style>

      <Toast toasts={toasts} remove={id => setToasts(t => t.filter(x => x.id !== id))} />

      {/* Sidebar */}
      <div style={s.sidebar}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 6px", marginBottom: 28 }}>
          <div style={{ width: 36, height: 36, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(99,102,241,0.4)" }}>
            <Icon name="activity" size={18} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0" }}>VolumeWatch</div>
            <div style={{ fontSize: 11, color: "#475569" }}>{clientId}</div>
          </div>
        </div>

        {[
          { id: "alerts", label: "My Alerts", icon: "bell" },
          { id: "add", label: "Add Alert", icon: "plus" },
          { id: "history", label: "Triggered", icon: "trend" },
        ].map(item => (
          <button key={item.id} style={s.navBtn(tab === item.id)} onClick={() => setTab(item.id)}>
            <Icon name={item.icon} size={16} />
            {item.label}
            {item.id === "alerts" && alerts.filter(a => a.active).length > 0 && (
              <span style={{ marginLeft: "auto", background: "#6366f1", color: "#fff", fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 20 }}>{alerts.filter(a => a.active).length}</span>
            )}
            {item.id === "history" && triggered.length > 0 && (
              <span style={{ marginLeft: "auto", background: "#f59e0b", color: "#fff", fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 20 }}>{triggered.length}</span>
            )}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {/* WS status */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#0a0e1a", borderRadius: 10, marginBottom: 8 }}>
          <div style={{ position: "relative", width: 8, height: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: wsConnected ? "#10b981" : "#ef4444" }} />
            {wsConnected && <div style={{ position: "absolute", top: 0, left: 0, width: 8, height: 8, borderRadius: "50%", background: "#10b981", animation: "ping 1.5s infinite" }} />}
          </div>
          <span style={{ fontSize: 12, color: wsConnected ? "#10b981" : "#ef4444", fontWeight: 500 }}>
            {wsConnected ? "Live" : "Disconnected"}
          </span>
        </div>

        <button onClick={handleLogout} style={{ ...s.btn("#475569", true), width: "100%", justifyContent: "center" }}>
          <Icon name="logout" size={14} /> Logout
        </button>
      </div>

      {/* Main */}
      <div style={s.main}>

        {/* ── ALERTS TAB ── */}
        {tab === "alerts" && (
          <div style={{ animation: "fadeUp 0.3s ease" }}>
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: "#f1f5f9" }}>My Alerts</h1>
              <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>Volume threshold alerts — polled every 30 seconds</p>
            </div>

            {alerts.length === 0 ? (
              <div style={{ ...s.card, textAlign: "center", padding: "60px 24px" }}>
                <Icon name="bell" size={40} />
                <p style={{ color: "#475569", marginTop: 12, fontSize: 15 }}>No alerts yet. Add one to get started.</p>
                <button style={{ ...s.btn("linear-gradient(135deg,#6366f1,#8b5cf6)", false), marginTop: 16 }} onClick={() => setTab("add")}>
                  <Icon name="plus" size={14} /> Add Alert
                </button>
              </div>
            ) : (
              <div>
                {alerts.map(alert => (
                  <div key={alert.id} style={{ ...s.card, display: "flex", alignItems: "center", gap: 16, opacity: alert.active ? 1 : 0.5, transition: "opacity 0.2s" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: alert.active ? "rgba(99,102,241,0.15)" : "rgba(100,116,139,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon name="bell" size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", fontFamily: "'DM Mono', monospace" }}>{alert.symbol}</span>
                        <span style={s.badge(alert.condition === "above" ? "#10b981" : "#f59e0b")}>{alert.condition === "above" ? "↑ ABOVE" : "↓ BELOW"}</span>
                        <span style={s.badge(alert.active ? "#6366f1" : "#475569")}>{alert.active ? "ACTIVE" : "INACTIVE"}</span>
                      </div>
                      <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
                        Volume threshold: <span style={{ color: "#e2e8f0", fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{fmt(alert.threshold)}</span>
                        <span style={{ marginLeft: 12 }}>Exchange: {alert.exchange}</span>
                        <span style={{ marginLeft: 12 }}>Set: {timeAgo(alert.createdAt)}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button style={s.btn(alert.active ? "#f59e0b" : "#10b981", true)} onClick={() => toggleAlert(alert.id)}>
                        <Icon name={alert.active ? "pause" : "play"} size={13} />
                        {alert.active ? "Pause" : "Resume"}
                      </button>
                      <button style={s.btn("#ef4444", true)} onClick={() => deleteAlert(alert.id)}>
                        <Icon name="trash" size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ADD ALERT TAB ── */}
        {tab === "add" && (
          <div style={{ animation: "fadeUp 0.3s ease", maxWidth: 600 }}>
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: "#f1f5f9" }}>Add Volume Alert</h1>
              <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>Search for an NSE stock and set a volume threshold</p>
            </div>

            <div style={s.card}>
              {/* Step 1: Search */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                  Step 1 · Search Stock
                </label>
                <div style={{ position: "relative" }}>
                  <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#475569" }}>
                    <Icon name="search" size={16} />
                  </div>
                  <input
                    style={{ ...s.input, paddingLeft: 38 }}
                    placeholder="Type symbol or company name (e.g. RELIANCE)"
                    value={selectedStock ? selectedStock.tradingsymbol : searchQ}
                    onChange={e => { setSearchQ(e.target.value); setSelectedStock(null); }}
                  />
                  {selectedStock && (
                    <button onClick={() => { setSelectedStock(null); setSearchQ(""); }} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 18 }}>×</button>
                  )}
                </div>

                {/* Search results dropdown */}
                {searchResults.length > 0 && !selectedStock && (
                  <div style={{ background: "#0d1117", border: "1px solid #1e2a3a", borderRadius: 10, marginTop: 4, overflow: "hidden" }}>
                    {searching && <div style={{ padding: "10px 14px", color: "#475569", fontSize: 13 }}>Searching...</div>}
                    {searchResults.map(r => (
                      <div key={r.symboltoken} onClick={() => { setSelectedStock(r); setSearchResults([]); }}
                        style={{ padding: "10px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", borderBottom: "1px solid #1e2a3a", transition: "background 0.1s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#111827"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <span style={{ color: "#f1f5f9", fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>{r.tradingsymbol}</span>
                        <span style={{ color: "#475569", fontSize: 12 }}>{r.exch_seg} · {r.instrumenttype}</span>
                      </div>
                    ))}
                  </div>
                )}

                {selectedStock && (
                  <div style={{ marginTop: 8, padding: "10px 14px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 10, display: "flex", alignItems: "center", gap: 8 }}>
                    <Icon name="check" size={14} />
                    <span style={{ color: "#818cf8", fontWeight: 600 }}>{selectedStock.tradingsymbol}</span>
                    <span style={{ color: "#475569", fontSize: 12 }}>— {selectedStock.exch_seg} · Token {selectedStock.symboltoken}</span>
                  </div>
                )}
              </div>

              {/* Step 2: Threshold */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                  Step 2 · Volume Threshold
                </label>
                <div style={{ display: "flex", gap: 10 }}>
                  <select value={condition} onChange={e => setCondition(e.target.value)}
                    style={{ ...s.input, width: 160, cursor: "pointer", appearance: "none" }}>
                    <option value="above">↑ Crosses Above</option>
                    <option value="below">↓ Drops Below</option>
                  </select>
                  <input type="number" style={s.input} placeholder="e.g. 5000000" value={threshold} onChange={e => setThreshold(e.target.value)} />
                </div>
                {threshold && <p style={{ color: "#475569", fontSize: 12, marginTop: 6 }}>= {fmt(threshold)} shares</p>}
              </div>

              {/* Quick presets */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                  Quick Presets
                </label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[500000, 1000000, 2000000, 5000000, 10000000].map(v => (
                    <button key={v} onClick={() => setThreshold(v.toString())} style={{ background: threshold == v ? "rgba(99,102,241,0.2)" : "#0a0e1a", border: `1px solid ${threshold == v ? "#6366f1" : "#1e2a3a"}`, borderRadius: 8, padding: "6px 12px", color: threshold == v ? "#818cf8" : "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>
                      {v >= 1000000 ? `${v / 1000000}M` : `${v / 1000}K`}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleAddAlert}
                disabled={!selectedStock || !threshold || adding}
                style={{ background: (!selectedStock || !threshold) ? "#1e2a3a" : "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 10, padding: "13px 24px", color: (!selectedStock || !threshold) ? "#475569" : "#fff", fontSize: 15, fontWeight: 600, cursor: (!selectedStock || !threshold) ? "not-allowed" : "pointer", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: (!selectedStock || !threshold) ? "none" : "0 4px 20px rgba(99,102,241,0.35)", fontFamily: "'DM Sans', sans-serif" }}>
                <Icon name="bell" size={16} />
                {adding ? "Creating alert..." : "Create Alert"}
              </button>
            </div>
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === "history" && (
          <div style={{ animation: "fadeUp 0.3s ease" }}>
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: "#f1f5f9" }}>Triggered Alerts</h1>
              <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>All volume thresholds that have been crossed</p>
            </div>

            {triggered.length === 0 ? (
              <div style={{ ...s.card, textAlign: "center", padding: "60px 24px" }}>
                <Icon name="trend" size={40} />
                <p style={{ color: "#475569", marginTop: 12, fontSize: 15 }}>No alerts triggered yet.</p>
              </div>
            ) : triggered.map(t => (
              <div key={t.id} style={{ ...s.card, display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(245,158,11,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon name="bellRing" size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", fontFamily: "'DM Mono', monospace" }}>{t.symbol}</span>
                    <span style={s.badge(t.condition === "above" ? "#10b981" : "#f59e0b")}>{t.condition === "above" ? "↑ ABOVE" : "↓ BELOW"}</span>
                  </div>
                  <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
                    Threshold: <span style={{ color: "#f59e0b", fontFamily: "'DM Mono', monospace" }}>{fmt(t.threshold)}</span>
                    {" · "}Actual: <span style={{ color: "#10b981", fontFamily: "'DM Mono', monospace" }}>{fmt(t.actualVolume)}</span>
                    {" · "}At: <span style={{ color: "#94a3b8" }}>{timeAgo(t.triggeredAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
