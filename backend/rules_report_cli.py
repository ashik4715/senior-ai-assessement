import os, json, sys
sys.path.insert(0, os.path.dirname(__file__))
from app.db import SessionLocal
from app.rules_report import build_rules_report

def main():
    db = SessionLocal()
    try:
        report = build_rules_report(db)
        print(json.dumps(report, indent=2, default=str))
    finally:
        db.close()

if __name__ == "__main__":
    main()
