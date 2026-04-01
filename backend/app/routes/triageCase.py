import re
import uuid
from uuid import uuid4
import logging
from typing import Any
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Request, status
from sqlmodel import Session, func, select
from app.core.dependencies import get_db
from app.auth.dependencies import get_current_user
from app.models import (
    TriageCase,
    TriageCaseCreate,
    TriageCasePublic,
    TriageCasesPublic,
    TriageCaseUpdate,
    TriageCaseReview,
    TriageCaseChangelog,
    PatientChangelog,
    Message,
    User,
    Patient,
    CaseFile,
    CaseFileCreate,
    CaseFilesPublic,
)
from app.utils.changelog import log_changes
from app.utils.s3_helpers import generate_presigned_upload_url, generate_presigned_download_url
from app.core.audit_middleware import get_audit_meta
from app.core.audit import AuditService
from app.core.s3 import s3_client, BUCKET_NAME


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/triage-cases", tags=["triage-cases"])

def build_case_public(case: TriageCase, db: Session) -> TriageCasePublic:
    patient = db.get(Patient, case.patientID)
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    
    reviewed_by_email = None
    if case.reviewedBy:
        reviewer = db.get(User, case.reviewedBy)
        if reviewer:
            reviewed_by_email = reviewer.email
            
    previous_urgency = None
    urgency_change_by_email = None
    if case.overrideUrgency:
        statement = (
            select(TriageCaseChangelog)
            .where(TriageCaseChangelog.caseID == case.caseID)
            .where(TriageCaseChangelog.fieldName == 'overrideUrgency')
            .order_by(TriageCaseChangelog.changedAt.desc())
            .limit(1)
        )
        last_change = db.exec(statement).first()
        if last_change:
            previous_urgency = last_change.oldValue
            
    return TriageCasePublic(
        **case.model_dump(),
        firstName=patient.firstName,
        lastName=patient.lastName,
        DOB=patient.DOB,
        contactInfo=patient.contactInfo,
        insuranceInfo=patient.insuranceInfo,
        returningPatient=patient.returningPatient,
        languagePreference=patient.languagePreference,
        verified=patient.verified,
        reviewedByEmail=reviewed_by_email,
        previousUrgency=previous_urgency,
    )

@router.get("/", response_model=TriageCasesPublic)
def get_all_cases(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
) -> Any:
    logger.info(f"GET /triage-cases/ - limit: {limit}, user: {current_user.email}")
    
    try:
        count_statement = select(func.count()).select_from(TriageCase)
        count = db.exec(count_statement).one()
        
        statement = select(TriageCase).limit(limit)
        cases = db.exec(statement).all()
        
        cases_public = [build_case_public(case, db) for case in cases]
    
        try:
            audit_meta = get_audit_meta(request) if request is not None else {"ip": None}
            AuditService.create_log(
                db,
                action="LIST_CASES",
                status="SUCCESS",
                actor_id=current_user.userID,
                actor_type=current_user.role,
                resource_type="TRIAGE_CASE",
                resource_id=None,
                fields_modified=None,
                changeDetails={"limit": limit, "returned_count": len(cases_public)},
                ip=audit_meta.get("ip"),
            )
        except Exception:
            logger.exception("Failed to write audit log for listing triage cases")
    
        logger.info(f"GET /triage-cases/ - returned {count} cases")
        return TriageCasesPublic(cases=cases_public, count=count)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"GET /triage-cases/ - Error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve triage cases")

