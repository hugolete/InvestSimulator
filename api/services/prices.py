# services/prices.py
from api.db.db import SessionLocal
from api.db.models import Asset
from api.services.binance_ws import get_crypto_price, get_binance_history
from api.services.finnhub_ws import get_stock_price, get_stock_history


def get_prix(asset_id:int):
    with SessionLocal() as db:
        asset = db.query(Asset).filter(Asset.id == asset_id).first()
        price = 0.0

        if asset.type == "crypto":
            new_symbol = asset.symbol + "USDT"  # rajout du USDT pour la rech binance
            price = get_crypto_price(new_symbol.upper())  # prix live via Binance
        elif asset.type == "stock" or asset.type == "etf" or asset.type == "commodity":
            price = get_stock_price(asset.symbol.upper()) # Actions et ETF
        elif asset.type == "currency":
            price = 1.0  # USD/EUR treated as 1:1 for portfolio valuation
        else:
            raise Exception("Type d'asset invalide")

        return price


def get_price_history(asset, period:str, full_history:bool=False):
    # renvoie un tuple quand full history = true, un élément unique si full history = false
    symbol = asset.symbol
    asset_id = asset.id

    if asset.type == "crypto":
        if full_history:
            candles = get_binance_history(symbol, period,full_history=True)
            return candles, get_prix(asset_id)
        else:
            candles = get_binance_history(symbol, period)
            return candles[0]["open"]
    elif asset.type == "stock" or asset.type == "etf":
        if full_history:
            return get_stock_history(symbol,period,full_history=True) # 2 variables : dataframe et dernier prix
        else:
            return get_stock_history(symbol,period) # juste le prix X temps dans le passé
    else:
        return 0


def calculate_percentage(symbol: str, period: str, db):
    asset = db.query(Asset).filter(Asset.symbol == symbol).first()
    if not asset:
        return 0.0
    try:
        before = get_price_history(asset, period)
        now = get_prix(asset.id)

        if now is None or before is None:
            return 0.0

        b_val = float(before)
        if b_val == 0:
            return 0.0

        percentage = ((now - b_val) / b_val) * 100

        import math
        if math.isnan(percentage) or math.isinf(percentage):
            return 0.0

        return round(percentage, 2)
    except Exception:
        return 0.0
