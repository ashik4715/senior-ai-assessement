import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from fastapi.testclient import TestClient
from app.main import app

def H(uid): return {"X-User-Id": uid}

def test_team_member_cannot_read_other_team(client):
    # u2 is member of team_lead and team_sales, not team_ops
    r = client.get("/api/teams/team_ops/measurables", headers=H("u2"))
    assert r.status_code in (403, 404)

def test_observer_write_refused(client):
    r = client.post("/api/teams/team_lead/issues", headers=H("u5"), json={"title": "x"})
    assert r.status_code == 403

def test_concurrent_make_issue(client):
    import threading
    results = []
    def worker():
        r = client.post("/api/teams/team_lead/issues/from-measurable", headers=H("u2"), json={"measurable_id":"m1","week_start":"2026-10-05"})
        results.append(r.json()["id"])
    ts = [threading.Thread(target=worker) for _ in range(5)]
    for t in ts: t.start()
    for t in ts: t.join()
    assert len(set(results)) == 1