@router.get("/status/{status}", response_model=TriageCasesPublic)
def get_cases_by_status(
    status: str,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
) -> Any:
    logger.info(f"GET /triage-cases/status/{status} - limit: {limit}, user: {current_user.email}")
    
    try:
        count_statement = (
            select(func.count())
            .select_from(TriageCase)
            .where(TriageCase.status == status)
        )
        count = db.exec(count_statement).one()
        
        statement = (
            select(TriageCase)
            .where(TriageCase.status == status)
            .limit(limit)
        )
        cases = db.exec(statement).all()
        
        cases_public = [build_case_public(case, db) for case in cases]
    
        # Log list access at collection level
        try:
            audit_meta = get_audit_meta(request) if request is not None else {"ip": None}
            AuditService.create_log(
                db,
                action="LIST_CASES",
                status="SUCCESS",
                actor_id=current_user.userID,
                actor_type=current_user.role,
                resource_type="TRIAGE_CASE",
                resource_id=None,
                fields_modified=None,
                changeDetails={"status_filter": status, "limit": limit, "returned_count": len(cases_public)},
                ip=audit_meta.get("ip"),
            )
        except Exception:
            logger.exception("Failed to write audit log for listing cases by status")
        return TriageCasesPublic(cases=cases_public, count=count)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"GET /triage-cases/status/{status} - Error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve triage cases by status")

@router.get("/{id}", response_model=TriageCasePublic)
def get_specific_case(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    request: Request = None
) -> Any:
    logger.info(f"GET /triage-cases/{id} - user: {current_user.email}")
    
    try:
        case = db.get(TriageCase, id)
        if not case:
            logger.warning(f"GET /triage-cases/{id} - case not found")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Triage case not found")

        return build_case_public(case, db)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"GET /triage-cases/{id} - Error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve triage case")

@router.post("/", response_model=TriageCasePublic)
def create_new_case(
    new_case: TriageCaseCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    request: Request = None
) -> Any:
    logger.info(f"POST /triage-cases/ - user: {current_user.email}, body: {new_case.model_dump()}")
    
    try:
        case = TriageCase.model_validate(new_case)

        db.add(case)
        db.commit()
        db.refresh(case)
        
        # Log case creation
        try:
            from app.core.audit_middleware import get_audit_meta
            audit_meta = get_audit_meta(request) if request is not None else {"ip": None}
            fields_created = list(new_case.model_dump().keys())
            AuditService.create_log(
                db,
                action="CREATE_CASE",
                status="SUCCESS",
                actor_id=current_user.userID,
                actor_type=current_user.role,
                resource_type="TRIAGE_CASE",
                resource_id=case.caseID,
                fields_modified=fields_created,
                ip=audit_meta.get("ip"),
            )
        except Exception:
            logger.exception("Failed to write audit log for case creation") 
        return build_case_public(case, db)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.exception(f"POST /triage-cases/ - Error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create triage case")

@router.patch("/{id}", response_model=TriageCasePublic)
def update_case(
    id: uuid.UUID,
    update: TriageCaseUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    request: Request = None
) -> Any:
    logger.info(f"PATCH /triage-cases/{id} - user: {current_user.email}, body: {update.model_dump(exclude_unset=True)}")
    
    try:
        if update.status and update.status.lower() == "reviewed" or update.reviewReason:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Triage case cannot be reviewed through generic update"
            )
        
        case = db.get(TriageCase, id)
        if not case:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Triage case not found")
        
        update_data = update.model_dump(exclude_unset=True)
        
        if not update_data:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
        
        patient_field_names = set(Patient.model_fields.keys())
        patient_updates = {k: v for k, v in update_data.items() if k in patient_field_names}
        case_updates = {k: v for k, v in update_data.items() if k not in patient_field_names}
        
        if patient_updates:
            patient = db.get(Patient, case.patientID)
            if not patient:
                logger.warning(f"PATCH /triage-cases/{id} - patient not found")
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
            
            log_changes(
                session=db,
                old_record=patient,
                new_values=patient_updates,
                changelog_model=PatientChangelog,
                foreign_key_field='patientID',
                record_id=case.patientID,
                user_id=current_user.userID
            )
            
            patient.sqlmodel_update(patient_updates)
            db.add(patient)
        
        if case_updates:
            log_changes(
                session=db,
                old_record=case,
                new_values=case_updates,
                changelog_model=TriageCaseChangelog,
                foreign_key_field='caseID',
                record_id=id,
                user_id=current_user.userID
            )
            
            case.sqlmodel_update(case_updates)
            db.add(case)
            
        db.commit()
        db.refresh(case)

        if case_updates:
            try:
                audit_meta = get_audit_meta(request) if request is not None else {"ip": None}
                modified_fields = list(case_updates.keys())
                AuditService.create_log(
                    db,
                    action="UPDATE_CASE",
                    status="SUCCESS",
                    actor_id=current_user.userID,
                    actor_type=current_user.role,
                    resource_type="TRIAGE_CASE",
                    resource_id=case.caseID,
                    fields_modified=modified_fields,
                    ip=audit_meta.get("ip"),
                )
            except Exception:
                logger.exception("Failed to write audit log for case update")            
        
        return build_case_public(case, db)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.exception(f"PATCH /triage-cases/{id} - Error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update triage case")


