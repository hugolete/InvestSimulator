import asyncio
import json
import os

import requests
import websockets
from api.db.db import SessionLocal
from api.db.models import Asset
from dotenv import load_dotenv

#TODO a tester, d'abord rajouter actions et etf dans la db

load_dotenv()

# Cache global des prix (comme pour Binance)
prices = {}


async def start_finnhub_ws():
    db = SessionLocal()

    # Récupère tous les symboles "stock" et "etf" depuis la DB
    symbols = [a.symbol for a in db.query(Asset).filter(Asset.type.in_(["stock", "etf"])).all()]

    url = f"wss://ws.finnhub.io?token={os.getenv('FINNHUB_TOKEN')}"

    async with websockets.connect(url) as ws:
        for s in symbols:
            await ws.send(json.dumps({"type": "subscribe", "symbol": s}))
            await asyncio.sleep(0.05)  # petite pause pour éviter un flood au démarrage

        print(f"[Finnhub WS] Following {len(symbols)} tickers.")

        # Écoute des messages en continu
        async for message in ws:
            print("[Finnhub WS Message brut]", message)
            data = json.loads(message)
            if "data" in data:
                for d in data["data"]:
                    symbol = d["s"]
                    price = float(d["p"])
                    prices[symbol] = price
                    print(f"{symbol} : {price}")  # Debug


async def restart_finnhub_ws():
    """Relance le WS en cas de déconnexion"""
    while True:
        try:
            await start_finnhub_ws()
        except Exception as e:
            print(f"[Finnhub WS] Erreur : {e}, reconnexion dans 5s...")
            await asyncio.sleep(5)


def run_finnhub_ws():
    loop = asyncio.get_event_loop()
    loop.create_task(restart_finnhub_ws())


def get_stock_price(symbol: str):
    if symbol in prices:
        return prices[symbol]

    token = os.getenv("FINNHUB_TOKEN")
    r = requests.get(f"https://finnhub.io/api/v1/quote?symbol={symbol}&token={token}")

    if r.ok:
        data = r.json()
        return data.get("c")  # dernier prix

    return None
