"""
Anomaly detection engine (Phase 2 / bonus).

Three independent detectors run over the parsed log entries:

  1. Rule-based     — hardcoded SOC rules. High precision, explainable.
  2. Statistical    — z-score on per-user request rate + per-user bytes.
                      Catches volume spikes / exfiltration-like behaviour.
  3. Isolation Forest — unsupervised ML on engineered features. Catches
                      subtle multi-dimensional outliers a single rule misses.

All three produce Anomaly rows with a reason string, a confidence score
(0.0-1.0), and a method label so the UI can badge them.

On the orchestrator side, if multiple detectors flag the same log entry
we keep the highest-confidence record (one row per entry).
"""
from collections import defaultdict
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sqlalchemy.orm import Session

from app.models import Anomaly, LogEntry, Upload

# --- Rule config ---
SUSPICIOUS_CATEGORIES = {
    "malware", "phishing", "c2", "command-and-control",
    "spyware", "botnet", "exploit", "ransomware",
}
LARGE_TRANSFER_BYTES = 5_000_000  # 5 MB in a single request is unusual


# ---------------- Layer 1: rule-based ----------------

def detect_rule_based(entries: List[LogEntry]) -> Dict[int, Tuple[str, float]]:
    """Return {log_entry_id: (reason, confidence)} for rule hits."""
    hits: Dict[int, Tuple[str, float]] = {}
    for e in entries:
        reasons = []
        confidence = 0.0

        cat = (e.category or "").lower()
        if cat in SUSPICIOUS_CATEGORIES:
            reasons.append(f"Category '{e.category}' is a known threat class")
            confidence = max(confidence, 0.95)

        if (e.action or "").lower() == "blocked":
            reasons.append("Proxy blocked the request")
            confidence = max(confidence, 0.90)

        if e.bytes_transferred and e.bytes_transferred >= LARGE_TRANSFER_BYTES:
            mb = e.bytes_transferred / 1_000_000
            reasons.append(f"Large single transfer ({mb:.1f} MB) — potential exfiltration")
            confidence = max(confidence, 0.85)

        if e.status and e.status >= 500:
            reasons.append(f"Server error {e.status} — possible probing")
            confidence = max(confidence, 0.60)

        if reasons:
            hits[e.id] = ("; ".join(reasons), confidence)
    return hits


# ---------------- Layer 2: statistical ----------------

