from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    JWT_SECRET_KEY: str = "access-secret"
    JWT_ALGORITHM: str = "HS256"
    REFRESH_SECRET_KEY: str = "refresh-secret"
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    COOKIE_SECURE: bool = True
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ALLOWED_ORIGINS: list = ["http://localhost:5173", "https://team12.unr.dev"]    
    REDIS_URL: str
    
    DB_USER: str
    DB_PW: str
    DB_HOST: str
    DB_PORT: str = "5432"
    DB_NAME: str

    EMAIL_TOKEN_SECRET: str = "email-token-secret"
    FORGOT_PASSWORD_TOKEN_EXPIRE_HOURS: int = 2
    REGISTER_TOKEN_EXPIRE_HOURS: int = 48
    SET_PASSWORD_URL: str
    
    RESEND_API_KEY: str
    TEST_EMAIL_RECIPIENT: str
    EMAIL_SENDER: str
    
    
    GCAL_CLIENT_EMAIL: str
    GCAL_PRIVATE_KEY: str
    
    AWS_ACCESS_KEY_ID: str
    AWS_SECRET_ACCESS_KEY: str
    AWS_REGION: str
    S3_BUCKET_NAME: str

    @property
    def SQLALCHEMY_DATABASE_URL(self) -> str:
        return f"postgresql://{self.DB_USER}:{self.DB_PW}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()