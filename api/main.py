from datetime import datetime, timezone
import uvicorn
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from api.db.models import Asset, Base, User, Trade
from api.db.db import get_db, engine
from api.services import profiles
from api.services.binance_ws import run_ws
from api.services.finnhub_ws import run_finnhub_ws
from api.services.trade import buy_asset, sell_asset, convert_currencies
from api.services.prices import get_prix, get_price_history

Base.metadata.create_all(bind=engine)
app = FastAPI()


@app.on_event("startup")
def startup_event():
    run_ws()
    run_finnhub_ws()


@app.get("/")
def home():
    return {
        "message": "Bienvenue sur le Invest Simulator API !",
        "timestamp": datetime.now(timezone.utc)
    }


# récup prix d'une crypto
@app.get("/assets/{symbol}")
def get_asset_price(symbol: str, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.symbol == symbol.upper()).first()

    if not asset:
        return {"error": "Asset not found"}

    price = get_prix(asset.id)

    return {
        "symbol": asset.symbol,
        "name": asset.name,
        "type": asset.type,
        "price": price
    }


# récup tous les prix en même temps
@app.get("/assets")
def get_assets(db: Session = Depends(get_db)):
    assets = db.query(Asset).all()
    result = []

    for a in assets:
        price = get_prix(a.id)

        result.append({
            "symbol": a.symbol,
            "name": a.name,
            "type": a.type,
            "price": price
        })

    return result


# récup profil (nom + valeur totale + détails du portfolio)
@app.get("/profiles/{user_id}")
def portfolio(user_id: int, db: Session = Depends(get_db)):
    return profiles.get_portfolio(user_id, db)


# récup historique des trades d'un profil
@app.get("/profiles/{user_id}/history")
def history(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    tradeHistory = db.query(Trade).filter(Trade.user_id == user.id).all()

    result = []

    for trade in tradeHistory:
        asset = db.query(Asset).filter(Asset.id == trade.asset_id).first()

        result.append({
            "asset_name": asset.name,
            "side": trade.side,
            "quantity": trade.quantity,
            "price": trade.price,
            "timestamp": trade.timestamp
        })

    return result


@app.post("/profiles")
def create_profile(name: str, db: Session = Depends(get_db)):
    user = profiles.create_profile(name, db)

    return {
        "id": user.id,
        "name": user.name,
        "message": "Profil créé avec succès"
    }


@app.put("/profiles/{user_id}/edit")
def edit_profile(user_id: int, new_name: str, db: Session = Depends(get_db)):
    user = profiles.edit_profile(user_id, new_name, db)

    return {
        "id": user.id,
        "name": user.name,
        "message": "Nom du profil modifié avec succès"
    }


@app.delete("/profiles/{user_id}/delete")
def delete_profile(user_id: int, db: Session = Depends(get_db)):
    profiles.delete_profile(user_id, db)

    return {"message": f"Profil {user_id} supprimé avec succès"}


# acheter un asset
@app.post("/buy")
def buy_endpoint(user_id:int, symbol:str, amount_fiat:float, currency:str="USD", db: Session = Depends(get_db)):
    symbol_currency = ""

    if currency == "EUR":
        symbol_currency = "€"
    elif currency == "USD":
        symbol_currency = "$"

    user = db.query(User).filter(User.id == user_id).first()
    asset = db.query(Asset).filter(Asset.symbol == symbol).first()

    asset_amount, price = buy_asset(user,asset,amount_fiat,currency,db)

    total_price = asset_amount * price

    return {
        "message": "Asset acheté avec succès",
        "symbol": asset.symbol,
        "amount": asset_amount,
        "price": f"{amount_fiat}{symbol_currency}",
        "assetUnitPrice": f"{price}{symbol_currency}",
        "total_price": f"{total_price}{symbol_currency}"
    }


# vendre un asset possédé par le profil
@app.post("/sell")
def sell_endpoint(user_id:int, symbol:str, asset_amount:float,currency:str="USD",db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    asset = db.query(Asset).filter(Asset.symbol == symbol).first()

    currency_amount, price = sell_asset(user,asset,asset_amount,currency,db)

    symbol_currency = ""

    if currency == "EUR":
        symbol_currency = "€"
    elif currency == "USD":
        symbol_currency = "$"

    total_price = round(asset_amount * price,2)

    return {
        "message": "Asset vendu avec succès",
        "symbol": asset.symbol,
        "amount": asset_amount,
        "price": f"{price}{symbol_currency}",
        "total_price": f"{total_price}{symbol_currency}"
    }


# convertir entre USD et EUR
@app.post("/convert")
def convert(user_id:int, amount:float, from_symbol:str,to_symbol:str,db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()

    from_symbol_short = ""
    to_symbol_short = ""

    if from_symbol == "USD":
        from_symbol_short = "$"
    elif from_symbol == "EUR":
        from_symbol_short = "€"

    if to_symbol == "USD":
        to_symbol_short = "$"
    elif to_symbol == "EUR":
        to_symbol_short = "€"

    amount_in_new_currency = convert_currencies(amount,from_symbol, to_symbol,user,db)

    return {
        "message": "Conversion réussie",
        "from_symbol": from_symbol,
        "to_symbol": to_symbol,
        "original_amount": f"{amount}{from_symbol_short}",
        "new_amount": f"{amount_in_new_currency}{to_symbol_short}"
    }


@app.get("/prices/history/{symbol}/{period}")
def get_history(symbol: str, period: str, db: Session = Depends(get_db)):
    #TODO tester pour action
    asset = db.query(Asset).filter(Asset.symbol == symbol).first()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset introuvable")

    return get_price_history(asset, period)


@app.get("/prices/history/{symbol}")
def get_global_history(symbol: str, db: Session = Depends(get_db)):
    #TODO tester pour action
    asset = db.query(Asset).filter(Asset.symbol == symbol).first()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset introuvable")

    period_list = ["1h","12h","1d","1w","1m","6m","1y","5y"]

    results = {}

    for period in period_list:
        try:
            price = get_price_history(asset, period)
            results[period] = price
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Echec de la récup de l'historique : {e}")

    results["now"] = get_prix(asset.id)

    return {
        "symbol": asset.symbol,
        "type": asset.type,
        "history": results
    }


@app.get("/prices/percentage/{symbol}/{period}")
def get_percentage(symbol: str, period: str, db: Session = Depends(get_db)):
    #TODO tester avec action
    asset = db.query(Asset).filter(Asset.symbol == symbol).first()
    before = get_price_history(asset,period)
    now = get_prix(asset.id)

    percentage = ((now - before) / before) * 100

    return round(percentage, 2)


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
