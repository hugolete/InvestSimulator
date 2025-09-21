from datetime import datetime, timezone
import uvicorn
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from db.models import Asset, Base
from db.db import get_db, engine
from services.binance_ws import run_ws, get_crypto_price

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
        price = get_crypto_price(symbol.upper())  # prix live via Binance
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
    # TODO a tester avec plusieurs assets
    assets = db.query(Asset).all()
    result = []

    for a in assets:
        if a.type == "crypto":
            price = get_crypto_price(a.symbol)
        else:
            # price = get_price_other(symbol.upper())  # placeholder pour actions/ETF/bonds
            return {}

        result.append({
            "symbol": a.symbol,
            "name": a.name,
            "type": a.type,
            "price": price
        })

    return result


# récup profil (nom + valeur totale + détails du portfolio
@app.get("/profiles/{user_id}")
def portfolio(user_id: int):
    return {}


# récup historique des trades d'un profil
@app.get("/profiles/{user_id}/history")
def history(user_id: int):
    return {}


@app.post("/profiles")
def create_profile(name: str):
    return {}


@app.put("/profiles/{user_id}/edit")
def edit_profile(user_id: int, new_name: str):
    return {}


@app.delete("/profiles/{user_id}/delete")
def delete_profile(user_id: int):
    return {}


# acheter quelque chose
@app.post("/buy")
def buy_endpoint(user_id:int, symbol:str, amount_eur:float):
    return {}


# vendre quelque chose
@app.post("/sell")
def sell_endpoint(user_id:int, symbol:str, amount_asset:float):
    return {}


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
