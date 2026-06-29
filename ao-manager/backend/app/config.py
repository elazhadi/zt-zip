import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://ao_user:ao_password@localhost:5432/ao_manager"
    ANTHROPIC_API_KEY: str = ""
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 100
    SECRET_KEY: str = "ao-manager-secret-key-change-in-production-2024"

    class Config:
        env_file = ".env"


settings = Settings()
