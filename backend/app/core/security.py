# app/core/security.py
from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext
from app.core.config import settings
from enum import Enum


class EmailTokenType(str, Enum):
    FORGOT_PASSWORD = "forgot_password"
    REGISTER = "register"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Password hashing and verification
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(raw: str, hashed: str) -> bool:
    return pwd_context.verify(raw, hashed)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.REFRESH_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def create_email_token(data: dict, token_type: EmailTokenType):
    to_encode = data.copy()
    
    # Expiration time varies by token type
    if token_type == EmailTokenType.FORGOT_PASSWORD:
        expire = datetime.utcnow() + timedelta(hours=settings.FORGOT_PASSWORD_TOKEN_EXPIRE_HOURS)
    elif token_type == EmailTokenType.REGISTER:
        expire = datetime.utcnow() + timedelta(hours=settings.REGISTER_TOKEN_EXPIRE_HOURS)
    
    to_encode.update({"exp": expire, "token_type": token_type.value})
    return jwt.encode(to_encode, settings.EMAIL_TOKEN_SECRET, algorithm=settings.JWT_ALGORITHM)
