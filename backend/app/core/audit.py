import logging
import hashlib
import json
from typing import Optional
from datetime import datetime, timezone
from uuid import UUID
from sqlmodel import Session, select
from app.models import AuditLog

logger = logging.getLogger(__name__)


class AuditService:
    #Service for creating audit log entries, handles hash chain computation, field tracking, and database insertion.
    def compute_hash(
        log_id: str,
        actor_id: Optional[str],
        actor_type: Optional[str],
        resource_type: Optional[str],
        resource_id: Optional[str],
        action: str,
        status: str,
        timestamp: str,
        previous_hash: Optional[str] = None,
    ) -> str:
        #Compute SHA256 hash of audit log entry fields.
        hash_input = {
            "logID": log_id,
            "actorID": actor_id,
            "actorType": actor_type,
            "resourceType": resource_type,
            "resourceID": resource_id,
            "action": action,
            "status": status,
            "timestamp": timestamp,
            "previousHash": previous_hash,
        }
        hash_string = json.dumps(hash_input, sort_keys=True)
        return hashlib.sha256(hash_string.encode()).hexdigest()

    def get_previous_hash(
        db: Session, resource_type: Optional[str], resource_id: Optional[str]
    ) -> Optional[str]:
        #Retrieve the hash of the most recent audit log for the same resource to maintain a hash chain

        if not resource_type or not resource_id:
            return None

        query = (
            select(AuditLog.hash)
            .where(
                (AuditLog.resourceType == resource_type)
                & (AuditLog.resourceID == UUID(resource_id) if isinstance(resource_id, str) else AuditLog.resourceID == resource_id)
            )
            .order_by(AuditLog.timestamp.desc())
            .limit(1)
        )
        result = db.exec(query).first()
        return result if result else None

    def create_log(
        db: Session,
        *,
        action: str,
        status: str,
        actor_id: Optional[UUID] = None,
        actor_type: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[UUID] = None,
        changeDetails: Optional[dict] = None,
        fields_modified: Optional[list[str]] = None,
        ip: Optional[str] = None,
    ) -> AuditLog:
        """
        Args:
            db: Database session
            action: Action performed (e.g., LOGIN_SUCCESS, CREATE_USER, UPDATE_CASE)
            status: Status of the action (SUCCESS, FAIL)
            actor_id: UUID of the user who performed the action
            actor_type: Role/type of actor
            resource_type: Type of resource affected (USER, PATIENT, TRIAGE_CASE)
            resource_id: UUID of the resource affected
            fields_modified: List of field names that were modified
            ip: IP address of the request origin
        """
        # Build changeDetails JSONB
        if fields_modified and changeDetails is None:
            change_details = {
                "fields_modified": fields_modified,
                "modified_field_count": len(fields_modified),
            }
        else:
            change_details = changeDetails
        # Get current timestamp
        timestamp = datetime.now(timezone.utc)

        # Create new audit log
        new_log = AuditLog(
            actorID=actor_id,
            actorType=actor_type,
            resourceType=resource_type,
            resourceID=resource_id,
            action=action,
            status=status,
            timestamp=timestamp,
            changeDetails=change_details,
            ipAddress=ip,
        )

        # Get previous hash for chain
        previous_hash = AuditService.get_previous_hash(db, resource_type, str(resource_id) if resource_id else None)
        new_log.previousHash = previous_hash

        # Compute hash for this entry
        new_log.hash = AuditService.compute_hash(
            log_id=str(new_log.logID),
            actor_id=str(actor_id) if actor_id else None,
            actor_type=actor_type,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id else None,
            action=action,
            status=status,
            timestamp=timestamp.isoformat(),
            previous_hash=previous_hash,
        )

        # Insert into database
        db.add(new_log)
        db.commit()
        db.refresh(new_log)

        logger.info(
            f"Audit log created: action={action}, actor={actor_id}, resource={resource_type}:{resource_id}, status={status}"
        )

        return new_log
