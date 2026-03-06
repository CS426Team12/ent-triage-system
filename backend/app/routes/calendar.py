import uuid
import logging
from typing import Any, Optional
from zoneinfo import ZoneInfo
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, HTTPException, Depends, Request, Query
from sqlmodel import Session, select
from pydantic import BaseModel

from app.core.dependencies import get_db
from app.auth.dependencies import get_current_user
from app.core.audit import AuditService
from app.core.audit_middleware import get_audit_meta
from app.utils.changelog import log_changes
from app.models import User, TriageCase, TriageCaseChangelog, Patient
from app.core.gcal import calendar_service
from app.models.appointments import Appointment, AppointmentCreate, AppointmentReschedule, AppointmentCancel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/calendar", tags=["calendar"])

DEFAULT_CALENDAR_COLOR = "#0B8043"  # Basil

CLINIC_TZ = ZoneInfo("America/Los_Angeles")

HEX_TO_COLOR_ID: dict[str, str] = {
    "#7986cb": "1",   # Lavender
    "#33b679": "2",   # Sage
    "#8e24aa": "3",   # Grape
    "#e67c73": "4",   # Flamingo
    "#f6bf26": "5",   # Banana
    "#f4511e": "6",   # Tangerine
    "#039be5": "7",   # Peacock
    "#616161": "8",   # Graphite
    "#3f51b5": "9",   # Blueberry
    "#0b8043": "10",  # Basil
    "#d50000": "11",  # Tomato
}

def _color_id_for(hex_color: str) -> str | None:
    return HEX_TO_COLOR_ID.get(hex_color.lower())

