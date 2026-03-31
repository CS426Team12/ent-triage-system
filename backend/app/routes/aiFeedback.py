import uuid
import logging
from typing import Any, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from app.core.dependencies import get_db
from app.auth.dependencies import get_current_user
from app.models import ( AIFeedback, AIFeedbackCreate, AIFeedbackPublic, User, TriageCase)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/feedback", tags=["AIFeedback"])

@router.post("/", response_model=AIFeedbackPublic)
def save_feedback(
    payload: AIFeedbackCreate,
    session: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    case = session.get(TriageCase, payload.caseID)
    if not case:
        raise HTTPException(404, "Case not found")
    existing = session.exec(
        select(AIFeedback).where(
            AIFeedback.caseID == payload.caseID,
            AIFeedback.createdBy == current_user.userID
        )
    ).first()

    if existing:
        # Update
        existing.rating = payload.rating
        existing.updatedAt = datetime.utcnow()
        
        # Clear tags and comment if rating is updated to "up" or if rating is removed (set to None)
        if payload.rating == "up" or payload.rating == None:
            existing.tags = []
            existing.comment = None

        else:
            existing.tags = payload.tags
            existing.comment = payload.comment


        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing

    # Create
    feedback = AIFeedback(
        caseID=payload.caseID,
        createdBy=current_user.userID,
        rating=payload.rating,
        tags=payload.tags,
        comment=payload.comment,
    )

    session.add(feedback)
    session.commit()
    session.refresh(feedback)

    return feedback


@router.get("/case/{case_id}", response_model=Optional[AIFeedbackPublic])
def get_feedback_for_case(
    case_id: uuid.UUID,
    session: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    feedback = session.exec(
        select(AIFeedback).where(
            AIFeedback.caseID == case_id,
            AIFeedback.createdBy == current_user.userID
        )
    ).first()

    return feedback