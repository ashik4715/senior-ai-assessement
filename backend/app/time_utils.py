from datetime import datetime, date, timedelta, timezone
from zoneinfo import ZoneInfo
from .config import APP_NOW, COMPANY_TZ

TZ = ZoneInfo(COMPANY_TZ)

def now_utc() -> datetime:
    return APP_NOW

def to_company(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(TZ)

def today_company() -> date:
    return APP_NOW.astimezone(TZ).date()

def company_date(dt: datetime) -> date:
    return to_company(dt).date()

def week_start_company(d: date) -> date:
    # Monday of the week containing d
    return d - timedelta(days=d.weekday())

def current_week_start() -> date:
    return week_start_company(today_company())

def last_closed_week_start() -> date:
    return current_week_start() - timedelta(days=7)

def week_start_for_date(d: date) -> date:
    return week_start_company(d)

def week_end_exclusive_utc(week_start: date) -> datetime:
    # next monday 00:00 company -> utc
    next_monday = week_start + timedelta(days=7)
    local = datetime(next_monday.year, next_monday.month, next_monday.day, 0, 0, 0, tzinfo=TZ)
    return local.astimezone(timezone.utc)

def week_contains_date(week_start: date, d: date) -> bool:
    return week_start <= d < week_start + timedelta(days=7)

def last_n_weeks(n: int) -> list[date]:
    cur = current_week_start()
    return [cur - timedelta(days=7*i) for i in range(n-1, -1, -1)]

def round_half_up(x: float) -> int:
    # for percentages maybe
    from decimal import Decimal, ROUND_HALF_UP
    return int(Decimal(str(x)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))

def round_half_up_1(x: float) -> float:
    from decimal import Decimal, ROUND_HALF_UP
    return float(Decimal(str(x)).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP))

def format_week_title(week_start: date) -> str:
    return week_start.strftime("%b ") + str(week_start.day)
    # e.g. Nov 2