def detect_statistical(entries: List[LogEntry]) -> Dict[int, Tuple[str, float]]:
    """Flag users with request-rate or byte-volume spikes vs their own baseline."""
    hits: Dict[int, Tuple[str, float]] = {}
    if len(entries) < 10:
        return hits

    # Per-user: count requests and sum bytes
    by_user = defaultdict(list)  # username -> list of entries
    for e in entries:
        if e.username:
            by_user[e.username].append(e)

    # Global baselines
    req_counts = np.array([len(v) for v in by_user.values()])
    if req_counts.size < 2:
        return hits

    req_mean, req_std = req_counts.mean(), req_counts.std()

    byte_totals = np.array([sum(x.bytes_transferred or 0 for x in v) for v in by_user.values()])
    byte_mean, byte_std = byte_totals.mean(), byte_totals.std()

    for username, user_entries in by_user.items():
        # Request-rate outlier
        if req_std > 0:
            z_req = (len(user_entries) - req_mean) / req_std
            if z_req > 3:
                # Flag this user's highest-volume minute: pick a representative entry
                rep = user_entries[len(user_entries) // 2]
                reason = (
                    f"User '{username}' made {len(user_entries)} requests "
                    f"(baseline avg {req_mean:.0f}, z-score {z_req:.1f})"
                )
                conf = min(0.99, 0.70 + 0.05 * (z_req - 3))
                _keep_max(hits, rep.id, reason, conf)

        # Byte-volume outlier
        user_bytes = sum(x.bytes_transferred or 0 for x in user_entries)
        if byte_std > 0:
            z_byte = (user_bytes - byte_mean) / byte_std
            if z_byte > 3:
                rep = max(user_entries, key=lambda x: x.bytes_transferred or 0)
                mb = user_bytes / 1_000_000
                reason = (
                    f"User '{username}' transferred {mb:.1f} MB "
                    f"(baseline avg {byte_mean/1_000_000:.2f} MB, z-score {z_byte:.1f})"
                )
                conf = min(0.99, 0.70 + 0.05 * (z_byte - 3))
                _keep_max(hits, rep.id, reason, conf)

    return hits


# ---------------- Layer 3: Isolation Forest ----------------

def detect_ml(entries: List[LogEntry]) -> Dict[int, Tuple[str, float]]:
    """Isolation Forest on engineered features. Needs a minimum sample size."""
    hits: Dict[int, Tuple[str, float]] = {}
    if len(entries) < 30:
        return hits  # Too few samples to train meaningfully

    df = pd.DataFrame([
        {
            "id": e.id,
            "bytes": float(e.bytes_transferred or 0),
            "status": float(e.status or 0),
            "hour": e.timestamp.hour if e.timestamp else 0,
            "is_blocked": 1.0 if (e.action or "").lower() == "blocked" else 0.0,
        }
        for e in entries
    ])

    features = df[["bytes", "status", "hour", "is_blocked"]].values

    model = IsolationForest(
        n_estimators=100,
        contamination=0.05,   # expect ~5% anomalies
        random_state=42,
    )
    model.fit(features)

    preds = model.predict(features)        # -1 = anomaly, 1 = normal
    scores = model.decision_function(features)  # lower = more anomalous

    # Normalize scores for confidence: more-negative -> higher confidence
    min_s, max_s = scores.min(), scores.max()
    score_range = max_s - min_s if max_s > min_s else 1.0

    for i, (pred, raw_score) in enumerate(zip(preds, scores)):
        if pred != -1:
            continue
        norm = (max_s - raw_score) / score_range  # 0..1, higher = more anomalous
        confidence = float(min(0.90, 0.60 + 0.30 * norm))
        entry_id = int(df.iloc[i]["id"])
        reason = (
            "Multi-feature outlier (Isolation Forest): combination of "
            f"bytes={int(df.iloc[i]['bytes'])}, status={int(df.iloc[i]['status'])}, "
            f"hour={int(df.iloc[i]['hour'])} is unusual vs this dataset"
        )
        hits[entry_id] = (reason, confidence)

    return hits


# ---------------- Orchestrator ----------------

def _keep_max(d: Dict[int, Tuple[str, float]], key: int, reason: str, conf: float) -> None:
    existing = d.get(key)
    if existing is None or conf > existing[1]:
        d[key] = (reason, conf)


def run_all(upload_id: int, db: Session) -> Dict[str, int]:
    """Run all detectors on one upload's entries, persist anomalies.

    Returns a count-by-method dict for the response.
    """
    upload = db.query(Upload).filter(Upload.id == upload_id).first()
    if upload is None:
        raise ValueError(f"Upload {upload_id} not found")

    # Clear any prior anomalies for this upload so we can re-run idempotently
    db.query(Anomaly).filter(Anomaly.upload_id == upload_id).delete()
    db.flush()

    entries = db.query(LogEntry).filter(LogEntry.upload_id == upload_id).all()

    rule_hits = detect_rule_based(entries)
    stat_hits = detect_statistical(entries)
    ml_hits = detect_ml(entries)

    # Combine: for each entry, keep the highest-confidence finding but label it
    # with the method that won. We also create one row per detector hit so the
    # UI can show layered detection if desired -- simpler here: one row per entry.
    final: Dict[int, Tuple[str, float, str]] = {}
    for eid, (reason, conf) in rule_hits.items():
        final[eid] = (reason, conf, "rule")
    for eid, (reason, conf) in stat_hits.items():
        cur = final.get(eid)
        if cur is None or conf > cur[1]:
            final[eid] = (reason, conf, "statistical")
    for eid, (reason, conf) in ml_hits.items():
        cur = final.get(eid)
        if cur is None or conf > cur[1]:
            final[eid] = (reason, conf, "ml")

    counts = {"rule": 0, "statistical": 0, "ml": 0}
    for eid, (reason, conf, method) in final.items():
        db.add(Anomaly(
            upload_id=upload_id,
            log_entry_id=eid,
            reason=reason,
            confidence=conf,
            method=method,
        ))
        counts[method] += 1

    upload.analyzed = True
    db.commit()
    return counts
