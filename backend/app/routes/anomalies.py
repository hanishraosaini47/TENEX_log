"""
/uploads/{id}/analyze  -- run all detectors
/uploads/{id}/anomalies -- list results
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.anomaly import run_all
from app.auth import get_current_user
from app.database import get_db
from app.models import Anomaly, Upload, User
from app.schemas import AnalyzeResponse, AnomalyOut, LogEntryOut

router = APIRouter(prefix="/uploads", tags=["anomalies"])


@router.post("/{upload_id}/analyze", response_model=AnalyzeResponse)
def analyze_upload(
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

    counts = run_all(upload_id, db)
    total = sum(counts.values())
    return AnalyzeResponse(upload_id=upload_id, anomaly_count=total, by_method=counts)


@router.get("/{upload_id}/anomalies", response_model=List[AnomalyOut])
def list_anomalies(
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

    anomalies = (
        db.query(Anomaly)
        .options(joinedload(Anomaly.log_entry))
        .filter(Anomaly.upload_id == upload_id)
        .order_by(Anomaly.confidence.desc())
        .all()
    )

    return [
        AnomalyOut(
            id=a.id,
            log_entry_id=a.log_entry_id,
            reason=a.reason,
            confidence=a.confidence,
            method=a.method,
            detected_at=a.detected_at,
            log_entry=LogEntryOut.model_validate(a.log_entry),
        )
        for a in anomalies
    ]
