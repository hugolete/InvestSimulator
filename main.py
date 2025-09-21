from datetime import datetime, timezone
import uvicorn
from fastapi import FastAPI
from services.binance_ws import run_ws, get_price

run_ws()
app = FastAPI()

@app.get("/")
def home():
    return {
        "message": "Bienvenue sur le Crypto Simulator API !",
        "timestamp": datetime.now(timezone.utc)
    }


# récup prix d'une crypto
@app.get("/crypto/{crypto_symbol}")
def crypto(crypto_symbol: str):
    price = get_price(crypto_symbol.upper())

    if price is None:
        return {"error": "Symbole pas trouvé"}

    return {"symbol": crypto_symbol.upper(), "price": price}


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
