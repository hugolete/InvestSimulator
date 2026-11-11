import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from pathlib import Path


db_path = Path(__file__).parent / "invest_simulator.db"

# DATABASE_URL permet de pointer vers une autre base (ex : "sqlite://" en mémoire pour les tests).
# Par défaut : le fichier invest_simulator.db à côté de ce module.
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL") or f"sqlite:///{db_path}"

engine_kwargs = {"connect_args": {"check_same_thread": False}}

if SQLALCHEMY_DATABASE_URL in ("sqlite://", "sqlite:///:memory:"):
    # Une seule connexion partagée, sinon chaque session verrait une base en mémoire vide
    engine_kwargs["poolclass"] = StaticPool
else:
    engine_kwargs["pool_recycle"] = 1800

engine = create_engine(SQLALCHEMY_DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Fonction helper pour FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
