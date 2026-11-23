import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://mdashikurrahman@localhost:5432/atri")
os.environ.setdefault("APP_NOW", "2026-11-11T15:00:00Z")
os.environ.setdefault("SEED_PATH", "/Users/mdashikurrahman/Downloads/GTAVI/Atri-AI/seed.json")

from fastapi.testclient import TestClient
import pytest
from app.main import app
from app.db import Base, engine, SessionLocal
from seed import load_seed

@pytest.fixture(autouse=True)
def reset_db():
    load_seed()
    yield

@pytest.fixture
def client():
    return TestClient(app)

def auth_headers(uid):
    return {"X-User-Id": uid}
