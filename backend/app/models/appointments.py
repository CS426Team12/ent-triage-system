from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from uuid import uuid4
import uuid
from pydantic import BaseModel

class Appointment(SQLModel, table=True):
  __tablename__ = "Appointment"
  __table_args__ = {"schema": "ent"}

  appointmentID: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
  caseID: str = Field(foreign_key="ent.TriageCase.caseID")
  physicianID: str = Field(foreign_key="ent.User.userID")
  scheduledBy: str = Field(foreign_key="ent.User.userID")

  scheduledAt: datetime
  scheduledEnd: datetime
  durationMins: int = Field(default=30)

  gcalEventId: Optional[str] = None
  gcalCalendarId: Optional[str] = None

  status: str = Field(default="scheduled")
  cancelReason: str
  cancelledAt: Optional[datetime] = None

  createdAt: datetime = Field(default_factory=datetime.now)
  updatedAt: datetime = Field(default_factory=datetime.now)

class AppointmentCreate(BaseModel):
  caseID: uuid.UUID
  physicianID: uuid.UUID
  scheduledAt: datetime
  scheduledEnd: datetime

class AppointmentReschedule(BaseModel):
  scheduledAt: datetime
  scheduledEnd: datetime
  physicianID: uuid.UUID

class AppointmentCancel(BaseModel):
  cancelReason: str