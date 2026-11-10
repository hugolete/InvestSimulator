from datetime import datetime, UTC
from fastapi import HTTPException
from api.db.models import Order, UserAsset
from api.services.prices import get_prix
from sqlalchemy.orm import Session

from api.services.trade import sell_asset


STOP_LOSS = "STOP_LOSS"
TAKE_PROFIT = "TAKE_PROFIT"


def normalize_order_type(order_type: str) -> str:
    """Accepte 'stop-loss', 'stop_loss', 'STOP-LOSS'... et renvoie STOP_LOSS / TAKE_PROFIT."""
    normalized = (order_type or "").strip().upper().replace("-", "_")
    if normalized not in (STOP_LOSS, TAKE_PROFIT):
        raise HTTPException(status_code=400, detail="Type d'ordre invalide")
    return normalized


def set_protection(user, asset, order_type: str, percentage: float, quantity: float, db: Session):
    order_type = normalize_order_type(order_type)

    current_price = get_prix(asset.id)
    if not current_price:
        raise HTTPException(status_code=404, detail="Prix actuel indisponible")

    abs_perc = abs(percentage) / 100

    if order_type == TAKE_PROFIT:
        trigger_price = current_price * (1 + abs_perc)
    else:
        trigger_price = current_price * (1 - abs_perc)

    existing_order = db.query(Order).filter(
        Order.user_id == user.id,
        Order.asset_id == asset.id,
        Order.order_type == order_type
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
            order_type=order_type,
            target_percentage=percentage,
            trigger_price=trigger_price,
            quantity=quantity,
            created_at=datetime.now(UTC),
        )
        db.add(new_order)

    db.commit()

    return f"{order_type} configuré à {trigger_price:.2f} ({percentage}%)"


def get_held_quantity(db: Session, user_id: int, asset_id: int) -> float:
    held = db.query(UserAsset).filter(UserAsset.user_id == user_id, UserAsset.asset_id == asset_id).first()
    return float(held.quantity) if held and held.quantity else 0.0


def delete_orders_for_position(db: Session, user_id: int, asset_id: int):
    """Supprime tous les ordres (SL + TP) d'une position : utilisé quand l'un se déclenche ou que la position n'existe plus."""
    db.query(Order).filter(Order.user_id == user_id, Order.asset_id == asset_id).delete()


def check_triggers(db: Session):
    orders = db.query(Order).all()
    handled_positions = set()

    for order in orders:
        position_key = (order.user_id, order.asset_id)
        if position_key in handled_positions:
            continue  # l'autre ordre de cette position s'est déjà déclenché ce tour-ci

        try:
            current_price = get_prix(order.asset_id)
            if not current_price:
                continue

            # Tolère les anciens ordres enregistrés avec un tiret (STOP-LOSS / TAKE-PROFIT)
            order_type = (order.order_type or "").upper().replace("-", "_")

            triggered = (
                (order_type == STOP_LOSS and current_price <= order.trigger_price) or
                (order_type == TAKE_PROFIT and current_price >= order.trigger_price)
            )
            if not triggered:
                continue

            held = get_held_quantity(db, order.user_id, order.asset_id)
            quantity = min(order.quantity, held)

            if quantity > 0:
                # On exécute la vente avec le commentaire pour la mémoire du bot
                sell_asset(
                    user=order.user,
                    asset=order.asset,
                    amount_asset=quantity,
                    currency="USD",
                    db=db,
                    comment=order_type  # Sera loggé dans la table 'trades'
                )
            else:
                print(f"[Orders] {order_type} ignoré : plus de position (user {order.user_id}, asset {order.asset_id})")

            # Ordre terminé : on supprime aussi l'ordre opposé de la même position
            delete_orders_for_position(db, order.user_id, order.asset_id)
            db.commit()
            handled_positions.add(position_key)

        except Exception as e:
            db.rollback()
            print(f"[Orders] Erreur sur l'ordre {getattr(order, 'id', '?')} : {e}")
