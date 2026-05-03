from SmartApi import SmartConnect
from SmartApi.smartWebSocketV2 import SmartWebSocketV2
import pyotp
import asyncio

class SmartAPIClient:

    def __init__(self, api_key, client_id, pin, totp_secret):
        self.api_key = api_key
        self.client_id = client_id
        self.pin = pin
        self.totp_secret = totp_secret

        self.obj = None
        self.sws = None
        self.connected = False

        self.watchlist = {}
        self.clients = []

    def login(self):
        try:
            self.obj = SmartConnect(api_key=self.api_key)
            totp = pyotp.TOTP(self.totp_secret).now()

            data = self.obj.generateSession(self.client_id, self.pin, totp)

            if not data['status']:
                print("❌ Login failed")
                return False

            self.jwt = data['data']['jwtToken']
            self.feed_token = self.obj.getfeedToken()

            print("✅ Login success")
            return True

        except Exception as e:
            print("❌ Login error:", e)
            return False

    def start_ws(self):
        try:
            self.sws = SmartWebSocketV2(
                self.jwt, self.api_key, self.client_id, self.feed_token
            )

            self.sws.on_open = self.on_open
            self.sws.on_data = self.on_data
            self.sws.on_error = self.on_error
            self.sws.on_close = self.on_close

            self.sws.connect()

        except Exception as e:
            print("❌ WebSocket error:", e)

    def on_open(self, ws):
        print("✅ WebSocket connected")
        self.connected = True
        self.resubscribe()

    def resubscribe(self):
        tokens = [v["token"] for v in self.watchlist.values()]

        if tokens:
            self.sws.subscribe([{
                "exchangeType": 1,
                "tokens": tokens
            }])

    def on_data(self, ws, message):
        token = message.get("token")
        volume = message.get("volume", 0)

        for symbol, data in self.watchlist.items():
            if data["token"] == token:

                if volume >= data["threshold"]:
                    data["alerted"] = True

                asyncio.run(self.broadcast({
                    "symbol": symbol,
                    "volume": volume,
                    "threshold": data["threshold"],
                    "alerted": data["alerted"]
                }))

    def on_error(self, ws, error):
        print("❌ WS error:", error)
        self.connected = False

    def on_close(self, ws):
        print("❌ WS closed")
        self.connected = False

    async def broadcast(self, data):
        for client in self.clients:
            await client.send_json(data)

    def add_stock(self, symbol, token, threshold):
        self.watchlist[symbol] = {
            "token": token,
            "threshold": int(threshold),
            "alerted": False
        }
        self.resubscribe()