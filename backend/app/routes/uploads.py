"""
/uploads/* routes: create (upload file), list, fetch detail, timeline.
"""
from collections import Counter
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Anomaly, LogEntry, Upload, User
from app.parser import parse_file
from app.schemas import (
    LogEntryOut,
    TimelineBucket,
    UploadCreateResponse,
    UploadDetailResponse,
    UploadStats,
    UploadSummary,
)

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("", response_model=UploadCreateResponse, status_code=status.HTTP_201_CREATED)
def upload_log_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Accept a log file, parse it, store rows. Returns upload id + row count."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    upload = Upload(filename=file.filename, user_id=user.id, row_count=0)
    db.add(upload)
    db.flush()

    entries: List[LogEntry] = []
    for row in parse_file(file.file):
        entries.append(LogEntry(upload_id=upload.id, **row))

    if not entries:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="No valid log lines found. Expected ZScaler format with key=value fields.",
        )

    db.bulk_save_objects(entries)
    upload.row_count = len(entries)
    db.commit()
    db.refresh(upload)

    return UploadCreateResponse(
        upload_id=upload.id,
        filename=upload.filename,
        row_count=upload.row_count,
    )


@router.get("", response_model=List[UploadSummary])
def list_uploads(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return (
        db.query(Upload)
        .filter(Upload.user_id == user.id)
        .order_by(Upload.uploaded_at.desc())
        .all()
    )


@router.get("/{upload_id}", response_model=UploadDetailResponse)
def get_upload_detail(
    upload_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    upload = (
        db.query(Upload)
        .filter(Upload.id == upload_id, Upload.user_id == user.id)
        .first()
    )
    if upload is None:
        raise HTTPException(status_code=404, detail="Upload not found")

    entries = (
        db.query(LogEntry)
        .filter(LogEntry.upload_id == upload_id)
        .order_by(LogEntry.timestamp.asc())
        .all()
    )

    stats = _compute_stats(entries)
    return UploadDetailResponse(
        upload=UploadSummary.model_validate(upload),
        stats=stats,
        entries=[LogEntryOut.model_validate(e) for e in entries],
    )


@router.get("/{upload_id}/timeline", response_model=List[TimelineBucket])
def get_upload_timeline(
    upload_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Return events-per-hour aggregated server-side via SQL.

    Why server-side: at 1M events the frontend can't loop through all rows
    just to draw 24 bars. Postgres does the bucketing in O(log n) per row
    with the index on (upload_id, timestamp), then returns ~24 small rows.
    """
    upload = (
        db.query(Upload)
        .filter(Upload.id == upload_id, Upload.user_id == user.id)
        .first()
    )
    if upload is None:
        raise HTTPException(status_code=404, detail="Upload not found")

    # Hourly bucket of total events
    hour = func.date_trunc("hour", LogEntry.timestamp).label("hour")
    event_rows = (
        db.query(hour, func.count(LogEntry.id).label("count"))
        .filter(LogEntry.upload_id == upload_id)
        .group_by(hour)
        .order_by(hour)
        .all()
    )

    # Hourly bucket of anomalies (joined to log_entries to bucket by event time)
    anom_hour = func.date_trunc("hour", LogEntry.timestamp).label("hour")
    anom_rows = (
        db.query(anom_hour, func.count(Anomaly.id).label("count"))
        .join(LogEntry, Anomaly.log_entry_id == LogEntry.id)
        .filter(Anomaly.upload_id == upload_id)
        .group_by(anom_hour)
        .order_by(anom_hour)
        .all()
    )
    anom_by_hour = {row.hour: row.count for row in anom_rows}

    return [
        TimelineBucket(
            hour=row.hour,
            total_events=row.count,
            anomaly_count=anom_by_hour.get(row.hour, 0),
        )
        for row in event_rows
    ]


def _compute_stats(entries: List[LogEntry]) -> UploadStats:
    if not entries:
        return UploadStats(
            total_events=0,
            unique_users=0,
            unique_ips=0,
            unique_destinations=0,
            blocked_count=0,
        )

    users = {e.username for e in entries if e.username}
    ips = {e.src_ip for e in entries if e.src_ip}
    dsts = {e.dst for e in entries if e.dst}
    blocked = sum(1 for e in entries if (e.action or "").lower() == "blocked")
    timestamps = [e.timestamp for e in entries if e.timestamp]
    category_counts = Counter(e.category for e in entries if e.category)
    top = [{"category": c, "count": n} for c, n in category_counts.most_common(5)]

    return UploadStats(
        total_events=len(entries),
        unique_users=len(users),
        unique_ips=len(ips),
        unique_destinations=len(dsts),
        blocked_count=blocked,
        time_range_start=min(timestamps) if timestamps else None,
        time_range_end=max(timestamps) if timestamps else None,
        top_categories=top,
    )
