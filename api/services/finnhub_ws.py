import asyncio
import json
import os
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta, timezone
import requests
import websockets
from fastapi import HTTPException
from api.db.db import SessionLocal
from api.db.models import Asset
from dotenv import load_dotenv

#TODO rajouter autres actions et etf dans la db
#TODO etfs

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
            data = json.loads(message)
            if "data" in data:
                for d in data["data"]:
                    symbol = d["s"]
                    price = float(d["p"])
                    prices[symbol] = price


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


def get_stock_history(symbol:str,period:str,full_history:bool=False):
    # Paramètres compatibles avec Yahoo
    settings = {
        "1h": ("1m", "7d"),
        "12h": ("5m", "60d"),
        "1d": ("15m", "60d"),
        "1w": ("1h", "1y"),
        "1m": ("1d", "1y"),
        "6m": ("1d", "2y"),
        "1y": ("1wk", "5y"),
        "5y": ("1mo", "10y"),
    }

    # calcul diff entre maintenant et il y a X temps
    deltas = {
        "1h": timedelta(hours=1),
        "12h": timedelta(hours=12),
        "1d": timedelta(days=1),
        "1w": timedelta(weeks=1),
        "1m": timedelta(days=30),
        "6m": timedelta(days=182),
        "1y": timedelta(days=365),
        "5y": timedelta(days=365 * 5)
    }

    interval, yf_period = settings[period]
    now = datetime.now(timezone.utc)
    target_time = now - deltas[period]

    df = yf.download(symbol, period=yf_period, interval=interval, progress=False)

    if df.empty:
        raise HTTPException(status_code=404, detail="Aucune donnée trouvée")
    else:
        df.index = pd.to_datetime(df.index, utc=True)

        if isinstance(df.columns, pd.MultiIndex):
            df.columns = [col[0] for col in df.columns]

        if full_history:
            # retient que la période mentionnée pour le full (voir dict settings)
            df_filtered = df[df.index >= target_time]
            latest_price = get_stock_price(symbol)

            return df_filtered, latest_price

        closest_idx = df.index.get_indexer([target_time], method="nearest")[0]

        past_price = float(df.iloc[closest_idx]["Close"])
        print(f"Il y a {period} : {round(past_price, 2)} USD")

    return past_price
