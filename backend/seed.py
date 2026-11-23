import json, os
from sqlalchemy.orm import Session
from app.db import SessionLocal, engine, Base
from app.models import *
from app.config import APP_NOW
from datetime import datetime, date

SEED_PATH = os.getenv("SEED_PATH", "/app/seed.json")

def load_seed():
    with open(SEED_PATH) as f:
        data = json.load(f)

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()
    try:
        c = data["company"]
        db.add(Company(id=c["id"], name=c["name"], timezone=c["timezone"]))
        for t in data["teams"]:
            db.add(Team(id=t["id"], company_id=c["id"], name=t["name"]))
        db.flush()
        for u in data["users"]:
            db.add(User(id=u["id"], name=u["name"], email=u["email"], role=u["role"]))
        db.flush()
        for m in data["memberships"]:
            db.add(Membership(user_id=m["user_id"], team_id=m["team_id"]))
        for m in data["measurables"]:
            g = m["goal"]
            db.add(Measurable(
                id=m["id"], team_id=m["team_id"], name=m["name"], owner_id=m["owner_id"],
                unit=m["unit"], goal_type=g["type"],
                goal_value=g.get("value"), goal_min=g.get("min"), goal_max=g.get("max"),
            ))
        db.flush()
        for s in data["scores"]:
            db.add(Score(measurable_id=s["measurable_id"], week_start=date.fromisoformat(s["week_start"]), value=s["value"]))
        for r in data["rocks"]:
            db.add(Rock(id=r["id"], team_id=r["team_id"], title=r["title"], owner_id=r["owner_id"], quarter=r["quarter"], status=r["status"]))
        db.flush()
        for ms in data["milestones"]:
            db.add(Milestone(id=ms["id"], rock_id=ms["rock_id"], title=ms["title"], due_date=date.fromisoformat(ms["due_date"]), done=ms["done"]))
        for i in data["issues"]:
            src = i.get("source")
            db.add(Issue(
                id=i["id"], team_id=i["team_id"], title=i["title"], owner_id=i["owner_id"],
                priority=i["priority"], created_at=datetime.fromisoformat(i["created_at"].replace("Z","+00:00")), solved_at=(datetime.fromisoformat(i["solved_at"].replace("Z","+00:00")) if i["solved_at"] else None),
                resolution_note=i["resolution_note"],
                source_measurable_id=src["measurable_id"] if src else None,
                source_week_start=(date.fromisoformat(src["week_start"]) if src else None),
            ))
        db.flush()
        for t in data["todos"]:
            db.add(Todo(id=t["id"], team_id=t["team_id"], title=t["title"], owner_id=t["owner_id"],
                        due_date=date.fromisoformat(t["due_date"]), done_at=(datetime.fromisoformat(t["done_at"].replace("Z","+00:00")) if t["done_at"] else None), source_issue_id=t["source_issue_id"],
                        created_at=datetime.fromisoformat(t["created_at"].replace("Z","+00:00"))))
        for mt in data["meetings"]:
            db.add(Meeting(id=mt["id"], team_id=mt["team_id"], facilitator_id=mt["facilitator_id"],
                           started_at=datetime.fromisoformat(mt["started_at"].replace("Z","+00:00")), ended_at=(datetime.fromisoformat(mt["ended_at"].replace("Z","+00:00")) if mt["ended_at"] else None), section=2,
                           section_started_at=datetime.fromisoformat(mt["started_at"].replace("Z","+00:00")), attendee_ids=mt["attendee_ids"],
                           ratings={r["user_id"]: r["rating"] for r in mt["ratings"]}))
        db.commit()
        print("Seed loaded")
    finally:
        db.close()

if __name__ == "__main__":
    load_seed()