@router.delete("/{id}")
def delete_case(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    request: Request = None
) -> Message:
    logger.info(f"DELETE /triage-cases/{id} - user: {current_user.email}")
    
    try:
        case = db.get(TriageCase, id)
        if not case:
            logger.warning(f"DELETE /triage-cases/{id} - case not found")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Triage case not found")
        
        db.delete(case)
        db.commit()
        
        # Log case deletion
        try:
            audit_meta = get_audit_meta(request) if request is not None else {"ip": None}
            AuditService.create_log(
                db,
                action="DELETE_CASE",
                status="SUCCESS",
                actor_id=current_user.userID,
                actor_type=current_user.role,
                resource_type="TRIAGE_CASE",
                resource_id=id,
                fields_modified=None,
                ip=audit_meta.get("ip"),
            )
        except Exception:
            logger.exception("Failed to write audit log for case deletion")
    
        logger.info(f"DELETE /triage-cases/{id} - deleted successfully")
        return Message(message="Triage case deleted successfully")
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.exception(f"DELETE /triage-cases/{id} - Error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete triage case")


@router.patch("/{id}/review", response_model=TriageCasePublic)
def review_case(
    id: uuid.UUID,
    update: TriageCaseReview,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    request: Request = None
) -> Any:
    logger.info(f"PATCH /triage-cases/{id}/review - user: {current_user.email}, body: {update.model_dump()}")
    
    try:
        if not update.reviewReason or not update.reviewReason.strip():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Review reason is required and cannot be empty")
        
        case = db.get(TriageCase, id)
        if not case:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Triage case not found")
        
        if case.status == "reviewed":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Case is already reviewed")
        
        review_updates = {
            'status': 'reviewed',
            'reviewReason': update.reviewReason,
            'reviewedBy': current_user.userID,
            'reviewTimestamp': datetime.now()
        }
        
        log_changes(
            session=db,
            old_record=case,
            new_values=review_updates,
            changelog_model=TriageCaseChangelog,
            foreign_key_field='caseID',
            record_id=id,
            user_id=current_user.userID,
            exclude_fields=['reviewedBy'],
        )
        
        case.status = review_updates["status"]
        case.reviewReason = review_updates["reviewReason"]
        case.reviewedBy = review_updates["reviewedBy"]
        case.reviewTimestamp = review_updates["reviewTimestamp"]

        db.add(case)
        db.commit()
        db.refresh(case)
        
        # Log case review
        try:
            audit_meta = get_audit_meta(request) if request is not None else {"ip": None}
            fields_modified = ["status", "reviewReason", "reviewedBy", "reviewTimestamp"]
            AuditService.create_log(
                db,
                action="REVIEW_CASE",
                status="SUCCESS",
                actor_id=current_user.userID,
                actor_type=current_user.role,
                resource_type="TRIAGE_CASE",
                resource_id=case.caseID,
                fields_modified=fields_modified,
                ip=audit_meta.get("ip"),
            )
        except Exception:
            logger.exception("Failed to write audit log for case review")
    
        return build_case_public(case, db)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.exception(f"PATCH /triage-cases/{id}/review - Error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to review triage case")

