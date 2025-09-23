import asyncio
from binance import AsyncClient, BinanceSocketManager
from api.db.db import SessionLocal
from api.db.models import Asset

prices = {}
#symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "LTCUSDT"]

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
