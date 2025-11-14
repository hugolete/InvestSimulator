from sqlalchemy.orm import Session
from fastapi import HTTPException
from api.db.models import User, Asset, UserAsset, Trade
from api.services.prices import get_prix


def get_portfolio(user_id: int, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Profil introuvable")

    userAssets = db.query(UserAsset).filter(UserAsset.user_id == user_id).all()

    result = []
    total_worth = 0.0

    for a in userAssets:
        asset = db.query(Asset).filter(Asset.id == a.asset_id).first()
        price = get_prix(a.asset_id) or 0.0
        worth = a.quantity * price
        total_worth += worth

        if asset.type == "crypto":
            sector = "Crypto"
        elif asset.type == "etf":
            sector = "ETF"
        else:
            sector = asset.sector

        result.append({
            "symbol": asset.symbol,
            "name": asset.name,
            "type": asset.type,
            "sector": sector,
            "quantity": a.quantity,
            "worth": worth
        })

    result.append({"total_worth": total_worth})
    result.append({"performance": get_performance(user_id,db)})
    result.append({"allocation": get_allocation(user_id,db)})

    return result


def create_profile(name: str, db: Session):
    existing_user = db.query(User).filter(User.name == name).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Un profil avec ce nom existe déjà")

    new_user = User(name=name)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Ajouter le solde de départ (50k us dollars)
    dollar = db.query(Asset).filter(Asset.symbol == "USD").first()
    starting_balance = UserAsset(user_id=new_user.id, asset_id=dollar.id, quantity=50000)
    db.add(starting_balance)
    db.commit()

    return new_user


def edit_profile(user_id: int, new_name: str, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Profil introuvable")

    user.name = new_name
    db.commit()
    db.refresh(user)
    return user


def delete_profile(user_id: int, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Profil introuvable")

    # suppression des données liées
    db.query(UserAsset).filter(UserAsset.user_id == user.id).delete()
    db.query(Trade).filter(Trade.user_id == user_id).delete()
    db.delete(user)
    db.commit()


def get_performance(user_id:int,db:Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Profil introuvable")

    original_amount = 50000
    userAssets = db.query(UserAsset).filter(UserAsset.user_id == user_id).all()
    total_worth = 0.0

    for a in userAssets:
        price = get_prix(a.asset_id) or 0.0
        worth = a.quantity * price
        total_worth += worth

    perf_pourcentage = ((total_worth / original_amount) * 100) - 100

    return perf_pourcentage


def get_allocation(user_id:int,db:Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Profil introuvable")

    userAssets = db.query(UserAsset).filter(UserAsset.user_id == user_id).all()
    portfolio_allocation = {
        "crypto":0,
        "currency":0,
        "stock":0,
        "etf":0
    }
    portfolio_allocation_pct = {}
    total_worth = 0.0

    for a in userAssets:
        asset = db.query(Asset).filter(Asset.id == a.asset_id).first()
        type = asset.type
        price = get_prix(a.asset_id) or 0.0
        worth = a.quantity * price
        total_worth += worth

        portfolio_allocation[type] += worth

    if total_worth == 0:
        raise HTTPException(status_code=400, detail="Erreur : le portfolio est vide")

    portfolio_allocation_pct = {
        "crypto":(portfolio_allocation["crypto"]/total_worth * 100),
        "currency":(portfolio_allocation["currency"]/total_worth * 100),
        "stock":(portfolio_allocation["stock"]/total_worth * 100),
        "etf":(portfolio_allocation["etf"]/total_worth * 100)
    }

    return portfolio_allocation_pct


def get_portfolio_by_asset_type(user_id:int,db:Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Profil introuvable")

    userAssets = db.query(UserAsset).filter(UserAsset.user_id == user_id).all()
    portfolio_allocation = {
        "crypto": 0,
        "currency": 0,
        "stock": 0,
        "etf": 0
    }

    for a in userAssets:
        asset = db.query(Asset).filter(Asset.id == a.asset_id).first()
        type = asset.type
        price = get_prix(a.asset_id) or 0.0
        worth = a.quantity * price

        portfolio_allocation[type] += worth

    return portfolio_allocation
