"""
Central configuration. All env-overridable settings live here.
Read once at startup, imported everywhere else.
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://soc:soc_password@db:5432/soc_db"

    # Auth
    secret_key: str = "dev-secret-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 hours

    # Seed user (created on first startup if not present)
    default_username: str = "analyst"
    default_password: str = "analyst123"

    # Uploads
    max_upload_size_mb: int = 50

    class Config:
        env_file = ".env"


settings = Settings()
