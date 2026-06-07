# tests/conftest.py
import pytest
from unittest.mock import patch, MagicMock
import pandas as pd
from datetime import datetime, timezone

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

@pytest.fixture
def client():
    """Client avec threads mockés AVANT le startup"""
    from api.main import app
    import os
    os.environ["API_SECRET_KEY"] = "test-key"

    with patch("api.main.trade_watcher"), \
         patch("api.main.run_ws"), \
         patch("api.main.run_finnhub_ws"), \
         patch("api.main.stock_price_loop"):

        from fastapi.testclient import TestClient
        with TestClient(app) as c:
            c.headers["X-API-Key"] = "test-key"
            yield c
