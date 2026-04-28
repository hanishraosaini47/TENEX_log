"""
Database tables as SQLAlchemy ORM models.

4 tables:
  User        - who can log in
  Upload      - each file uploaded (metadata)
  LogEntry    - parsed rows from each upload
  Anomaly     - flagged entries (Phase 2)
"""
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    Index,
)
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    uploads = relationship("Upload", back_populates="user", cascade="all, delete-orphan")


class Upload(Base):
    __tablename__ = "uploads"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    row_count = Column(Integer, default=0)
    analyzed = Column(Boolean, default=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    user = relationship("User", back_populates="uploads")
    entries = relationship("LogEntry", back_populates="upload", cascade="all, delete-orphan")
    anomalies = relationship("Anomaly", back_populates="upload", cascade="all, delete-orphan")


class LogEntry(Base):
    __tablename__ = "log_entries"

    id = Column(Integer, primary_key=True, index=True)
    upload_id = Column(Integer, ForeignKey("uploads.id"), nullable=False)
    timestamp = Column(DateTime, nullable=False)
    username = Column(String(128))        # from log, not our auth user
    src_ip = Column(String(45))
    dst = Column(String(255))
    bytes_transferred = Column(Integer, default=0)
    status = Column(Integer, default=0)
    category = Column(String(64))
    action = Column(String(32))           # Allowed / Blocked

    upload = relationship("Upload", back_populates="entries")
    anomalies = relationship("Anomaly", back_populates="log_entry", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_log_entries_upload_ts", "upload_id", "timestamp"),
    )


class Anomaly(Base):
    __tablename__ = "anomalies"

    id = Column(Integer, primary_key=True, index=True)
    upload_id = Column(Integer, ForeignKey("uploads.id"), nullable=False, index=True)
    log_entry_id = Column(Integer, ForeignKey("log_entries.id"), nullable=False)
    reason = Column(Text, nullable=False)
    confidence = Column(Float, nullable=False)          # 0.0 - 1.0
    method = Column(String(32), nullable=False)         # 'rule' | 'statistical' | 'ml'
    detected_at = Column(DateTime, default=datetime.utcnow)

    upload = relationship("Upload", back_populates="anomalies")
    log_entry = relationship("LogEntry", back_populates="anomalies")
