#!/usr/bin/env python3
"""Compute dueAt and risk for each document based on voyage milestones.

Input:
- voyage.json: {"voyageId": "V071", "milestones": {...}}
- docsDef.json: either {"docsDef": [...]} or [...] (list)

Output:
- docsComputed.json: list of computed doc items with dueAt and risk

Risk logic (default):
- OVERDUE: dueAt < now
- AT_RISK: 0 <= (dueAt - now) <= at_risk_days
- ON_TRACK: otherwise
- PENDING_MILESTONE: anchor milestone missing
"""

import argparse
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional


def parse_iso(dt: str) -> datetime:
    # Python fromisoformat supports "+04:00" offsets
    return datetime.fromisoformat(dt)


def is_weekend(d: datetime) -> bool:
    return d.weekday() >= 5  # 5 Sat, 6 Sun


def sub_business_days(anchor: datetime, days: int) -> datetime:
    d = anchor
    left = days
    while left > 0:
        d = d - timedelta(days=1)
        if not is_weekend(d):
            left -= 1
    return d


def load_docs(path: str) -> List[Dict[str, Any]]:
    obj = json.loads(Path(path).read_text(encoding="utf-8"))
    if isinstance(obj, list):
        return obj
    if isinstance(obj, dict) and "docsDef" in obj:
        return obj["docsDef"]
    raise ValueError("docsDef.json must be a list or a dict containing 'docsDef'")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--voyage", required=True)
    ap.add_argument("--docs", required=True)
    ap.add_argument("--now", required=True, help="ISO datetime with offset, e.g. 2026-01-19T12:00:00+04:00")
    ap.add_argument("--out", required=True)
    ap.add_argument("--at-risk-days", type=float, default=1.0)
    args = ap.parse_args()

    voyage = json.loads(Path(args.voyage).read_text(encoding="utf-8"))
    voyage_id = voyage.get("voyageId") or voyage.get("id") or "UNKNOWN"
    milestones = voyage.get("milestones", {})

    docs = load_docs(args.docs)
    now = parse_iso(args.now)

    computed: List[Dict[str, Any]] = []
    for doc in docs:
        trigger = doc.get("triggerMilestone")
        anchor_iso = milestones.get(trigger) if trigger else None
        out = dict(doc)
        out["voyageId"] = voyage_id

        if not anchor_iso:
            out["dueAt"] = None
            out["risk"] = "PENDING_MILESTONE"
            computed.append(out)
            continue

        anchor = parse_iso(anchor_iso)
        lead_days = int(doc.get("leadDays", 0))
        if doc.get("businessDays"):
            due = sub_business_days(anchor, lead_days)
        else:
            due = anchor - timedelta(days=lead_days)

        out["dueAt"] = due.isoformat()
        delta_days = (due - now).total_seconds() / 86400.0
        if delta_days < 0:
            risk = "OVERDUE"
        elif delta_days <= float(args.at_risk_days):
            risk = "AT_RISK"
        else:
            risk = "ON_TRACK"
        out["risk"] = risk
        computed.append(out)

    payload = {
        "meta": {
            "voyageId": voyage_id,
            "generatedAt": datetime.utcnow().isoformat(timespec="seconds") + "Z",
            "count": len(computed),
            "atRiskDays": float(args.at_risk_days),
        },
        "docsComputed": computed,
        "atRiskQueue": [d for d in computed if d.get("risk") in ("AT_RISK", "OVERDUE")],
    }

    Path(args.out).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
