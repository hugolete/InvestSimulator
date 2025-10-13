# services/prices.py
from fastapi import HTTPException
from api.db.db import SessionLocal
from api.db.models import Asset
from api.services.binance_ws import get_crypto_price
from api.services.finnhub_ws import get_stock_price


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


def get_price_history(asset, period:str):
    #TODO quand l'historique binance & finnhub seront bons

    return 0
