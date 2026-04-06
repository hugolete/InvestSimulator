from datetime import datetime, UTC
from fastapi import HTTPException
from api.db.models import Order
from api.services.prices import get_prix
from sqlalchemy.orm import Session

from api.services.trade import sell_asset


def set_protection(user, asset, order_type: str, percentage: float, quantity: float, db: Session):
    current_price = get_prix(asset.id)
    if not current_price:
        raise HTTPException(status_code=404, detail="Prix actuel indisponible")

    trigger_price = current_price
    abs_perc = abs(percentage) / 100

    if order_type.lower() == "take-profit":
        trigger_price = current_price * (1 + abs_perc)
    elif order_type.lower() == "stop-loss":
        trigger_price = current_price * (1 - abs_perc)
    else:
        raise HTTPException(status_code=400, detail="Type d'ordre invalide")

    existing_order = db.query(Order).filter(
        Order.user_id == user.id,
        Order.asset_id == asset.id,
        Order.order_type == order_type.upper()
    ).first()

    if existing_order:
        existing_order.trigger_price = trigger_price
        existing_order.target_percentage = percentage
        existing_order.quantity = quantity
        existing_order.created_at = datetime.now(UTC)
    else:
        new_order = Order(
            user_id=user.id,
            asset_id=asset.id,
            order_type=order_type.upper(),
            target_percentage=percentage,
            trigger_price=trigger_price,
            quantity=quantity,
            created_at=datetime.now(UTC),
        )
        db.add(new_order)

    db.commit()

    return f"{order_type} configuré à {trigger_price:.2f} ({percentage}%)"


def check_triggers(db: Session):
    orders = db.query(Order).all()

    for order in orders:
        current_price = get_prix(order.asset_id)

        if not current_price:
            continue

        triggered = False
        if order.order_type == "STOP_LOSS" and current_price <= order.trigger_price:
            triggered = True
        elif order.order_type == "TAKE_PROFIT" and current_price >= order.trigger_price:
            triggered = True

        if triggered:
            # On exécute la vente avec le commentaire pour la mémoire de Grok
            sell_asset(
                user=order.user,
                asset=order.asset,
                amount_asset=order.quantity,
                currency="USD",
                db=db,
                comment=order.order_type  # Sera loggé dans la table 'trades'
            )
            # On supprime l'ordre car il est terminé
            db.delete(order)

            db.commit()
