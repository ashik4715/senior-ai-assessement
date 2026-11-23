import json
from sqlalchemy.orm import Session
from .models import *
from .time_utils import *
from .rules import *

def build_rules_report(db: Session) -> dict:
    report = {"now": APP_NOW.strftime("%Y-%m-%dT%H:%M:%SZ"), "teams": {}}
    teams = db.query(Team).all()
    weeks = last_n_weeks(13)  # 13 weeks ending current
    for team in teams:
        tid = team.id
        # measurable_status
        measurables = db.query(Measurable).filter_by(team_id=tid).all()
        ms_status = {}
        for m in measurables:
            ms_status[m.id] = {}
            for w in weeks:
                ms_status[m.id][str(w)] = measurable_status(db, m, w)
        # todo_completion for every week
        todo_comp = {}
        for w in weeks:
            todo_comp[str(w)] = todo_completion_for_week(db, tid, w)
        # overdue todos
        overdue = overdue_todos(db, tid)
        # rocks
        rocks = {}
        for r in db.query(Rock).filter_by(team_id=tid).all():
            rocks[r.id] = {
                "status": rock_status(db, r),
                "progress_percent": rock_progress(db, r),
            }
        # issue_order
        io = issue_order(db, tid)
        # meetings ended
        meetings = {}
        for mt in db.query(Meeting).filter(Meeting.team_id == tid, Meeting.ended_at.isnot(None)).all():
            meetings[mt.id] = meeting_summary(db, mt)
        report["teams"][tid] = {
            "measurable_status": ms_status,
            "todo_completion": todo_comp,
            "overdue_todos": overdue,
            "rocks": rocks,
            "issue_order": io,
            "meetings": meetings,
        }
    return report
