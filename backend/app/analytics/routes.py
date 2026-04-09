from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
from app.core.dependencies import get_db
from app.auth.dependencies import get_current_user
from app.analytics.service import get_ai_analytics
from app.analytics.schemas import AIAnalyticsResponse
from app.models import User


router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/ai", response_model=AIAnalyticsResponse)
def ai_feedback_analytics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.isAdmin: # Not sure if this is the right permission check, but we want to restrict access to this endpoint
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized"
        )
    return get_ai_analytics(db)

