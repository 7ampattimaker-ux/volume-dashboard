from fastapi import FastAPI, WebSocket, Request
from smartapi_client import SmartAPIClient
import json

app = FastAPI()

# ===== CONFIG =====
client = SmartAPIClient(
    api_key="YOUR_API_KEY",
    client_id="YOUR_CLIENT_ID",
    pin="YOUR_PIN",
    totp_secret="YOUR_TOTP_SECRET"
)

# ===== LOAD INSTRUMENTS =====
with open("backend/instruments.json") as f:
    instruments = json.load(f)

stocks = [
    {"symbol": i["symbol"], "token": i["token"]}
    for i in instruments
    if i["exch_seg"] == "NSE" and i["instrumenttype"] == "EQ"
]

# ===== START SYSTEM =====
if not client.login():
    print("❌ STOPPING SYSTEM (Login failed)")
    exit()

client.start_ws()

# ===== API =====

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    client.clients.append(ws)

    try:
        while True:
            await ws.receive_text()
    except:
        client.clients.remove(ws)


@app.get("/search")
def search(q: str):
    return [s for s in stocks if q.lower() in s["symbol"].lower()][:10]


@app.post("/add-stock")
async def add_stock(req: Request):
    data = await req.json()

    client.add_stock(
        data["symbol"],
        data["token"],
        data["threshold"]
    )

    return {"status": "added"}