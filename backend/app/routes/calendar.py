import uuid
import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Depends, Request
from sqlmodel import Session, select
from pydantic import BaseModel

from app.core.dependencies import get_db
from app.auth.dependencies import get_current_user
from app.core.audit import AuditService
from app.core.audit_middleware import get_audit_meta
from app.models import User
from app.core.gcal import calendar_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/calendar", tags=["calendar"])

DEFAULT_CALENDAR_COLOR = "#0B8043"  # Sage

class CalendarColorUpdate(BaseModel):
    color: str  # hex e.g. "#0B8043"

@router.post("/physicians/{physician_id}/create", status_code=201)
def create_physician_calendar(
    physician_id: uuid.UUID,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
    request:      Request = None,
) -> Any:
    logger.info(f"POST /calendar/physicians/{physician_id}/create - user: {current_user.email}")

    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create physician calendars")

    try:
        physician = db.get(User, physician_id)
        if not physician:
            raise HTTPException(status_code=404, detail="Physician not found")
        if physician.role != "physician":
            raise HTTPException(status_code=400, detail="User is not a physician")
        if physician.calendarID:
            raise HTTPException(status_code=409, detail="Physician already has a calendar")

        color = DEFAULT_CALENDAR_COLOR

        cal = calendar_service.calendars().insert(body={
            "summary":  f"Dr. {physician.firstName} {physician.lastName}",
            "timeZone": "America/Los_Angeles",
        }).execute()

        gcal_calendar_id = cal["id"]

        calendar_service.calendarList().patch(
            calendarId=gcal_calendar_id,
            body={
                "backgroundColor": color,
                "foregroundColor": "#ffffff",
            },
            colorRgbFormat=True,
        ).execute()

        # make publicly readable for embed
        calendar_service.acl().insert(
            calendarId=gcal_calendar_id,
            body={"role": "reader", "scope": {"type": "default"}},
        ).execute()

        physician.calendarID    = gcal_calendar_id
        physician.calendarColor = color
        db.add(physician)
        db.commit()
        db.refresh(physician)

        try:
            audit_meta = get_audit_meta(request) if request is not None else {"ip": None}
            AuditService.create_log(
                db,
                action="CREATE_PHYSICIAN_CALENDAR",
                status="SUCCESS",
                actor_id=current_user.userID,
                actor_type=current_user.role,
                resource_type="USER",
                resource_id=physician.userID,
                fields_modified=["calendarID", "calendarColor"],
                ip=audit_meta.get("ip"),
            )
        except Exception:
            logger.exception("Failed to write audit log for create_physician_calendar")

        return {
            "calendarID":    gcal_calendar_id,
            "calendarColor": color,
            "physicianName": f"Dr. {physician.firstName} {physician.lastName}",
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.exception(f"POST /calendar/physicians/{physician_id}/create - Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create physician calendar")

@router.patch("/physicians/{physician_id}/color")
def update_calendar_color(
    physician_id: uuid.UUID,
    payload:      CalendarColorUpdate,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
    request:      Request = None,
) -> Any:
    logger.info(f"PATCH /calendar/physicians/{physician_id}/color - user: {current_user.email}")

    # physician can only update their own; admin can update any
    if current_user.role not in ("admin", "physician"):
        raise HTTPException(status_code=403, detail="Not authorized")
    if current_user.role == "physician" and current_user.userID != physician_id:
        raise HTTPException(status_code=403, detail="Physicians can only update their own calendar color")

    try:
        physician = db.get(User, physician_id)
        if not physician:
            raise HTTPException(status_code=404, detail="Physician not found")
        if not physician.calendarID:
            raise HTTPException(status_code=400, detail="Physician has no calendar — create one first")

        if not payload.color.startswith("#") or len(payload.color) != 7:
            raise HTTPException(status_code=422, detail="Color must be a valid hex value e.g. #0B8043")

        # update color on Google Calendar
        calendar_service.calendarList().patch(
            calendarId=physician.calendarID,
            body={
                "backgroundColor": payload.color,
                "foregroundColor": "#ffffff",
            },
            colorRgbFormat=True,
        ).execute()

        old_color = physician.calendarColor
        physician.calendarColor = payload.color
        db.add(physician)
        db.commit()

        try:
            audit_meta = get_audit_meta(request) if request is not None else {"ip": None}
            AuditService.create_log(
                db,
                action="UPDATE_CALENDAR_COLOR",
                status="SUCCESS",
                actor_id=current_user.userID,
                actor_type=current_user.role,
                resource_type="USER",
                resource_id=physician.userID,
                fields_modified=["calendarColor"],
                ip=audit_meta.get("ip"),
            )
        except Exception:
            logger.exception("Failed to write audit log for update_calendar_color")

        return {
            "calendarColor": payload.color,
            "previousColor": old_color,
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.exception(f"PATCH /calendar/physicians/{physician_id}/color - Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update calendar color")