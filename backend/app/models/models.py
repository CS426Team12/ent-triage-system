from sqlmodel import SQLModel, Field
from sqlalchemy import Column
from typing import Optional, Any
from datetime import datetime, date, timezone
import uuid
from enum import Enum
from sqlalchemy.dialects.postgresql import JSONB, ARRAY, TEXT

# ============= USER MODELS =============
class UserBase(SQLModel):
    firstName: str
    lastName: str
    email: str
    role: str
    isAdmin: bool = False

class UserCreate(UserBase):
    password: Optional[str] = None

class UserUpdate(SQLModel):
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    isAdmin: Optional[bool] = None

class UserPublic(SQLModel):
    userID: uuid.UUID
    firstName: str
    lastName: str
    email: str
    role: str
    lastLogin: Optional[datetime] = None
    isAdmin: bool = False
    calendarID: Optional[str] = None
    calendarColor: Optional[str] = None
    isActive: bool = Field(default=False)

class UsersList(SQLModel):
    data: list[UserPublic]
    count: int

class User(SQLModel, table=True):
    __tablename__ = "User" 
    __table_args__ = {"schema": "ent"}

    userID: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    firstName: str
    role: str
    passwordHash: str
    lastLogin: datetime = Field(default_factory=datetime.now)
    lastName: str
    email: str = Field(unique=True)
    isAdmin: bool = False
    calendarID: Optional[str] = None
    calendarColor: Optional[str] = None
    isActive: bool = Field(default=False)

class Message(SQLModel):
    message: str

# ============= PATIENT MODELS =============
class PatientBase(SQLModel):
    firstName: str
    lastName: str
    DOB: Optional[date] = None
    contactInfo: Optional[str] = None
    insuranceInfo: Optional[str] = None
    returningPatient: bool = False
    languagePreference: Optional[str] = None
    verified: bool = False

class Patient(PatientBase, table=True):
    __tablename__ = "Patient"
    __table_args__ = {"schema": "ent"}
    
    patientID: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True
    )

class PatientUpdate(SQLModel):
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    DOB: Optional[date] = None
    contactInfo: Optional[str] = None
    insuranceInfo: Optional[str] = None
    returningPatient: Optional[bool] = None
    languagePreference: Optional[str] = None
    verified: Optional[bool] = None

class PatientPublic(PatientBase):
    patientID: uuid.UUID

class PatientChangelog(SQLModel, table=True):
    __tablename__ = "PatientChangelog"
    __table_args__ = {"schema": "ent"}
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    patientID: uuid.UUID = Field(foreign_key="ent.Patient.patientID")
    changedAt: datetime = Field(default_factory=datetime.now    )
    changedBy: uuid.UUID = Field(foreign_key="ent.User.userID")
    fieldName: str = Field(max_length=100)
    oldValue: Optional[str] = None
    newValue: Optional[str] = None

# ============= TRIAGE CASE MODELS =============
class TriageCaseBase(SQLModel):
    transcript: Optional[str] = None
    AIConfidence: Optional[float] = None
    AISummary: Optional[str] = None
    status: str = "unreviewed"
    AIUrgency: Optional[str] = None
    clinicianNotes: Optional[str] = None
    overrideSummary: Optional[str] = None
    overrideUrgency: Optional[str] = None
    flags: Optional[Any] = Field(sa_type=JSONB)
    activeAppointmentID: Optional[uuid.UUID] = None

class TriageCase(TriageCaseBase, table=True):
    __tablename__ = "TriageCase"
    __table_args__ = {"schema": "ent"}
    
    caseID: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    patientID: uuid.UUID = Field(foreign_key="ent.Patient.patientID")
    dateCreated: datetime = Field(default_factory=datetime.now)
    createdBy: Optional[uuid.UUID] = None
    reviewReason: Optional[str] = None
    reviewTimestamp: Optional[datetime] = None
    reviewedBy: Optional[uuid.UUID] = None
    scheduledDate: Optional[datetime] = None

class TriageCaseCreate(SQLModel):
    patientID: uuid.UUID
    transcript: str
    AIConfidence: Optional[float] = None
    AISummary: Optional[str] = None
    AIUrgency: Optional[str] = None
    flags: Optional[Any] = Field(sa_type=JSONB)


class TriageCaseUpdate(SQLModel):
    transcript: Optional[str] = None
    status: Optional[str] = None
    overrideSummary: Optional[str] = None
    overrideUrgency: Optional[str] = None
    clinicianNotes: Optional[str] = None
    reviewReason: Optional[str] = None
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    DOB: Optional[date] = None
    contactInfo: Optional[str] = None
    insuranceInfo: Optional[str] = None
    returningPatient: Optional[bool] = None
    languagePreference: Optional[str] = None
    verified: Optional[bool] = None
    scheduledDate: Optional[datetime] = None

class TriageCaseReview(SQLModel):
    reviewReason: str

class TriageCasePublic(TriageCaseBase, PatientBase):
    caseID: uuid.UUID
    patientID: uuid.UUID
    dateCreated: datetime
    createdBy: Optional[uuid.UUID] = None
    reviewReason: Optional[str] = None
    reviewTimestamp: Optional[datetime] = None
    reviewedBy: Optional[uuid.UUID] = None
    reviewedByEmail: Optional[str] = None
    scheduledDate: Optional[datetime] = None
    previousUrgency: Optional[str] = None

class TriageCasesPublic(SQLModel):
    cases: list[TriageCasePublic] 
    count: int

class TriageCaseChangelog(SQLModel, table=True):
    __tablename__ = "TriageCaseChangelog"
    __table_args__ = {"schema": "ent"}
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    caseID: uuid.UUID = Field(foreign_key="ent.TriageCase.caseID")
    changedAt: datetime = Field(default_factory=datetime.now)
    changedBy: uuid.UUID = Field(foreign_key="ent.User.userID")
    fieldName: str = Field(max_length=100)
    oldValue: Optional[str] = None
    newValue: Optional[str] = None

# ============= AI FEEDBACK MODELS =============
class FeedbackRating(str, Enum):
    up = "up"
    down = "down"

class AIFeedbackBase(SQLModel):
    rating: Optional[FeedbackRating] = None
    tags: Optional[list[str]] = Field(
        default=None,
        sa_column=Column(ARRAY(TEXT))
    )    
    comment: Optional[str] = None

class AIFeedback(AIFeedbackBase, table=True):
    __tablename__ = "AIFeedback"
    __table_args__ = {"schema": "ent"}

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    caseID: uuid.UUID = Field(foreign_key="ent.TriageCase.caseID")
    createdBy: Optional[uuid.UUID] = Field(default=None, foreign_key="ent.User.userID")

    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

class AIFeedbackCreate(AIFeedbackBase):
    caseID: uuid.UUID

class AIFeedbackPublic(AIFeedbackBase):
    id: uuid.UUID
    caseID: uuid.UUID
    createdBy: Optional[uuid.UUID]

    createdAt: datetime
    updatedAt: datetime