from sqlalchemy.orm import Session
from api.db.models import Trade, UserAsset, Asset
from api.main import get_prix


def buy_asset(user,asset,amount_fiat:float,currency:str,db:Session):
    # vérifier que l’utilisateur possède assez de fonds
    currency = db.query(Asset).filter(Asset.symbol == currency.upper()).first()
    currency_user = db.query(UserAsset).filter(UserAsset.user_id == user.id,UserAsset.asset_id == currency.id).first()

    if not currency_user or currency_user.quantity < amount_fiat:
        raise ValueError("Fonds insuffisants pour acheter")

    price = get_prix(asset.id)

    if price is None:
        print(f"Impossible de récupérer le prix pour {asset.symbol}")

    asset_amount = amount_fiat / price

    trade = Trade(
        user_id=user.id,
        asset_id=asset.id,
        side="BUY",
        quantity=asset_amount,
        price=price
    )

    db.add(trade)

    # actualisation table user_assets
    assetToUpdate = db.query(UserAsset).filter(UserAsset.user_id == user.id,UserAsset.asset_id == asset.id).first()

    if assetToUpdate:
        assetToUpdate.quantity += asset_amount
    else:
        assetToUpdate = UserAsset(
            user_id=user.id,
            asset_id=asset.id,
            quantity=asset_amount
        )
        db.add(assetToUpdate)

    # enlever la currency utilisée pour l'achat
    currency_user.quantity -= amount_fiat

    db.commit()
    db.refresh(trade)
    db.refresh(assetToUpdate)
    db.refresh(currency_user)

    return asset_amount
