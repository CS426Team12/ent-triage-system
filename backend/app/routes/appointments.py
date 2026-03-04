import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Depends, Request, Query
from sqlmodel import Session, select
from pydantic import BaseModel

from app.core.dependencies import get_db
from app.auth.dependencies import get_current_user
from app.core.audit import AuditService
from app.core.audit_middleware import get_audit_meta
from app.models import User
from app.models.appointments import Appointment, AppointmentCreate, AppointmentReschedule, AppointmentCancel
from app.models import TriageCase
from app.models import Patient
from app.core.gcal import calendar_service

import asyncio

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/appointments", tags=["appointments"])

@router.get("/availability")
def get_availability(
    physicianID: uuid.UUID = Query(...),
    date:        str        = Query(..., description="YYYY-MM-DD"),
    db:          Session    = Depends(get_db),
    current_user: User      = Depends(get_current_user),
) -> Any:
    logger.info(f"GET /appointments/availability - physicianID: {physicianID}, date: {date}, user: {current_user.email}")

    try:
        physician = db.get(User, physicianID)
        if not physician or physician.role != "physician":
            logger.warning(f"GET /appointments/availability - physician not found: {physicianID}")
            raise HTTPException(status_code=404, detail="Physician not found")

        if not physician.calendarID:
            raise HTTPException(
                status_code=400,
                detail="Physician has no calendar configured — run the setup script",
            )

        result = asyncio.get_event_loop().run_until_complete(
            asyncio.to_thread(
                lambda: calendar_service.freebusy().query(body={
                    "timeMin": f"{date}T08:00:00Z",
                    "timeMax": f"{date}T17:00:00Z",
                    "items":   [{"id": physician.calendarID}],
                }).execute()
            )
        )

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
    caseID:       Optional[uuid.UUID]   = None,
    physicianID:  Optional[uuid.UUID]   = None,
    status:       Optional[str]         = None,
    db:           Session               = Depends(get_db),
    current_user: User                  = Depends(get_current_user),
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

        patient      = db.get(Patient, case.patientID) if case.patientID else None
        patient_name = f"{patient.firstName} {patient.lastName}" if patient else "Patient"

        # write to Google Calendar
        try:
            event = asyncio.get_event_loop().run_until_complete(
                asyncio.to_thread(
                    lambda: calendar_service.events().insert(
                        calendarId=physician.calendarID,
                        body={
                            "summary":     f"{patient_name} — Case {payload.caseID}",
                            "description": f"Case ID: {payload.caseID}",
                            "start": {
                                "dateTime": payload.scheduledAt.isoformat(),
                                "timeZone": "America/Los_Angeles",
                            },
                            "end": {
                                "dateTime": payload.scheduledEnd.isoformat(),
                                "timeZone": "America/Los_Angeles",
                            },
                        }
                    ).execute()
                )
            )
        except Exception as e:
            logger.exception(f"POST /appointments - Google Calendar error: {str(e)}")
            raise HTTPException(status_code=502, detail="Failed to create Google Calendar event")

        duration = int(
            (payload.scheduledEnd - payload.scheduledAt).total_seconds() / 60
        )

        appointment = Appointment(
            appointmentID  = uuid.uuid4(),
            caseID         = payload.caseID,
            physicianID    = payload.physicianID,
            scheduledBy    = current_user.userID,
            scheduledAt    = payload.scheduledAt,
            scheduledEnd   = payload.scheduledEnd,
            durationMins   = duration,
            gcalEventId    = event["id"],
            gcalCalendarId = physician.calendarID,
            status         = "scheduled",
        )
        db.add(appointment)

        case.activeAppointmentID = appointment.appointmentID
        case.scheduledDate       = payload.scheduledAt
        db.add(case)

        db.commit()
        db.refresh(appointment)

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
            "appointmentID":  str(appointment.appointmentID),
            "gcalEventId":    event["id"],
            "scheduledAt":    appointment.scheduledAt,
            "scheduledEnd":   appointment.scheduledEnd,
            "physicianName":  f"Dr. {physician.firstName} {physician.lastName}",
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

        new_start = payload.scheduledAt  or appointment.scheduledAt
        new_end   = payload.scheduledEnd or appointment.scheduledEnd

        # delete old Google Calendar event
        try:
            asyncio.get_event_loop().run_until_complete(
                asyncio.to_thread(
                    lambda: calendar_service.events().delete(
                        calendarId=appointment.gcalCalendarId,
                        eventId=appointment.gcalEventId,
                    ).execute()
                )
            )
        except Exception as e:
            logger.exception(f"PATCH /appointments/{appointment_id} - Google Calendar delete error: {str(e)}")
            raise HTTPException(status_code=502, detail="Failed to delete old Google Calendar event")

        # create new Google Calendar event
        case         = db.get(TriageCase, appointment.caseID)
        patient      = db.get(Patient, case.patientID) if case and case.patientID else None
        patient_name = f"{patient.firstName} {patient.lastName}" if patient else "Patient"

        try:
            event = asyncio.get_event_loop().run_until_complete(
                asyncio.to_thread(
                    lambda: calendar_service.events().insert(
                        calendarId=physician.calendarID,
                        body={
                            "summary":     f"{patient_name} — Case {appointment.caseID}",
                            "description": f"Case ID: {appointment.caseID} (rescheduled)",
                            "start": {
                                "dateTime": new_start.isoformat(),
                                "timeZone": "America/Los_Angeles",
                            },
                            "end": {
                                "dateTime": new_end.isoformat(),
                                "timeZone": "America/Los_Angeles",
                            },
                        }
                    ).execute()
                )
            )
        except Exception as e:
            logger.exception(f"PATCH /appointments/{appointment_id} - Google Calendar insert error: {str(e)}")
            raise HTTPException(status_code=502, detail="Failed to create new Google Calendar event")

        # mark old row as rescheduled — preserves history
        appointment.status      = "rescheduled"
        appointment.cancelledAt = datetime.now(timezone.utc)
        db.add(appointment)

        # new appointment row
        duration = int((new_end - new_start).total_seconds() / 60)
        new_appt  = Appointment(
            appointmentID  = uuid.uuid4(),
            caseID         = appointment.caseID,
            physicianID    = physician_id,
            scheduledBy    = current_user.userID,
            scheduledAt    = new_start,
            scheduledEnd   = new_end,
            durationMins   = duration,
            gcalEventId    = event["id"],
            gcalCalendarId = physician.calendarID,
            status         = "scheduled",
        )
        db.add(new_appt)

        if case:
            case.activeAppointmentID = new_appt.appointmentID
            case.scheduledDate       = new_start
            db.add(case)

        db.commit()
        db.refresh(new_appt)

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
            "appointmentID":  str(new_appt.appointmentID),
            "gcalEventId":    event["id"],
            "scheduledAt":    new_appt.scheduledAt,
            "scheduledEnd":   new_appt.scheduledEnd,
            "physicianName":  f"Dr. {physician.firstName} {physician.lastName}",
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

        # remove from Google Calendar
        try:
            asyncio.get_event_loop().run_until_complete(
                asyncio.to_thread(
                    lambda: calendar_service.events().delete(
                        calendarId=appointment.gcalCalendarId,
                        eventId=appointment.gcalEventId,
                    ).execute()
                )
            )
        except Exception as e:
            logger.exception(f"DELETE /appointments/{appointment_id} - Google Calendar error: {str(e)}")
            raise HTTPException(status_code=502, detail="Failed to delete Google Calendar event")

        appointment.status       = "cancelled"
        appointment.cancelReason = payload.cancelReason
        appointment.cancelledAt  = datetime.now(timezone.utc)
        db.add(appointment)

        case = db.get(TriageCase, appointment.caseID)
        if case and case.activeAppointmentID == appointment_id:
            case.activeAppointmentID = None
            case.scheduledDate       = None
            db.add(case)

        db.commit()

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
    current       = datetime.fromisoformat(f"{date}T08:00:00")
    end           = datetime.fromisoformat(f"{date}T17:00:00")

    busy_ranges = [
        (
            datetime.fromisoformat(b["start"].replace("Z", "")).replace(tzinfo=None),
            datetime.fromisoformat(b["end"].replace("Z", "")).replace(tzinfo=None),
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