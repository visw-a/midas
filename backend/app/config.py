from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    site_password: str = "change-me"
    secret_key: str = "change-me-too"
    database_url: str = "sqlite:///./midas.db"
    price_refresh_minutes: int = 15
    cors_origins: str = "http://localhost:5173"
    benchmark_ticker: str = "SPY"
    session_cookie_name: str = "midas_session"
    session_max_age_seconds: int = 60 * 60 * 24 * 14  # 2 weeks
    cookie_secure: bool = False  # set True once served over HTTPS in production

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
