from sqlmodel import SQLModel, Field
from sqlalchemy.dialects.postgresql import JSONB, INET
from typing import Optional, Any
from datetime import datetime, timezone
import uuid


# ============= AUDIT LOG MODELS =============

class AuditLogBase(SQLModel):
    actorID: Optional[uuid.UUID] = None
    actorType: Optional[str] = None
    changeDetails: Optional[Any] = Field(sa_type=JSONB)
    resourceID: Optional[uuid.UUID] = None
    resourceType: Optional[str] = None
    action: Optional[str] = None
    status: Optional[str] = None
    ipAddress: Optional[str] = Field(sa_type=INET)

class AuditLog(AuditLogBase, table=True):
    __tablename__ = "AuditLog" 
    __table_args__ = {"schema": "ent"}

    logID: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    hash: Optional[str] = None
    previousHash: Optional[str] = None
    locked: bool = False

class AuditLogPublic(SQLModel):
    logID: uuid.UUID
    timestamp: datetime
    actorID: Optional[uuid.UUID] = None
    actorType: Optional[str] = None
    changeDetails: Optional[Any] = Field(sa_type=JSONB)
    resourceID: Optional[uuid.UUID] = None
    resourceType: Optional[str] = None
    action: Optional[str] = None
    status: Optional[str] = None
    ipAddress: Optional[str] = Field(sa_type=INET)

class AuditLogsPublic(SQLModel):
    logs: list[AuditLogPublic]
    count: int

