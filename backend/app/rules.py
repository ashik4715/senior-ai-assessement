from datetime import date, timedelta
from sqlalchemy.orm import Session
from .models import *
from .time_utils import *

def measurable_status(db: Session, m: Measurable, week_start: date) -> str:
    score = db.query(Score).filter_by(measurable_id=m.id, week_start=week_start).first()
    cur_ws = current_week_start()
    closed = week_start < cur_ws  # week fully before current week
    # determine if week is current
    is_current = (week_start == cur_ws)
    if score is None:
        if is_current:
            return "pending"
        # closed week no score -> off track (if week in range). For future? none
        return "off_track"
    val = score.value
    g = m
    on = False
    if g.goal_type == "at_least":
        on = val >= g.goal_value
    elif g.goal_type == "at_most":
        on = val <= g.goal_value
    elif g.goal_type == "between":
        on = (val >= g.goal_min) and (val <= g.goal_max)
    elif g.goal_type == "exactly":
        on = val == g.goal_value
    return "on_track" if on else "off_track"

def todo_completion_for_week(db: Session, team_id: str, week_start: date) -> dict | None:
    # To-Dos due that week
    week_end_excl = week_start + timedelta(days=7)  # date boundary
    todos = db.query(Todo).filter(Todo.team_id == team_id).all()
    due_list = []
    for t in todos:
        if week_start <= t.due_date < week_start + timedelta(days=7):
            due_list.append(t)
    if not due_list:
        return None
    due = len(due_list)
    done = 0
    boundary = week_end_exclusive_utc(week_start)  # next monday 00 utc
    for t in due_list:
        if t.done_at is not None and t.done_at < boundary:
            done += 1
    ratio = done / due if due else 0
    rate = round_half_up(ratio * 100)
    meets = ratio >= 0.9
    return {"due": due, "done": done, "rate_percent": rate, "meets_target": meets}

def overdue_todos(db: Session, team_id: str) -> list[str]:
    today = today_company()
    ids = []
    for t in db.query(Todo).filter(Todo.team_id == team_id).all():
        if t.done_at is None and t.due_date < today:
            ids.append(t.id)
    return sorted(ids)

def rock_status(db: Session, rock: Rock) -> str:
    if rock.status == "complete":
        return "complete"
    # past due unfinished milestone
    today = today_company()
    ms = db.query(Milestone).filter_by(rock_id=rock.id).all()
    for m in ms:
        if not m.done and m.due_date < today:
            return "off_track"
    if rock.status == "off_track":
        return "off_track"
    return "on_track"

def rock_progress(db: Session, rock: Rock) -> int:
    ms = db.query(Milestone).filter_by(rock_id=rock.id).all()
    total = len(ms)
    if total == 0:
        if rock.status == "complete":
            return 100
        return 0
    done = sum(1 for m in ms if m.done)
    return round_half_up((done/total)*100)

def issue_order(db: Session, team_id: str) -> list[str]:
    unsolved = db.query(Issue).filter(Issue.team_id == team_id, Issue.solved_at.is_(None)).all()
    # sort: priority desc (None last), created_at asc
    def key(i):
        p = i.priority if i.priority is not None else -1  # None last; but priority 1..5, so -1 last? Need None after 1. Use tuple (0 if None else 1, ...) 
        # We want priority 5..1 first, then None. So group: has priority first.
        has = 0 if i.priority is None else 1
        # higher priority first => negative
        prio = -(i.priority or 0)
        return (has, prio, i.created_at)  # has 0 (None) should come after has 1, so sort has asc puts None(0) first -> wrong. Need reverse group.
    # redo: primary group: has priority first
    def key2(i):
        has = 0 if i.priority is None else 1
        # we want has=1 first, so sort descending on has. Use negative.
        prio = -(i.priority or 0)
        return (-has, prio, i.created_at)
    unsolved_sorted = sorted(unsolved, key=key2)
    return [i.id for i in unsolved_sorted]

def meeting_scorecard_week(meeting: Meeting) -> date:
    # last closed week relative to meeting started_at
    local_date = meeting.started_at.astimezone(ZoneInfo(COMPANY_TZ) if False else None) if False else None
    from zoneinfo import ZoneInfo
    tz = ZoneInfo(COMPANY_TZ)
    d = meeting.started_at.astimezone(tz).date()
    cur = week_start_company(d)
    return cur - timedelta(days=7)

def meeting_summary(db: Session, meeting: Meeting) -> dict:
    team_id = meeting.team_id
    sw = meeting_scorecard_week(meeting)
    # measurable statuses for last closed week (sw)
    measurables = db.query(Measurable).filter_by(team_id=team_id).all()
    ms_status = {}
    for m in measurables:
        ms_status[m.id] = measurable_status(db, m, sw)
    # issues solved during meeting
    issues_solved = [i.id for i in db.query(Issue).filter(Issue.team_id==team_id, Issue.solved_at >= meeting.started_at, Issue.solved_at <= meeting.ended_at).all()] if meeting.ended_at else []
    # todos created during meeting
    todos_created = [t.id for t in db.query(Todo).filter(Todo.team_id==team_id, Todo.created_at >= meeting.started_at, Todo.created_at <= meeting.ended_at).all()] if meeting.ended_at else []
    # rating
    ratings = meeting.ratings or {}
    if ratings:
        avg = sum(ratings.values())/len(ratings)
        rating = round_half_up_1(avg)
    else:
        rating = None
    return {
        "scorecard_week": str(sw),
        "measurable_status": ms_status,
        "issues_solved": sorted(issues_solved),
        "todos_created": sorted(todos_created),
        "attendee_ids": sorted(list(meeting.attendee_ids or [])),
        "rating": rating,
    }
