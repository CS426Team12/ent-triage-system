import uuid
import logging
from typing import Any
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, status
from sqlmodel import Session, func, select
from app.core.dependencies import get_db
from app.auth.dependencies import get_current_user
from app.models import (
    AuditLog,
    AuditLogPublic,
    AuditLogsPublic,
    User,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])

@router.get("/", response_model=AuditLogsPublic)
def get_audit_logs(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    logger.info(f"GET /audit-logs/ - limit: {limit}, user: {current_user.email}")
    # Only allow access to audit logs if the user is an admin
    if current_user.role != "admin":
        logger.warning(f"Unauthorized access attempt to audit logs by user: {current_user.email}")
        raise HTTPException(status_code=403, detail="Access denied")
    
    count_statement = select(func.count()).select_from(AuditLog)
    count = db.exec(count_statement).scalar_one()

    statement = (
        select(AuditLog)
        .order_by(AuditLog.timestamp.desc())
        .limit(limit)
    )
    results = db.exec(statement).all()

    logs = [
        AuditLogPublic(
            logID=log.logID,
            timestamp=log.timestamp,
            actorID=log.actorID,
            actorType=log.actorType,
            changeDetails=log.changeDetails,
            resourceID=log.resourceID,
            resourceType=log.resourceType,
            action=log.action,
            status=log.status,
            ipAddress=log.ipAddress
        )
        for log in results
    ]
    logger.info(f"GET /audit-logs/ - returned {count} logs")
    return AuditLogsPublic(logs=logs, count=count)

@router.post("/", response_model=AuditLogPublic, status_code=status.HTTP_201_CREATED)
def create_audit_log(
    log: AuditLog,
    db: Session = Depends(get_db)
) -> Any:
    logger.info(f"Creating audit log for action: {log.action} on resource: {log.resourceType} by actor: {log.actorID}")
    db.add(log)
    db.commit()
    db.refresh(log)
    logger.info(f"Audit log created with ID: {log.logID}")
    return AuditLogPublic(
        logID=log.logID,
        timestamp=log.timestamp,
        actorID=log.actorID,
        actorType=log.actorType,
        changeDetails=log.changeDetails,
        resourceID=log.resourceID,
        resourceType=log.resourceType,
        action=log.action,
        status=log.status,
        ipAddress=log.ipAddress
    )
