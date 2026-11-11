import os
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from fastapi import HTTPException
from api.db.models import User, Asset, UserAsset, Trade, UserPosition, Order
from api.services.prices import get_prix


FAVORITES_DIR = "api/data/favorites"


def favorites_path(user_id: int) -> str:
    """Fichier JSON des favoris d'un profil (partagé par les routes favoris et delete_profile)."""
    return f"{FAVORITES_DIR}/favorites_{user_id}.json"


def get_portfolio(user_id: int, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Profil introuvable")

    userAssets = db.query(UserAsset).filter(UserAsset.user_id == user_id).all()
    assets = []
    total_worth = 0.0

    for a in userAssets:
        if a.quantity > 0.0:
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

            assets.append({
                "symbol": asset.symbol,
                "name": asset.name,
                "type": asset.type,
                "sector": sector,
                "quantity": a.quantity,
                "worth": worth
            })

    return {
        "profileName": user.name,
        "assets": assets,
        "total_worth": total_worth,
        "performance": get_performance(user_id,2000, db),
        "allocation": get_allocation(user_id, db)
    }


DUPLICATE_NAME_DETAIL = "Un profil avec ce nom existe déjà"


def normalize_profile_name(name: str) -> str:
    """Retire les espaces autour du nom et refuse un nom vide."""
    cleaned = (name or "").strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="Le nom du profil ne peut pas être vide")
    return cleaned


def create_profile(name: str, db: Session):
    name = normalize_profile_name(name)

    existing_user = db.query(User).filter(User.name == name).first()
    if existing_user:
        raise HTTPException(status_code=400, detail=DUPLICATE_NAME_DETAIL)

    # On vérifie le dollar AVANT de créer quoi que ce soit : pas de profil sans solde
    dollar = db.query(Asset).filter(Asset.symbol == "USD").first()
    if dollar is None:
        raise HTTPException(status_code=500, detail="Monnaie USD absente de la base")

    try:
        new_user = User(name=name)
        db.add(new_user)
        db.flush()  # attribue new_user.id sans commit

        # Solde de départ (2000 USD)
        db.add(UserAsset(user_id=new_user.id, asset_id=dollar.id, quantity=2000))
        db.commit()  # profil + solde en une seule transaction
    except IntegrityError:
        # Deux créations simultanées avec le même nom
        db.rollback()
        raise HTTPException(status_code=400, detail=DUPLICATE_NAME_DETAIL)

    db.refresh(new_user)
    return new_user


def edit_profile(user_id: int, new_name: str, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Profil introuvable")

    new_name = normalize_profile_name(new_name)

    other_user = db.query(User).filter(User.name == new_name, User.id != user_id).first()
    if other_user:
        raise HTTPException(status_code=400, detail=DUPLICATE_NAME_DETAIL)

    try:
        user.name = new_name
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail=DUPLICATE_NAME_DETAIL)

    db.refresh(user)
    return user


def delete_profile(user_id: int, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Profil introuvable")

    # suppression des données liées
    db.query(UserAsset).filter(UserAsset.user_id == user.id).delete()
    db.query(Trade).filter(Trade.user_id == user_id).delete()
    db.query(UserPosition).filter(UserPosition.user_id == user_id).delete()
    db.query(Order).filter(Order.user_id == user_id).delete()
    db.delete(user)
    db.commit()

    # Après le commit seulement : si la base échoue, les favoris restent intacts
    try:
        os.remove(favorites_path(user_id))
    except FileNotFoundError:
        pass  # aucun favori enregistré pour ce profil
    except OSError as e:
        print(f"[Profiles] Impossible de supprimer les favoris du profil {user_id} : {e}")


def get_performance(user_id:int,original_amount:int,db:Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Profil introuvable")

    #original_amount = 50000
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


def get_profiles(db:Session):
    users = db.query(User).all()
    profiles = []

    for user in users:
        profiles.append({
            "id": user.id,
            "name": user.name
        })

    return users


def get_cash(user_id:int,db:Session):
    result = db.query(UserAsset).filter(UserAsset.user_id == user_id, UserAsset.asset_id == 4).first()

    if result is None:
        raise HTTPException(status_code=404, detail="Cash du profil introuvable")

    return result.quantity or 0.0
