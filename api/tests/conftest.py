# tests/conftest.py
import os

# ⚠️ Doit être défini AVANT tout import de `api.*` : api/db/db.py crée l'engine à l'import.
# Les tests tournent donc sur une base SQLite en mémoire, jamais sur invest_simulator.db.
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["API_SECRET_KEY"] = "test-key"

import pytest
from unittest.mock import patch
import pandas as pd
from datetime import datetime, timezone

API_KEY = "test-key"


def make_fake_df():
    index = pd.date_range(end=datetime.now(timezone.utc), periods=10, freq="1min", tz="UTC")
    return pd.DataFrame({"Close": [255.0] * 10}, index=index)


@pytest.fixture(scope="session", autouse=True)
def mock_yfinance():
    """Mock yfinance pour toute la session — évite les rate limits"""
    fake_df = make_fake_df()
    with patch("api.services.finnhub_ws.yf.download", return_value=fake_df), \
         patch("api.services.prices.yf.download", return_value=fake_df):
        yield


@pytest.fixture(autouse=True)
def isolate_favorites(tmp_path, monkeypatch):
    """Redirige le dossier des favoris vers un dossier temporaire pour CHAQUE test.

    Sans ça, supprimer le profil id 1 dans un test (la base en mémoire repart à l'id 1)
    effaçait le vrai fichier api/data/favorites/favorites_1.json.
    """
    from api.services import profiles
    favorites_dir = tmp_path / "favorites"
    monkeypatch.setattr(profiles, "FAVORITES_DIR", str(favorites_dir))
    yield favorites_dir


@pytest.fixture
def test_db():
    """Base en mémoire remise à zéro pour chaque test, avec USD (id 4), BTC et AAPL."""
    from api.db.db import engine, SessionLocal
    from api.db.models import Base, Asset

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as session:
        session.add_all([
            Asset(id=1, symbol="BTC", name="Bitcoin", type="crypto", sector=None),
            Asset(id=4, symbol="USD", name="Dollar", type="currency", sector=None),
            Asset(id=60, symbol="AAPL", name="Apple Inc.", type="stock", sector="Technology"),
        ])
        session.commit()

    yield SessionLocal


def _make_client(with_key: bool):
    """TestClient avec les threads de fond (watcher, websockets, yfinance) neutralisés."""
    from api.main import app
    from fastapi.testclient import TestClient

    with patch("api.main.trade_watcher"), \
         patch("api.main.run_ws"), \
         patch("api.main.run_finnhub_ws"), \
         patch("api.main.stock_price_loop"):
        with TestClient(app) as c:
            if with_key:
                c.headers["X-API-Key"] = API_KEY
            yield c


@pytest.fixture
def client(test_db):
    """Client authentifié sur la base de test."""
    yield from _make_client(with_key=True)


@pytest.fixture
def anon_client(test_db):
    """Client SANS clé API (pour vérifier les 403)."""
    yield from _make_client(with_key=False)
