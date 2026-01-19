#!/usr/bin/env python3
"""Extract docsDef.json from a plain-text checklist or HTML-ish text.

Design goals:
- Safe by default (read-only, no destructive actions)
- Deterministic output (stable IDs)
- Minimal dependencies (stdlib only)

Usage:
  python extract_docsdef.py --in checklist.txt --out docsDef.json \
    --default-lead-days 4 --default-trigger loadout --business-days
"""

import argparse
import json
import re
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Tuple


def slugify(text: str) -> str:
    t = text.lower()
    t = re.sub(r"<[^>]+>", " ", t)  # strip html tags
    t = re.sub(r"[^a-z0-9]+", "-", t).strip("-")
    t = re.sub(r"-+", "-", t)
    return t[:64] if len(t) > 64 else t


def infer_category(title: str) -> str:
    u = title.lower()
    if "ptw" in u or "permit" in u:
        return "PTW"
    if "risk assessment" in u or "hse" in u:
        return "HSE"
    if "stowage" in u or "lashing" in u or "stability" in u or "mooring" in u:
        return "Marine"
    if "certificate" in u or "cert" in u:
        return "Certificates"
    if "cargo" in u or "loading" in u:
        return "Cargo"
    return "General"


def parse_lines(raw: str) -> List[str]:
    # Normalize line breaks, remove obvious empty lines
    lines = [ln.strip() for ln in raw.replace("\r\n", "\n").replace("\r", "\n").split("\n")]
    lines = [ln for ln in lines if ln]

    # If looks like HTML list, try extracting <li>...</li>
    li = re.findall(r"<li[^>]*>(.*?)</li>", raw, flags=re.IGNORECASE | re.DOTALL)
    if li:
        cleaned = [re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", x)).strip() for x in li]
        return [x for x in cleaned if x]

    items: List[str] = []
    for ln in lines:
        # Remove leading numbering or bullets
        ln2 = re.sub(r"^\s*(?:\d+\.|\d+\)|[-*•])\s+", "", ln)
        # Skip obvious headers
        if re.match(r"^(dear|regards|please find|also please|reference)\b", ln2.lower()):
            continue
        # Keep reasonably short lines as items; merge too-short fragments later
        items.append(ln2.strip())

    # Merge lines that are clearly continuations (rare in checklists)
    merged: List[str] = []
    buf = ""
    for it in items:
        if not buf:
            buf = it
            continue
        # If current line starts with '(' or 'incl' or 'including', treat as continuation
        if re.match(r"^(\(|incl\.?|including)\b", it.lower()):
            buf = f"{buf} {it}".strip()
        else:
            merged.append(buf)
            buf = it
    if buf:
        merged.append(buf)

    # De-duplicate while preserving order
    seen = set()
    out: List[str] = []
    for m in merged:
        key = m.lower()
        if key not in seen:
            out.append(m)
            seen.add(key)
    return out


def build_docs(items: List[str], default_lead_days: int, default_trigger: str, business_days: bool) -> List[Dict]:
    docs = []
    used_ids = set()
    for title in items:
        base = slugify(title)
        if not base:
            continue
        doc_id = base
        i = 2
        while doc_id in used_ids:
            doc_id = f"{base}-{i}"
            i += 1
        used_ids.add(doc_id)
        docs.append(
            {
                "docId": doc_id,
                "title": title,
                "category": infer_category(title),
                "leadDays": int(default_lead_days),
                "triggerMilestone": default_trigger,
                "businessDays": bool(business_days),
                "mandatory": True,
            }
        )
    return docs


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp", required=True, help="Input checklist text or HTML file")
    ap.add_argument("--out", dest="out", required=True, help="Output docsDef.json")
    ap.add_argument("--default-lead-days", type=int, default=4)
    ap.add_argument("--default-trigger", default="loadout", choices=["mzpArrival", "loadout", "sailAway", "agiArrival"])
    ap.add_argument("--business-days", action="store_true")
    args = ap.parse_args()

    raw = Path(args.inp).read_text(encoding="utf-8", errors="ignore")
    items = parse_lines(raw)
    docs = build_docs(items, args.default_lead_days, args.default_trigger, args.business_days)

    payload = {
        "meta": {
            "generatedAt": datetime.utcnow().isoformat(timespec="seconds") + "Z",
            "source": str(Path(args.inp).name),
            "count": len(docs),
        },
        "docsDef": docs,
    }
    Path(args.out).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
