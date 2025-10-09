from fastapi import HTTPException
from sqlalchemy.orm import Session
from api.db.models import Trade, UserAsset, Asset
from api.services.binance_ws import get_crypto_price
from api.services.prices import get_prix


def buy_asset(user,asset,amount_fiat:float,currency:str,db:Session):
    # vérifier que l’utilisateur possède assez de fonds
    currency = db.query(Asset).filter(Asset.symbol == currency.upper()).first()
    print(asset)
    print(user)

    if currency is None:
        raise HTTPException(status_code=400, detail="Monnaie inexistante")

    currency_user = db.query(UserAsset).filter(UserAsset.user_id == user.id,UserAsset.asset_id == currency.id).first()

    if currency_user is None:
        raise HTTPException(status_code=400, detail="Monnaie inexistante")

    if not currency_user or currency_user.quantity < amount_fiat:
        raise HTTPException(status_code=400,detail="Fonds insuffisants pour acheter")

    if user is None or asset is None:
        raise HTTPException(status_code=400, detail="Utilisateur ou asset inexistant")

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

    return round(asset_amount, 5), round(price, 2)


def sell_asset(user,asset,amount_asset:float,currency:str,db:Session):
    # vérifier que l’utilisateur possède assez de l'asset qu'il veut vendre
    if user is None or asset is None:
        raise HTTPException(status_code=400, detail="Utilisateur ou asset inexistant")

    assetToUpdate = db.query(UserAsset).filter(UserAsset.user_id == user.id, UserAsset.asset_id == asset.id).first()

    if not assetToUpdate or amount_asset > assetToUpdate.quantity:
        raise HTTPException(status_code=400,detail="Fonds insuffisants pour vendre")

    if assetToUpdate is None:
        raise HTTPException(status_code=400, detail="Cet utilisateur ne possède pas l'asset a vendre")

    # récup monnaie voulue par l'user
    currency = db.query(Asset).filter(Asset.symbol == currency.upper()).first()

    if currency is None:
        raise HTTPException(status_code=400, detail="Monnaie inexistante")

    currency_user = db.query(UserAsset).filter(UserAsset.user_id == user.id,UserAsset.asset_id == currency.id).first()  # monnaie de l'user

    if currency_user is None:
        raise HTTPException(status_code=400, detail="Monnaie inexistante")

    price = get_prix(asset.id)

    if price is None:
        print(f"Impossible de récupérer le prix pour {asset.symbol}")

    currency_amount = amount_asset * price

    trade = Trade(
        user_id=user.id,
        asset_id=asset.id,
        side="SELL",
        quantity=amount_asset,
        price=price
    )

    db.add(trade)

    # actualisation table user_assets
    assetToUpdate.quantity -= amount_asset

    # ajouter la currency obtenue avec la vente
    currency_user.quantity += currency_amount

    db.commit()
    db.refresh(trade)
    db.refresh(assetToUpdate)
    db.refresh(currency_user)

    return round(currency_amount,2), round(price,2)


def convert_currencies(amount: float,from_symbol:str,to_symbol:str,user,db:Session) -> float:
    # convertir eur/usd et usd/eur
    try:
        paire = from_symbol + to_symbol
        rate = get_crypto_price(paire)

        if rate is None:
            raise HTTPException(status_code=400,detail=f"Erreur de conversion {from_symbol}->{to_symbol} : taux non trouvé")

        amount_in_new_currency = amount * rate

        dollarUpdate = db.query(UserAsset).filter(UserAsset.user_id == user.id, UserAsset.asset_id == 4).first()
        euroUpdate = db.query(UserAsset).filter(UserAsset.user_id == user.id, UserAsset.asset_id == 11).first()

        if euroUpdate is None:
            # créer ligne euro dans la db
            new_euro = UserAsset(user_id=user.id, asset_id=11, quantity=0)
            db.add(new_euro)
            db.commit()
            db.refresh(new_euro)
            euroUpdate = new_euro

        if from_symbol == to_symbol:
            raise HTTPException(status_code=400,detail="Même monnaie")

        if from_symbol == "EUR":
            if amount > euroUpdate.quantity:
                raise HTTPException(status_code=400,detail="Fonds insuffisants pour acheter")

            dollarUpdate.quantity += amount_in_new_currency
            euroUpdate.quantity -= amount
        elif from_symbol == "USD":
            if amount > dollarUpdate.quantity:
                raise HTTPException(status_code=400,detail="Fonds insuffisants pour acheter")

            dollarUpdate.quantity -= amount
            euroUpdate.quantity += amount_in_new_currency
        else:
            raise HTTPException(status_code=400,detail="Symbole inconnu")

        db.commit()
        db.refresh(dollarUpdate)
        db.refresh(euroUpdate)

        return round(amount_in_new_currency, 2)
    except Exception as e:
        print(f"Erreur de conversion {from_symbol}->{to_symbol} : {e}")

    # si tout échoue, retourne le montant original (ou None)
    return amount
