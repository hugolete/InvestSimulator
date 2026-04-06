# SQLAlchemy (Users, Assets, UserAssets, Trades)
# Template de la DB

from sqlalchemy import Column, Integer, String, ForeignKey, Float, DateTime, PrimaryKeyConstraint, DOUBLE_PRECISION
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime, timezone

Base = declarative_base()

# Table Users = profils
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)

    assets = relationship("UserAsset", back_populates="user")
    trades = relationship("Trade", back_populates="user")
    user_positions = relationship("UserPosition", back_populates="user")


# Table Assets = catalogue global des actifs
class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, unique=True, index=True)  # BTC, ETH, AAPL...
    name = Column(String)                             # Bitcoin, Apple...
    type = Column(String)                             # crypto, stock, fiat, etf...
    sector = Column(String)                           # secteur

    users = relationship("UserAsset", back_populates="asset")
    trades = relationship("Trade", back_populates="asset")
    user_positions = relationship("UserPosition", back_populates="asset")


# Table UserAssets = portefeuille actuel d’un user
class UserAsset(Base):
    __tablename__ = "user_assets"

    user_id = Column(Integer, ForeignKey("users.id"))
    asset_id = Column(Integer, ForeignKey("assets.id"))
    quantity = Column(Float, default=0.0)

    __table_args__ = (
        PrimaryKeyConstraint("user_id", "asset_id"),
    )

    user = relationship("User", back_populates="assets")
    asset = relationship("Asset", back_populates="users")


# Table Trades = historique des opérations
class Trade(Base):
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    asset_id = Column(Integer, ForeignKey("assets.id"))
    side = Column(String)  # BUY ou SELL
    quantity = Column(Float)
    price = Column(Float)  # prix au moment du trade (en USD)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc)) # date du trade en UTC
    comment = Column(String)

    user = relationship("User", back_populates="trades")
    asset = relationship("Asset", back_populates="trades")


class UserPosition(Base):
    __tablename__ = "user_positions"

    user_id = Column(Integer, ForeignKey("users.id"))
    asset_id = Column(Integer, ForeignKey("assets.id"))
    quantity = Column(DOUBLE_PRECISION, default=0.0)
    pmp = Column(DOUBLE_PRECISION, default=0.0)
    total_cost = Column(DOUBLE_PRECISION, default=0.0)
    last_updated = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        PrimaryKeyConstraint("user_id", "asset_id"),
    )

    user = relationship("User", back_populates="user_positions")
    asset = relationship("Asset", back_populates="user_positions")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    asset_id = Column(Integer, ForeignKey("assets.id"))

    order_type = Column(String)  # "STOP_LOSS" ou "TAKE_PROFIT"
    target_percentage = Column(Float)  # exemple : -7.5 ou 15.0
    trigger_price = Column(DOUBLE_PRECISION)  # Prix réel calculé à l'ouverture
    quantity = Column(DOUBLE_PRECISION)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    asset = relationship("Asset")
    user = relationship("User")
