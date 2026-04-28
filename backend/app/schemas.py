"""
Pydantic schemas. These define the API contract:
what the backend accepts and returns over HTTP.

Kept separate from SQLAlchemy models so the DB shape and the wire shape
can evolve independently.
"""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------- Auth ----------

class LoginRequest(BaseModel):
    username: str
    password: str


class SignupRequest(BaseModel):
    """Validation rules enforced by Pydantic before the route runs.

    - username: 3-64 chars, alphanumerics + underscore/dot/hyphen only
    - password: 6-128 chars, no other rules (real systems would do more)
    """
    username: str = Field(
        ...,
        min_length=3,
        max_length=64,
        pattern=r"^[a-zA-Z0-9_.\-]+$",
    )
    password: str = Field(..., min_length=6, max_length=128)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str


# ---------- Uploads ----------

class UploadSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    uploaded_at: datetime
    row_count: int
    analyzed: bool


class UploadCreateResponse(BaseModel):
    upload_id: int
    filename: str
    row_count: int


# ---------- Log entries ----------

class LogEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    timestamp: datetime
    username: Optional[str] = None
    src_ip: Optional[str] = None
    dst: Optional[str] = None
    bytes_transferred: int = 0
    status: int = 0
    category: Optional[str] = None
    action: Optional[str] = None


class UploadStats(BaseModel):
    total_events: int
    unique_users: int
    unique_ips: int
    unique_destinations: int
    blocked_count: int
    time_range_start: Optional[datetime] = None
    time_range_end: Optional[datetime] = None
    top_categories: List[dict] = []


class UploadDetailResponse(BaseModel):
    upload: UploadSummary
    stats: UploadStats
    entries: List[LogEntryOut]


# ---------- Timeline ----------

class TimelineBucket(BaseModel):
    """One hourly bucket for the timeline chart."""
    hour: datetime
    total_events: int
    anomaly_count: int


# ---------- Anomalies ----------

class AnomalyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    log_entry_id: int
    reason: str
    confidence: float
    method: str
    detected_at: datetime
    log_entry: LogEntryOut


class AnalyzeResponse(BaseModel):
    upload_id: int
    anomaly_count: int
    by_method: dict
