"""
FastAPI entry point.

  - Creates tables on startup (simple approach; real apps use Alembic).
  - Seeds a default user so Phase 1 works out of the box.
  - Mounts all route modules.
  - Allows CORS from the Vite dev server.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth import hash_password
from app.config import settings
from app.database import Base, SessionLocal, engine
from app.models import User
from app.routes import anomalies as anomaly_routes
from app.routes import auth as auth_routes
from app.routes import uploads as upload_routes


def create_app() -> FastAPI:
    app = FastAPI(
        title="SOC Log Analyzer API",
        version="1.0.0",
        description="Upload web-proxy logs, get parsed events and anomaly findings.",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # dev only; lock down in prod
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth_routes.router)
    app.include_router(upload_routes.router)
    app.include_router(anomaly_routes.router)

    @app.on_event("startup")
    def on_startup():
        Base.metadata.create_all(bind=engine)
        _seed_default_user()

    @app.get("/health", tags=["health"])
    def health():
        return {"status": "ok"}

    return app


def _seed_default_user():
    """Create the default 'analyst' user if it doesn't exist."""
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.username == settings.default_username).first()
        if existing is None:
            db.add(User(
                username=settings.default_username,
                password_hash=hash_password(settings.default_password),
            ))
            db.commit()
    finally:
        db.close()


app = create_app()