@router.get("/{id}/changelog")
def get_case_changelog(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    logger.info(f"GET /triage-cases/{id}/changelog - user: {current_user.email}")
    
    try:
        case = db.get(TriageCase, id)
        if not case:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Triage case not found")
        
        statement = (
            select(
                TriageCaseChangelog,
                User.email.label('changedByEmail')
            )
            .join(User, TriageCaseChangelog.changedBy == User.userID)
            .where(TriageCaseChangelog.caseID == id)
            .order_by(TriageCaseChangelog.changedAt.desc())
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
        logger.exception(f"GET /triage-cases/{id}/changelog - Error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve case changelog")

@router.get("/{id}/upload-url")
def generate_upload_url(
    id: uuid.UUID,
    file_name: str, 
    content_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    logger.info(f"GET /triage-cases/{id}/upload-url - user: {current_user.email}, file: {file_name}")

    try:
        case = db.get(TriageCase, id)
        if not case:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Triage case not found")
        
        safe_file_name = re.sub(r"[^a-zA-Z0-9._-]", "_", file_name)
        file_key = f"cases/{id}/{uuid4()}_{safe_file_name}"

        presigned_url = generate_presigned_upload_url(file_key, content_type=content_type)
        return {
            "presigned_url": presigned_url,
            "file_key": file_key
        }
    except Exception as e:
        logger.exception(f"Error generating upload URL: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate upload URL")

@router.post("/{id}/files")
def add_case_file(
    id: uuid.UUID,
    file: CaseFileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    logger.info(
        f"POST /triage-cases/{id}/files - user: {current_user.email}, file_key: {file.file_key}"
    )

    try:
        case = db.get(TriageCase, id)
        if not case:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Triage case not found"
            )
        if not file.file_key.startswith(f"cases/{id}/"):
            raise HTTPException(
                status_code=400,
                detail="Invalid file key for this case"
            )

        case_file = CaseFile(
            caseId=id, 
            fileKey=file.file_key,
            fileName=file.file_name,
            fileType=file.file_type,
            category=file.category,
            description=file.description,
            uploadedBy=current_user.userID
        )

        db.add(case_file)
        db.commit()
        db.refresh(case_file)

        return {
            "id": str(case_file.id),
            "caseId": str(case_file.caseId),
            "fileName": case_file.fileName,
            "fileType": case_file.fileType,
            "category": case_file.category,
            "uploadedAt": case_file.uploadedAt
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error adding case file: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to add case file"
        )


@router.get("/{id}/files", response_model=CaseFilesPublic)
def get_case_files(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    logger.info(f"GET /triage-cases/{id}/files - user: {current_user.email}")

    try:
        case = db.get(TriageCase, id)
        if not case:
            raise HTTPException(status_code=404, detail="Triage case not found")

        statement = select(CaseFile).where(CaseFile.caseId == id)
        results = db.exec(statement).all()
        
        files_response = []

        for file in results:
            presigned = generate_presigned_download_url(file.fileKey)

            files_response.append({
                "id": str(file.id),
                "fileName": file.fileName,
                "fileType": file.fileType,
                "category": file.category,
                "uploadedAt": file.uploadedAt,
                "url": presigned["url"],
                "urlExpiresAt": presigned["expiresAt"],
            })

        return {
            "files": files_response,
            "count": len(results)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error retrieving case files: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve case files")

@router.delete("/{case_id}/files/{file_id}")
def delete_case_file(
    case_id: uuid.UUID,
    file_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    logger.info(
        f"DELETE /triage-cases/{case_id}/files/{file_id} - user: {current_user.email}"
    )

    try:
        case = db.get(TriageCase, case_id)
        if not case:
            raise HTTPException(status_code=404, detail="Triage case not found")

        file = db.get(CaseFile, file_id)
        if not file or file.caseId != case_id:
            raise HTTPException(status_code=404, detail="File not found")
        
        try:
            s3_client.delete_object(
                Bucket=BUCKET_NAME,
                Key=file.fileKey
            )
        except Exception as e:
            logger.exception(f"S3 deletion failed: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="Failed to delete file from storage"
            )

        db.delete(file)
        db.commit()

        return {"message": "File deleted successfully"}

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.exception(f"Error deleting file: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to delete file"
        )