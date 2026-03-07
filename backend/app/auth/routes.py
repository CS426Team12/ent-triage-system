from fastapi import APIRouter, Depends, HTTPException, Response, Request
from app.core.security import (verify_password, create_access_token, create_refresh_token)
from app.auth.schemas import LoginRequest, UserResponse, Token, LogoutRequest
from app.auth.dependencies import get_current_user
from app.models import User
from app.core.dependencies import get_db
from sqlmodel import Session, select
from datetime import timedelta
from app.core.redis import redis_client as redis
from app.core.config import settings
from jose import jwt
import logging
from uuid import UUID

from app.core.audit import AuditService
from app.core.audit_middleware import get_audit_meta
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Auth"])

REFRESH_COOKIE_NAME = "refresh_token"

# Login route
@router.post("/login", response_model=Token)
def login(response: Response, data: LoginRequest, db: Session = Depends(get_db), request: Request = None):
    user = db.exec(select(User).where(User.email == data.email)).first()

    if not user or not verify_password(data.password, user.passwordHash):
        # Log failed login attempt (no PHI/details)
        try:
            audit_meta = get_audit_meta(request) if request is not None else {"ip": None}
            AuditService.create_log(
                db,
                action="LOGIN_FAILURE",
                status="FAIL",
                actor_id=None,
                actor_type=None,
                resource_type="USER",
                resource_id=user.userID if user else None,
                fields_modified=None,
                ip=audit_meta.get("ip"),
            )
        except Exception:
            logger.exception("Failed to write audit log for login failure")
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token({"sub": str(user.userID), "role": user.role})
    refresh_token = create_refresh_token({"sub": str(user.userID)})

    redis.setex(f"refresh_token:{user.userID}", timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS), refresh_token)
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE, 
        samesite="none"
    )
    # Log successful login
    try:
        audit_meta = get_audit_meta(request) if request is not None else {"ip": None}
        AuditService.create_log(
            db,
            action="LOGIN_SUCCESS",
            status="SUCCESS",
            actor_id=user.userID,
            actor_type=user.role,
            resource_type="USER",
            resource_id=user.userID,
            fields_modified=None,
            ip=audit_meta.get("ip"),
        )
    except Exception:
        logger.exception("Failed to write audit log for login success")
    return Token(access_token=access_token)

# Validate refresh token and return new access token
@router.post("/refresh", response_model=Token)
def refresh(request: Request):
    refresh_cookie = request.cookies.get(REFRESH_COOKIE_NAME)
    if not refresh_cookie:
        raise HTTPException(status_code=401, detail="Refresh token missing")    
    payload = jwt.decode(
        refresh_cookie, 
        settings.REFRESH_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM]
    )
    user_id = payload.get("sub")
    
    stored_token = redis.get(f"refresh_token:{user_id}")
    if not stored_token or stored_token.decode() != refresh_cookie:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
   
    new_access_token = create_access_token({"sub": str(user_id)})
    return Token(access_token=new_access_token)

# Log user out and delete refresh token from redis and cookies
@router.post("/logout")
def logout(response: Response, data: LogoutRequest, db: Session = Depends(get_db), request: Request = None):
    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    user = db.exec(select(User).where(User.email == data.email)).first()
    user_id = user.userID if user else None
    if refresh_token:
        try:
            payload = jwt.decode(
                refresh_token, 
                settings.REFRESH_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM]
            )
            user_id = payload.get("sub")
            if user_id:
                redis.delete(f"refresh_token:{user_id}")
        except Exception:
            logger.exception("Failed to decode refresh token during logout")
    response.delete_cookie(REFRESH_COOKIE_NAME)
    # Log logout
    try:
        audit_meta = get_audit_meta(request)
        AuditService.create_log(
            db,
            action="LOGOUT",
            status="SUCCESS",
            actor_id=UUID(user_id) if user_id else None,
            actor_type=None,
            resource_type="USER",
            resource_id=UUID(user_id) if user_id else None,
            fields_modified=None,
            ip=audit_meta.get("ip"),
        )
    except Exception:
        logger.exception("Failed to write audit log for logout")
    return {"detail": "Logged out successfully"}

# Current user info route
@router.get("/me", response_model=UserResponse)
def get_current_user_info(user: User = Depends(get_current_user)):
    return {
        "userID": str(user.userID),
        "email": user.email,
        "role": user.role,
        "firstName": user.firstName,
        "lastName": user.lastName,
        "first_initial": user.firstName[0].upper() if user.firstName else ""
    }



