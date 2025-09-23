# services/prices.py
from api.db.db import SessionLocal
from api.db.models import Asset
from api.services.binance_ws import get_crypto_price

def get_prix(asset_id:int):
    db = SessionLocal()

    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    price = 0.0

    if asset.type == "crypto":
        new_symbol = asset.symbol + "USDT"  # rajout du USDT pour la rech binance
        price = get_crypto_price(new_symbol.upper())  # prix live via Binance
    else:
        # price = get_price_other(symbol.upper())  # placeholder pour actions/ETF/bonds
        price = 1.0

    return price
