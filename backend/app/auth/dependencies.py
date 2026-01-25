from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from app.core.config import settings
from app.models import User
from app.core.dependencies import get_db
from app.core.security import EmailTokenType
from sqlmodel import Session

oauth_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth_scheme),
    db: Session = Depends(get_db)
) -> User:
    try:
        payload = jwt.decode(
            token, 
            settings.JWT_SECRET_KEY, 
            algorithms=[settings.JWT_ALGORITHM]
        )
        user_id = payload.get("sub")

        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")

        user = db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return user

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

def verify_email_token(token: str, expected_type: EmailTokenType):
    try:
        payload = jwt.decode(
            token,
            settings.EMAIL_TOKEN_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )
        payload_type = payload.get("token_type")
        if payload_type != expected_type.value:
            raise HTTPException(status_code=401, detail="Invalid token type")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
