import asyncio
from datetime import datetime, timezone
from binance import AsyncClient, BinanceSocketManager
from api.db.db import SessionLocal
from api.db.models import Asset
import requests
import pandas as pd


prices = {}


async def start_binance_ws():
    db = SessionLocal()
    client = await AsyncClient.create()
    bm = BinanceSocketManager(client)

    """ts = bm.symbol_ticker_socket("BTCUSDT")  # pour un seul symbole
    # ts = bm.ticker_socket()  # pour tous"""
    # Récupérer tous les symboles crypto depuis la DB
    symbols = [a.symbol for a in db.query(Asset).filter(Asset.type == "crypto").all()]

    tasks = []
    for s in symbols:
        s += "USDT"
        ts = bm.symbol_ticker_socket(s)
        tasks.append(run_socket(ts))

    await asyncio.gather(*tasks)
    await client.close_connection()


async def run_socket(ts):
    async with ts as tscm:
        while True:
            res = await tscm.recv()
            symbol = res['s']
            price = float(res['c'])
            prices[symbol] = price
            # print(symbol, price) # pour debug


# Fonction helper pour récupérer le prix en mémoire
def get_crypto_price(symbol: str):
    return prices.get(symbol, None)


# Pour lancer le WS
def run_ws():
    loop = asyncio.get_event_loop()
    loop.create_task(start_binance_ws())


def get_binance_history(symbol:str,period:str,full_history:bool=False):
    # exemple period : "1h"
    new_symbol = symbol+"USDT"
    original_period = period
    new_period = "1d"
    limit = 1

    # API binance ne permet pas d'aller au dela de la semaine
    if period == "1h":
        limit = 60
        period = "1m"
    elif period == "12h":
        limit = 12
        period = "1h"
    elif period == "1d":
        limit = 24
        period = "1h"
    elif period == "1w":
        limit = 7
        period = new_period
    elif period == "1m":
        limit = 31
        period = new_period
    elif period == "6m":
        limit = 183
        period = new_period
    elif period == "1y":
        limit = 365
        period = new_period
    elif period == "5y":
        limit = 1826
        period = new_period

    url = "https://api.binance.com/api/v3/klines"
    params = {"symbol": new_symbol.upper(), "interval": period, "limit": limit}
    response = requests.get(url, params=params)
    data = response.json()

    # Chaque entrée contient : [Open time, Open, High, Low, Close, Volume, ...]
    candles = [
        {
            "timestamp": c[0],
            "open": float(c[1]),
            "high": float(c[2]),
            "low": float(c[3]),
            "close": float(c[4]),
            "volume": float(c[5]),
        }
        for c in data
    ]

    if full_history and original_period in ["6m", "1y", "5y"]:
        # trie mois par mois pour ne pas créer des centaines de bougies
        candles_filtered = filter_candles(candles)

        return candles_filtered
    else:
        return candles


def filter_candles(candles):
    """
    Garde dans l'historique uniquement les candles correspondant au jour du mois de la date actuelle
    """
    now = datetime.now(timezone.utc)
    target_day = now.day
    filtered = []
    last_candle = None

    # Parcourir toutes les candles
    for candle in candles:
        dt = datetime.fromtimestamp(candle["timestamp"] / 1000, tz=timezone.utc)
        candle["datetime"] = dt  # on ajoute pour faciliter

        # On garde la dernière candle à la fin
        if (last_candle is None) or (candle["timestamp"] > last_candle["timestamp"]):
            last_candle = candle

    # Pour garder une seule candle par mois correspondant au target_day,
    # on va stocker le (year, month) déjà pris
    seen_months = set()

    for candle in candles:
        dt = candle["datetime"]
        if dt.day == target_day:
            ym = (dt.year, dt.month)
            if ym not in seen_months:
                filtered.append(candle)
                seen_months.add(ym)

    # S'assurer que la dernière candle est incluse
    if last_candle not in filtered:
        filtered.append(last_candle)

    # Supprimer la clé temporaire datetime avant de retourner
    for c in filtered:
        c.pop("datetime", None)

    # Trier par timestamp croissant
    filtered.sort(key=lambda c: c["timestamp"])

    return filtered
