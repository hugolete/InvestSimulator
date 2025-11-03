# services/prices.py
from api.db.db import SessionLocal
from api.db.models import Asset
from api.services.binance_ws import get_crypto_price, get_binance_history
from api.services.finnhub_ws import get_stock_price, get_stock_history
import yfinance as yf


def get_prix(asset_id:int):
    db = SessionLocal()

    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    price = 0.0

    if asset.type == "crypto":
        new_symbol = asset.symbol + "USDT"  # rajout du USDT pour la rech binance
        price = get_crypto_price(new_symbol.upper())  # prix live via Binance
    elif asset.type == "stock" or asset.type == "etf":
        price = get_stock_price(asset.symbol.upper()) # Actions et ETF
    else:
        # placeholder pour bonds
        price = 1.0

    return price


def get_price_history(asset, period:str, full_history:bool=False):
    symbol = asset.symbol

    if asset.type == "crypto":
        if full_history:
            pass
        else:
            candles = get_binance_history(symbol, period)

            return candles[0]["open"]
    elif asset.type == "stock" or asset.type == "etf":
        if full_history:
            return get_stock_history(symbol,period,full_history=True)
        else:
            return get_stock_history(symbol,period)
    else:
        # placeholder pour bonds
        return 0

