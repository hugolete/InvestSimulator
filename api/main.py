from datetime import datetime, timezone
import uvicorn
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from api.db.models import Asset, Base, User, Trade
from api.db.db import get_db, engine
from api.services import profiles
from api.services.binance_ws import run_ws, get_crypto_price
from api.services.trade import buy_asset
from api.services.prices import get_prix

Base.metadata.create_all(bind=engine)
app = FastAPI()


@app.on_event("startup")
def startup_event():
    run_ws()


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

    if asset.type == "crypto":
        new_symbol = symbol+"USDT" # rajout du USDT pour la rech binance
        price = get_crypto_price(new_symbol.upper())  # prix live via Binance
    else:
        #price = get_price_other(symbol.upper())  # placeholder pour actions/ETF/bonds
        return {}

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
    # TODO tester quand le reste sera fini
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
def buy_endpoint(user_id:int, symbol:str, amount_fiat:float, currency:str, db: Session = Depends(get_db)):
    #TODO a tester
    user = db.query(User).filter(User.id == user_id).first()
    asset = db.query(Asset).filter(Asset.symbol == symbol).first()

    asset_amount = buy_asset(user,asset,amount_fiat,currency,db)

    symbol_currency = ""

    if currency == "EUR":
        symbol_currency = "€"
    elif currency == "USD":
        symbol_currency = "$"

    return {
        "message": "Asset acheté avec succès",
        "symbol": asset.symbol,
        "amount": asset_amount,
        "price": f"{amount_fiat}{symbol_currency}"
    }


# vendre un asset possédé par le profil
@app.post("/sell")
def sell_endpoint(user_id:int, symbol:str, amount_asset:float):
    #TODO

    return {}





if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
