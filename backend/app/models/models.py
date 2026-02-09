from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime, date, timezone
import uuid

# ============= USER MODELS =============
class UserBase(SQLModel):
    firstName: str
    lastName: str
    email: str
    role: str

class UserCreate(UserBase):
    password: Optional[str] = None

class UserUpdate(SQLModel):
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None

class UserPublic(SQLModel):
    userID: uuid.UUID
    firstName: str
    lastName: str
    email: str
    role: str
    lastLogin: Optional[datetime] = None

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
    lastLogin: datetime = Field(default_factory=datetime.utcnow)
    lastName: str
    email: str = Field(unique=True)





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

# ============= TRIAGE CASE MODELS =============
class TriageCaseBase(SQLModel):
    transcript: Optional[str] = None
    AIConfidence: Optional[float] = None
    AISummary: Optional[str] = None
    status: str = "pending"
    AIUrgency: Optional[str] = None
    clinicianNotes: Optional[str] = None
    overrideSummary: Optional[str] = None
    overrideUrgency: Optional[str] = None

class TriageCase(TriageCaseBase, table=True):
    __tablename__ = "TriageCase"
    __table_args__ = {"schema": "ent"}
    
    caseID: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    patientID: uuid.UUID = Field(foreign_key="ent.Patient.patientID")
    dateCreated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    createdBy: Optional[uuid.UUID] = None
    reviewReason: Optional[str] = None
    reviewTimestamp: Optional[datetime] = None
    reviewedBy: Optional[uuid.UUID] = None
    overrideSummaryBy: Optional[uuid.UUID] = None
    overrideUrgencyBy: Optional[uuid.UUID] = None

class TriageCaseCreate(SQLModel):
    patientID: uuid.UUID
    transcript: str
    AIConfidence: Optional[float] = None
    AISummary: Optional[str] = None
    AIUrgency: Optional[str] = None

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
    overrideSummaryBy: Optional[uuid.UUID] = None
    overrideSummaryByEmail: Optional[str] = None
    overrideUrgencyBy: Optional[uuid.UUID] = None
    overrideUrgencyByEmail: Optional[str] = None

class TriageCasesPublic(SQLModel):
    cases: list[TriageCasePublic] 
    count: int