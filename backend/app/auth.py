from fastapi import Depends, HTTPException, Request, Cookie
from sqlalchemy.orm import Session
from .db import get_db
from .models import User, Membership

def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    uid = request.headers.get("X-User-Id")
    if not uid:
        # cookie
        uid = request.cookies.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Not authenticated")
    u = db.get(User, uid)
    if not u:
        raise HTTPException(status_code=401, detail="Unknown user")
    return u

def is_admin(u: User) -> bool:
    return u.role == "admin"

def can_access_team(db: Session, u: User, team_id: str) -> bool:
    if u.role == "admin":
        return True
    m = db.query(Membership).filter_by(user_id=u.id, team_id=team_id).first()
    return m is not None

def require_team_access(db: Session, u: User, team_id: str):
    if not can_access_team(db, u, team_id):
        raise HTTPException(status_code=403, detail="No access to team")

def can_write(u: User) -> bool:
    return u.role in ("admin", "team_member")

def require_write(u: User):
    if not can_write(u):
        raise HTTPException(status_code=403, detail="Read-only")

def team_member_user_ids(db: Session, team_id: str) -> list[str]:
    # admins + team_members who are members of team
    rows = db.query(Membership).filter_by(team_id=team_id).all()
    ids = []
    for m in rows:
        u = db.get(User, m.user_id)
        if u and u.role in ("admin", "team_member"):
            ids.append(u.id)
    # admins not necessarily members? spec: owner from team's Admins and Team Members. Include company admins? Assume members.
    return sorted(ids)
