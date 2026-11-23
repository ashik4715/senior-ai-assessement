import os
from datetime import datetime, timezone

APP_NOW_RAW = os.getenv("APP_NOW", "2026-11-11T15:00:00Z")
COMPANY_TZ = os.getenv("COMPANY_TZ", "America/Chicago")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/atri")

def parse_now(s: str) -> datetime:
    s = s.strip()
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    dt = datetime.fromisoformat(s)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

APP_NOW = parse_now(APP_NOW_RAW)
