# SQLAlchemy (Users, Assets, UserAssets, Trades)
# Template de la DB

from sqlalchemy import Column, Integer, String, ForeignKey, Float, DateTime, PrimaryKeyConstraint
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


# Table Assets = catalogue global des actifs
class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, unique=True, index=True)  # BTC, ETH, AAPL...
    name = Column(String)                             # Bitcoin, Apple...
    type = Column(String)                             # crypto, stock, fiat, etf...

    users = relationship("UserAsset", back_populates="asset")
    trades = relationship("Trade", back_populates="asset")


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
    price = Column(Float)  # prix au moment du trade (en EUR ou USDT)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc)) # date du trade

    user = relationship("User", back_populates="trades")
    asset = relationship("Asset", back_populates="trades")
