import math
import yfinance as yf
import pandas as pd
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


def calculate_percentage_bulk(db):
    assets = db.query(Asset).all()
    results = []

    crypto_assets = [a for a in assets if a.type == "crypto"]
    stock_assets = [a for a in assets if a.type in ["stock", "etf"]]
    other_assets = [a for a in assets if a.type not in ["crypto", "stock", "etf"]]

    # --- CRYPTO : calcul individuel via Binance ---
    for asset in crypto_assets:
        try:
            before = get_price_history(asset, "1d")
            now = get_prix(asset.id)
            if not before or not now or float(before) == 0:
                results.append({"symbol": asset.symbol, "percentage": 0.0})
                continue
            pct = ((now - float(before)) / float(before)) * 100
            results.append({"symbol": asset.symbol, "percentage": round(pct, 2) if not math.isnan(pct) else 0.0})
        except:
            results.append({"symbol": asset.symbol, "percentage": 0.0})

    # --- STOCKS/ETF : un seul download pour tous ---
    if stock_assets:
        symbols = [a.symbol for a in stock_assets]
        try:
            df_daily = yf.download(
                " ".join(symbols),
                period="5d",
                interval="1d",
                group_by="ticker",
                threads=True,
                progress=False
            )

            if isinstance(df_daily.columns, pd.MultiIndex):
                pass  # garder le multi-index pour accès par ticker

            for asset in stock_assets:
                try:
                    if len(symbols) == 1:
                        close_series = df_daily['Close']
                    else:
                        close_series = df_daily[asset.symbol]['Close']

                    close_series = close_series.dropna()

                    if len(close_series) < 2:
                        results.append({"symbol": asset.symbol, "percentage": 0.0})
                        continue

                    before = float(close_series.iloc[-2])
                    now = get_prix(asset.id)  # depuis le cache

                    if not before or not now or before == 0:
                        results.append({"symbol": asset.symbol, "percentage": 0.0})
                        continue

                    pct = ((now - before) / before) * 100

                    if math.isnan(pct) or math.isinf(pct):
                        results.append({"symbol": asset.symbol, "percentage": 0.0})
                    else:
                        results.append({"symbol": asset.symbol, "percentage": round(pct, 2)})
                except:
                    results.append({"symbol": asset.symbol, "percentage": 0.0})

        except Exception as e:
            print(f"Erreur bulk download: {e}")
            for asset in stock_assets:
                results.append({"symbol": asset.symbol, "percentage": 0.0})

    for asset in other_assets:
        results.append({"symbol": asset.symbol, "percentage": 0.0})

    return results
