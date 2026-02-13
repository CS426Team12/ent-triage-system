import uuid
import logging
from typing import Any
from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from app.core.dependencies import get_db
from app.auth.dependencies import get_current_user
from app.models import (
    Patient,
    PatientPublic,
    PatientUpdate,
    PatientChangelog,
    User,
)
from app.utils.changelog import log_changes

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/patients", tags=["patients"])

@router.get("/{patient_id}", response_model=PatientPublic)
def get_patient(
    patient_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    logger.info(f"GET /patients/{patient_id} - user: {current_user.email}")
    
    try:
        patient = db.get(Patient, patient_id)
        if not patient:
            logger.warning(f"GET /patients/{patient_id} - patient not found")
            raise HTTPException(status_code=404, detail="Patient not found")
        
        return patient
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"GET /patients/{patient_id} - Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve patient")

@router.patch("/{patient_id}", response_model=PatientPublic)
def update_patient(
    patient_id: uuid.UUID,
    update: PatientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    logger.info(f"PATCH /patients/{patient_id} - user: {current_user.email}, body: {update.model_dump(exclude_unset=True)}")
    
    try:
        patient = db.get(Patient, patient_id)
        if not patient:
            logger.warning(f"PATCH /patients/{patient_id} - patient not found")
            raise HTTPException(status_code=404, detail="Patient not found")
        
        update_data = update.model_dump(exclude_unset=True)
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        log_changes(
            session=db,
            old_record=patient,
            new_values=update_data,
            changelog_model=PatientChangelog,
            foreign_key_field='patientID',
            record_id=patient_id,
            user_id=current_user.userID
        )
        
        patient.sqlmodel_update(update_data)
        db.add(patient)
        db.commit()
        db.refresh(patient)
        
        return patient
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.exception(f"PATCH /patients/{patient_id} - Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update patient")

@router.get("/{patient_id}/changelog")
def get_patient_changelog(
    patient_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    logger.info(f"GET /patients/{patient_id}/changelog - user: {current_user.email}")
    
    try:
        patient = db.get(Patient, patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        statement = (
            select(
                PatientChangelog,
                User.email.label('changedByEmail')
            )
            .join(User, PatientChangelog.changedBy == User.userID)
            .where(PatientChangelog.patientID == patient_id)
            .order_by(PatientChangelog.changedAt.desc())
        )
        
        results = db.exec(statement).all()
        
        return [
            {
                "id": str(changelog.id),
                "changedAt": changelog.changedAt.isoformat(),
                "fieldName": changelog.fieldName,
                "oldValue": changelog.oldValue,
                "newValue": changelog.newValue,
                "changedByEmail": changed_by_email
            }
            for changelog, changed_by_email in results
        ]
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"GET /patients/{patient_id}/changelog - Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve patient changelog")