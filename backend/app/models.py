from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Date, Text, ForeignKey, UniqueConstraint, Index, JSON, CheckConstraint
from sqlalchemy.orm import relationship
from .db import Base
from datetime import datetime, timezone

def utcnow():
    from .config import APP_NOW
    return APP_NOW

class Company(Base):
    __tablename__ = "companies"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    timezone = Column(String, nullable=False)

class Team(Base):
    __tablename__ = "teams"
    id = Column(String, primary_key=True)
    company_id = Column(String, ForeignKey("companies.id"), nullable=False)
    name = Column(String, nullable=False)

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    role = Column(String, nullable=False)  # admin, team_member, observer
    __table_args__ = (CheckConstraint("role IN ('admin','team_member','observer')", name="ck_user_role"),)

class Membership(Base):
    __tablename__ = "memberships"
    user_id = Column(String, ForeignKey("users.id"), primary_key=True)
    team_id = Column(String, ForeignKey("teams.id"), primary_key=True)

class Measurable(Base):
    __tablename__ = "measurables"
    id = Column(String, primary_key=True)
    team_id = Column(String, ForeignKey("teams.id"), nullable=False)
    name = Column(String, nullable=False)
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    unit = Column(String, nullable=False)
    goal_type = Column(String, nullable=False)
    goal_value = Column(Float, nullable=True)
    goal_min = Column(Float, nullable=True)
    goal_max = Column(Float, nullable=True)

class Score(Base):
    __tablename__ = "scores"
    id = Column(Integer, primary_key=True, autoincrement=True)
    measurable_id = Column(String, ForeignKey("measurables.id"), nullable=False)
    week_start = Column(Date, nullable=False)
    value = Column(Float, nullable=False)
    __table_args__ = (UniqueConstraint("measurable_id", "week_start", name="uq_score"),)

class Rock(Base):
    __tablename__ = "rocks"
    id = Column(String, primary_key=True)
    team_id = Column(String, ForeignKey("teams.id"), nullable=False)
    title = Column(String, nullable=False)
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    quarter = Column(String, nullable=False)
    status = Column(String, nullable=False)  # on_track/off_track/complete

class Milestone(Base):
    __tablename__ = "milestones"
    id = Column(String, primary_key=True)
    rock_id = Column(String, ForeignKey("rocks.id"), nullable=False)
    title = Column(String, nullable=False)
    due_date = Column(Date, nullable=False)
    done = Column(Boolean, nullable=False, default=False)

class Issue(Base):
    __tablename__ = "issues"
    id = Column(String, primary_key=True)
    team_id = Column(String, ForeignKey("teams.id"), nullable=False)
    title = Column(String, nullable=False)
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    priority = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)
    solved_at = Column(DateTime(timezone=True), nullable=True)
    resolution_note = Column(Text, nullable=True)
    source_measurable_id = Column(String, ForeignKey("measurables.id"), nullable=True)
    source_week_start = Column(Date, nullable=True)
    __table_args__ = (
        Index("uq_issue_unsolved_source", "team_id", "source_measurable_id", "source_week_start",
              unique=True, postgresql_where="solved_at IS NULL"),
        CheckConstraint("priority IS NULL OR (priority >= 1 AND priority <= 5)", name="ck_issue_priority"),
    )

class Todo(Base):
    __tablename__ = "todos"
    id = Column(String, primary_key=True)
    team_id = Column(String, ForeignKey("teams.id"), nullable=False)
    title = Column(String, nullable=False)
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    due_date = Column(Date, nullable=False)
    done_at = Column(DateTime(timezone=True), nullable=True)
    source_issue_id = Column(String, ForeignKey("issues.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)

class Meeting(Base):
    __tablename__ = "meetings"
    id = Column(String, primary_key=True)
    team_id = Column(String, ForeignKey("teams.id"), nullable=False)
    facilitator_id = Column(String, ForeignKey("users.id"), nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    section = Column(Integer, nullable=False, default=0)  # 0 scorecard,1 ids,2 conclude
    section_started_at = Column(DateTime(timezone=True), nullable=False)
    attendee_ids = Column(JSON, nullable=False, default=list)
    ratings = Column(JSON, nullable=False, default=dict)  # user_id -> rating