def normalize_to_clinic_tz(dt: datetime) -> datetime:
    """Attach clinic timezone to naive datetimes. If already tz-aware, convert to clinic tz."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=CLINIC_TZ)
    return dt.astimezone(CLINIC_TZ)

class CalendarColorUpdate(BaseModel):
    color: str  # hex e.g. "#0B8043"

class CalendarAttach(BaseModel):
    calendarID: str
    color: str = DEFAULT_CALENDAR_COLOR

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

@router.post("/physicians/{physician_id}/attach", status_code=200)
def attach_physician_calendar(
    physician_id: uuid.UUID,
    payload:      CalendarAttach,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
    request:      Request = None,
) -> Any:
    logger.info(f"POST /calendar/physicians/{physician_id}/attach - user: {current_user.email}")

    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can attach physician calendars")

    try:
        physician = db.get(User, physician_id)
        if not physician:
            raise HTTPException(status_code=404, detail="Physician not found")
        if physician.role != "physician":
            raise HTTPException(status_code=400, detail="User is not a physician")
        if physician.calendarID:
            raise HTTPException(status_code=409, detail="Physician already has a calendar")

        if not payload.color.startswith("#") or len(payload.color) != 7:
            raise HTTPException(status_code=422, detail="Color must be a valid hex value e.g. #0B8043")

        try:
            calendar_service.calendarList().insert(body={"id": payload.calendarID}).execute()
        except Exception as e:
            logger.exception(f"POST /calendar/physicians/{physician_id}/attach - calendarList insert error: {str(e)}")
            raise HTTPException(
                status_code=502,
                detail="Could not access the specified calendar — ensure it is shared with the service account",
            )

        try:
            calendar_service.calendarList().patch(
                calendarId=payload.calendarID,
                body={
                    "backgroundColor": payload.color,
                    "foregroundColor": "#ffffff",
                },
                colorRgbFormat=True,
            ).execute()
        except Exception:
            logger.warning(f"POST /calendar/physicians/{physician_id}/attach - could not set calendar color")

        physician.calendarID    = payload.calendarID
        physician.calendarColor = payload.color
        db.add(physician)
        db.commit()
        db.refresh(physician)

        try:
            audit_meta = get_audit_meta(request) if request is not None else {"ip": None}
            AuditService.create_log(
                db,
                action="ATTACH_PHYSICIAN_CALENDAR",
                status="SUCCESS",
                actor_id=current_user.userID,
                actor_type=current_user.role,
                resource_type="USER",
                resource_id=physician.userID,
                fields_modified=["calendarID", "calendarColor"],
                ip=audit_meta.get("ip"),
            )
        except Exception:
            logger.exception("Failed to write audit log for attach_physician_calendar")

        return {
            "calendarID":    payload.calendarID,
            "calendarColor": payload.color,
            "physicianName": f"Dr. {physician.firstName} {physician.lastName}",
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.exception(f"POST /calendar/physicians/{physician_id}/attach - Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to attach physician calendar")

@router.patch("/physicians/{physician_id}/color")
def update_calendar_color(
    physician_id: uuid.UUID,
    payload:      CalendarColorUpdate,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
    request:      Request = None,
) -> Any:
    logger.info(f"PATCH /calendar/physicians/{physician_id}/color - user: {current_user.email}")

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

        calendar_service.calendarList().patch(
            calendarId=physician.calendarID,
            body={
                "backgroundColor": payload.color,
                "foregroundColor": "#ffffff",
            },
            colorRgbFormat=True,
        ).execute()

        old_color               = physician.calendarColor
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

@router.get("/availability")
def get_availability(
    physicianID:  uuid.UUID = Query(...),
    date:         str        = Query(..., description="YYYY-MM-DD"),
    db:           Session    = Depends(get_db),
    current_user: User       = Depends(get_current_user),
) -> Any:
    logger.info(f"GET /appointments/availability - physicianID: {physicianID}, date: {date}, user: {current_user.email}")

    try:
        physician = db.get(User, physicianID)
        if not physician or physician.role != "physician":
            logger.warning(f"GET /appointments/availability - physician not found: {physicianID}")
            raise HTTPException(status_code=404, detail="Physician not found")

        if not physician.calendarID:
            raise HTTPException(status_code=400, detail="Physician has no calendar configured")

        time_min = datetime.fromisoformat(f"{date}T08:00:00").replace(tzinfo=CLINIC_TZ).isoformat()
        time_max = datetime.fromisoformat(f"{date}T17:00:00").replace(tzinfo=CLINIC_TZ).isoformat()

        result = calendar_service.freebusy().query(body={
            "timeMin": time_min,
            "timeMax": time_max,
            "items":   [{"id": physician.calendarID}],
        }).execute()

        busy_blocks = result["calendars"][physician.calendarID]["busy"]

        return {
            "physicianID":   str(physicianID),
            "physicianName": f"Dr. {physician.firstName} {physician.lastName}",
            "date":          date,
            "slots":         _build_slots(date, busy_blocks),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"GET /appointments/availability - Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch availability")

@router.get("/")
def list_appointments(
    caseID:       Optional[uuid.UUID] = None,
    physicianID:  Optional[uuid.UUID] = None,
    status:       Optional[str]       = None,
    db:           Session             = Depends(get_db),
    current_user: User                = Depends(get_current_user),
) -> Any:
    logger.info(f"GET /appointments - caseID: {caseID}, physicianID: {physicianID}, status: {status}, user: {current_user.email}")

    try:
        query = select(Appointment)

        if caseID:
            query = query.where(Appointment.caseID == caseID)
        if physicianID:
            query = query.where(Appointment.physicianID == physicianID)
        if status:
            query = query.where(Appointment.status == status)

        appointments = db.exec(query.order_by(Appointment.scheduledAt)).all()

        results = []
        for a in appointments:
            physician = db.get(User, a.physicianID)
            results.append({
                **a.model_dump(),
                "physicianName": (
                    f"Dr. {physician.firstName} {physician.lastName}"
                    if physician else None
                ),
            })

        return results

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"GET /appointments - Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve appointments")

@router.get("/{appointment_id}")
def get_appointment(
    appointment_id: uuid.UUID,
    db:             Session = Depends(get_db),
    current_user:   User    = Depends(get_current_user),
) -> Any:
    logger.info(f"GET /appointments/{appointment_id} - user: {current_user.email}")

    try:
        appointment = db.get(Appointment, appointment_id)
        if not appointment:
            logger.warning(f"GET /appointments/{appointment_id} - not found")
            raise HTTPException(status_code=404, detail="Appointment not found")

        physician = db.get(User, appointment.physicianID)

        return {
            **appointment.model_dump(),
            "physicianName": (
                f"Dr. {physician.firstName} {physician.lastName}"
                if physician else None
            ),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"GET /appointments/{appointment_id} - Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve appointment")

@router.post("/", status_code=201)
def create_appointment(
    payload:      AppointmentCreate,
    db:           Session  = Depends(get_db),
    current_user: User     = Depends(get_current_user),
    request:      Request  = None,
) -> Any:
    logger.info(f"POST /appointments - caseID: {payload.caseID}, physicianID: {payload.physicianID}, user: {current_user.email}")

    try:
        physician = db.get(User, payload.physicianID)
        if not physician or physician.role != "physician":
            logger.warning(f"POST /appointments - physician not found: {payload.physicianID}")
            raise HTTPException(status_code=404, detail="Physician not found")

        if not physician.calendarID:
            raise HTTPException(
                status_code=400,
                detail="Physician has no calendar configured — run the setup script",
            )

        case = db.get(TriageCase, payload.caseID)
        if not case:
            logger.warning(f"POST /appointments - case not found: {payload.caseID}")
            raise HTTPException(status_code=404, detail="TriageCase not found")

        patient        = db.get(Patient, case.patientID) if case.patientID else None
        patient_name   = f"{patient.firstName} {patient.lastName}" if patient else "Patient"
        physician_name = f"Dr. {physician.firstName} {physician.lastName}"

        payload.scheduledAt  = normalize_to_clinic_tz(payload.scheduledAt)
        payload.scheduledEnd = normalize_to_clinic_tz(payload.scheduledEnd)

        duration = int((payload.scheduledEnd - payload.scheduledAt).total_seconds() / 60)

        appointment = Appointment(
            appointmentID  = uuid.uuid4(),
            caseID         = payload.caseID,
            physicianID    = payload.physicianID,
            scheduledBy    = current_user.userID,
            scheduledAt    = payload.scheduledAt,
            scheduledEnd   = payload.scheduledEnd,
            durationMins   = duration,
            gcalEventId    = None,
            gcalCalendarId = None,
            status         = "scheduled",
        )
        db.add(appointment)

        log_changes(
            session=db,
            old_record=case,
            new_values={"scheduledDate": payload.scheduledAt},
            changelog_model=TriageCaseChangelog,
            foreign_key_field="caseID",
            record_id=case.caseID,
            user_id=current_user.userID,
        )

        case.activeAppointmentID = appointment.appointmentID
        case.scheduledDate       = payload.scheduledAt
        db.add(case)
        db.commit()
        db.refresh(appointment)

        event_body = {
            "summary":     f"{patient_name}",
            "description": f"Physician: {physician_name} - Scheduled By: {current_user.firstName} {current_user.lastName} - Case ID: {payload.caseID}",
            "start": {
                "dateTime": payload.scheduledAt.isoformat(),
                "timeZone": "America/Los_Angeles",
            },
            "end": {
                "dateTime": payload.scheduledEnd.isoformat(),
                "timeZone": "America/Los_Angeles",
            },
        }

        color_id = _color_id_for(physician.calendarColor or DEFAULT_CALENDAR_COLOR)
        if color_id:
            event_body["colorId"] = color_id

        try:
            event = calendar_service.events().insert(
                calendarId=physician.calendarID,
                body=event_body,
            ).execute()
        except Exception as e:
            logger.exception(f"POST /appointments - Google Calendar error: {str(e)}")
            raise HTTPException(status_code=502, detail="Failed to create Google Calendar event")

        appointment.gcalEventId    = event["id"]
        appointment.gcalCalendarId = physician.calendarID
        db.add(appointment)
        db.commit()

        try:
            audit_meta = get_audit_meta(request) if request is not None else {"ip": None}
            AuditService.create_log(
                db,
                action="CREATE_APPOINTMENT",
                status="SUCCESS",
                actor_id=current_user.userID,
                actor_type=current_user.role,
                resource_type="APPOINTMENT",
                resource_id=appointment.appointmentID,
                fields_modified=["caseID", "physicianID", "scheduledAt", "scheduledEnd"],
                ip=audit_meta.get("ip"),
            )
        except Exception:
            logger.exception("Failed to write audit log for create_appointment")

        return {
            "appointmentID": str(appointment.appointmentID),
            "gcalEventId":   event["id"],
            "scheduledAt":   appointment.scheduledAt,
            "scheduledEnd":  appointment.scheduledEnd,
            "physicianName": physician_name,
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.exception(f"POST /appointments - Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create appointment")

@router.patch("/{appointment_id}")
def reschedule_appointment(
    appointment_id: uuid.UUID,
    payload:        AppointmentReschedule,
    db:             Session = Depends(get_db),
    current_user:   User    = Depends(get_current_user),
    request:        Request = None,
) -> Any:
    logger.info(f"PATCH /appointments/{appointment_id} - body: {payload.model_dump(exclude_unset=True)}, user: {current_user.email}")

    try:
        appointment = db.get(Appointment, appointment_id)
        if not appointment:
            logger.warning(f"PATCH /appointments/{appointment_id} - not found")
            raise HTTPException(status_code=404, detail="Appointment not found")

        if appointment.status in ("cancelled", "rescheduled"):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot reschedule a {appointment.status} appointment",
            )

        physician_id = payload.physicianID or appointment.physicianID
        physician    = db.get(User, physician_id)
        if not physician or not physician.calendarID:
            raise HTTPException(
                status_code=404,
                detail="Physician not found or has no calendar configured",
            )

        new_start = normalize_to_clinic_tz(payload.scheduledAt  or appointment.scheduledAt)
        new_end   = normalize_to_clinic_tz(payload.scheduledEnd or appointment.scheduledEnd)

        case          = db.get(TriageCase, appointment.caseID)
        patient       = db.get(Patient, case.patientID) if case and case.patientID else None
        patient_name  = f"{patient.firstName} {patient.lastName}" if patient else "Patient"
        physician_name = f"Dr. {physician.firstName} {physician.lastName}"

        old_gcal_calendar_id = appointment.gcalCalendarId
        old_gcal_event_id    = appointment.gcalEventId

        appointment.status      = "rescheduled"
        appointment.cancelledAt = datetime.now(timezone.utc)
        db.add(appointment)

        duration = int((new_end - new_start).total_seconds() / 60)
        new_appt  = Appointment(
            appointmentID  = uuid.uuid4(),
            caseID         = appointment.caseID,
            physicianID    = physician_id,
            scheduledBy    = current_user.userID,
            scheduledAt    = new_start,
            scheduledEnd   = new_end,
            durationMins   = duration,
            gcalEventId    = None,
            gcalCalendarId = None,
            status         = "scheduled",
        )
        db.add(new_appt)

        if case:
            log_changes(
                session=db,
                old_record=case,
                new_values={"scheduledDate": new_start},
                changelog_model=TriageCaseChangelog,
                foreign_key_field="caseID",
                record_id=case.caseID,
                user_id=current_user.userID,
            )
            case.activeAppointmentID = new_appt.appointmentID
            case.scheduledDate       = new_start
            db.add(case)

        db.commit()
        db.refresh(new_appt)

        try:
            calendar_service.events().delete(
                calendarId=old_gcal_calendar_id,
                eventId=old_gcal_event_id,
            ).execute()
        except Exception as e:
            logger.exception(f"PATCH /appointments/{appointment_id} - Google Calendar delete error: {str(e)}")
            raise HTTPException(status_code=502, detail="Failed to delete old Google Calendar event")

        event_body = {
            "summary":     f"{patient_name} (RESCHEDULED)",
            "description": f"Physician: {physician_name} - Scheduled By: {current_user.firstName} {current_user.lastName} - Case ID: {payload.caseID}",
            "start": {
                "dateTime": new_start.isoformat(),
                "timeZone": "America/Los_Angeles",
            },
            "end": {
                "dateTime": new_end.isoformat(),
                "timeZone": "America/Los_Angeles",
            },
        }

        color_id = _color_id_for(physician.calendarColor or DEFAULT_CALENDAR_COLOR)
        if color_id:
            event_body["colorId"] = color_id

        try:
            event = calendar_service.events().insert(
                calendarId=physician.calendarID,
                body=event_body,
            ).execute()
        except Exception as e:
            logger.exception(f"PATCH /appointments/{appointment_id} - Google Calendar insert error: {str(e)}")
            raise HTTPException(status_code=502, detail="Failed to create new Google Calendar event")

        new_appt.gcalEventId    = event["id"]
        new_appt.gcalCalendarId = physician.calendarID
        db.add(new_appt)
        db.commit()

        try:
            audit_meta = get_audit_meta(request) if request is not None else {"ip": None}
            AuditService.create_log(
                db,
                action="RESCHEDULE_APPOINTMENT",
                status="SUCCESS",
                actor_id=current_user.userID,
                actor_type=current_user.role,
                resource_type="APPOINTMENT",
                resource_id=new_appt.appointmentID,
                fields_modified=list(payload.model_dump(exclude_unset=True).keys()),
                ip=audit_meta.get("ip"),
            )
        except Exception:
            logger.exception("Failed to write audit log for reschedule_appointment")

        return {
            "appointmentID": str(new_appt.appointmentID),
            "gcalEventId":   event["id"],
            "scheduledAt":   new_appt.scheduledAt,
            "scheduledEnd":  new_appt.scheduledEnd,
            "physicianName": physician_name,
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.exception(f"PATCH /appointments/{appointment_id} - Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to reschedule appointment")

@router.delete("/{appointment_id}")
def cancel_appointment(
    appointment_id: uuid.UUID,
    payload:        AppointmentCancel,
    db:             Session = Depends(get_db),
    current_user:   User    = Depends(get_current_user),
    request:        Request = None,
) -> Any:
    logger.info(f"DELETE /appointments/{appointment_id} - user: {current_user.email}")

    try:
        appointment = db.get(Appointment, appointment_id)
        if not appointment:
            logger.warning(f"DELETE /appointments/{appointment_id} - not found")
            raise HTTPException(status_code=404, detail="Appointment not found")

        if appointment.status == "cancelled":
            raise HTTPException(status_code=400, detail="Appointment is already cancelled")

        old_gcal_calendar_id = appointment.gcalCalendarId
        old_gcal_event_id    = appointment.gcalEventId

        appointment.status       = "cancelled"
        appointment.cancelReason = payload.cancelReason
        appointment.cancelledAt  = datetime.now(timezone.utc)
        db.add(appointment)

        case = db.get(TriageCase, appointment.caseID)
        if case and case.activeAppointmentID == appointment_id:
            log_changes(
                session=db,
                old_record=case,
                new_values={"scheduledDate": None},
                changelog_model=TriageCaseChangelog,
                foreign_key_field="caseID",
                record_id=case.caseID,
                user_id=current_user.userID,
            )
            case.activeAppointmentID = None
            case.scheduledDate       = None
            db.add(case)

        db.commit()

        try:
            calendar_service.events().delete(
                calendarId=old_gcal_calendar_id,
                eventId=old_gcal_event_id,
            ).execute()
        except Exception as e:
            logger.exception(f"DELETE /appointments/{appointment_id} - Google Calendar error: {str(e)}")
            raise HTTPException(status_code=502, detail="Failed to delete Google Calendar event")

        try:
            audit_meta = get_audit_meta(request) if request is not None else {"ip": None}
            AuditService.create_log(
                db,
                action="CANCEL_APPOINTMENT",
                status="SUCCESS",
                actor_id=current_user.userID,
                actor_type=current_user.role,
                resource_type="APPOINTMENT",
                resource_id=appointment.appointmentID,
                fields_modified=["status", "cancelReason", "cancelledAt"],
                ip=audit_meta.get("ip"),
            )
        except Exception:
            logger.exception("Failed to write audit log for cancel_appointment")

        return {"success": True, "appointmentID": str(appointment_id)}

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.exception(f"DELETE /appointments/{appointment_id} - Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to cancel appointment")

def _build_slots(date: str, busy_blocks: list) -> list:
    """Invert Google freebusy busy blocks into 30-min available/busy slots."""
    slots         = []
    slot_duration = timedelta(minutes=30)
    current       = datetime.fromisoformat(f"{date}T08:00:00").replace(tzinfo=CLINIC_TZ)
    end           = datetime.fromisoformat(f"{date}T17:00:00").replace(tzinfo=CLINIC_TZ)

    busy_ranges = [
        (
            datetime.fromisoformat(b["start"].replace("Z", "+00:00")).astimezone(CLINIC_TZ),
            datetime.fromisoformat(b["end"].replace("Z", "+00:00")).astimezone(CLINIC_TZ),
        )
        for b in busy_blocks
    ]

    while current < end:
        is_busy = any(s <= current < e for s, e in busy_ranges)
        slots.append({
            "time":      current.strftime("%H:%M"),
            "available": not is_busy,
        })
        current += slot_duration

    return slots