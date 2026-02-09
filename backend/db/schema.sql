CREATE SCHEMA IF NOT EXISTS ent;
SET search_path TO ent, public;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'urgency_level_enum') THEN
        CREATE TYPE urgency_level_enum AS ENUM ('low', 'medium', 'high');
    END IF;
END$$;

SET search_path TO ent, public;

CREATE TABLE "User" (
    "userID"       UUID PRIMARY KEY,
    "firstName"    TEXT NOT NULL,
    "role"         TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "lastLogin"    DATE,
    "lastName"     TEXT NOT NULL,
    "email"        TEXT UNIQUE
);

CREATE TABLE "Patient" (
    "patientID"          UUID PRIMARY KEY,
    "firstName"          TEXT NOT NULL,
    "DOB"                DATE,
    "contactInfo"        TEXT,
    "insuranceInfo"      TEXT,
    "returningPatient"   BOOLEAN DEFAULT FALSE,
    "languagePreference" TEXT,
    "verified"           BOOLEAN DEFAULT FALSE,
    "lastName"           TEXT NOT NULL
);

CREATE TABLE "TriageCase" (
    "caseID"              UUID PRIMARY KEY,
    "patientID"           UUID NOT NULL,
    "transcript"          TEXT,
    "AIConfidence"        DOUBLE PRECISION,
    "AISummary"           TEXT,
    "status"              TEXT,
    "dateCreated"         DATE DEFAULT CURRENT_DATE,
    "createdBy"           UUID,
    "reviewReason"        TEXT,
    "reviewTimestamp"     TIMESTAMPTZ,
    "reviewedBy"          UUID,
    "overrideSummary"     TEXT,
    "overrideSummaryBy"   UUID,
    "AIUrgency"           urgency_level_enum,
    "overrideUrgency"     urgency_level_enum,
    "overrideUrgencyBy"   UUID,
    "clinicianNotes"      TEXT,
    CONSTRAINT fk_triage_patient
        FOREIGN KEY ("patientID") REFERENCES "Patient"("patientID") ON DELETE CASCADE,
    CONSTRAINT fk_triage_created_by
        FOREIGN KEY ("createdBy") REFERENCES "User"("userID"),
    CONSTRAINT fk_triage_reviewed_by
        FOREIGN KEY ("reviewedBy") REFERENCES "User"("userID"),
    CONSTRAINT fk_triage_override_summary_by
        FOREIGN KEY ("overrideSummaryBy") REFERENCES "User"("userID"),
    CONSTRAINT fk_triage_override_urgency_by
        FOREIGN KEY ("overrideUrgencyBy") REFERENCES "User"("userID")
);

CREATE TABLE "MedicalIdentifiers" (
    "medicalID" UUID PRIMARY KEY,
    "patientID" UUID NOT NULL,
    "idType"    TEXT NOT NULL,
    "idValue"   TEXT NOT NULL,
    "source"    TEXT,
    "verified"  BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_medical_patient
        FOREIGN KEY ("patientID") REFERENCES "Patient"("patientID") ON DELETE CASCADE
);

CREATE TABLE "Transcript" (
    "transcriptID"      UUID PRIMARY KEY,
    "caseID"            UUID NOT NULL,
    "rawText"           TEXT,
    "entitiesExtracted" JSONB,
    "savedAt"           TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_transcript_case
        FOREIGN KEY ("caseID") REFERENCES "TriageCase"("caseID") ON DELETE CASCADE
);

CREATE TABLE "AIInference" (
    "inferenceID"     UUID PRIMARY KEY,
    "caseID"          UUID NOT NULL,
    "inputText"       TEXT,
    "modelName"       TEXT,
    "modelVersion"    TEXT,
    "outputText"      TEXT,
    "confidenceScore" DECIMAL,
    "timestamp"       TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_aiinference_case
        FOREIGN KEY ("caseID") REFERENCES "TriageCase"("caseID") ON DELETE CASCADE
);

CREATE TABLE "AuditLog" (
    "logID"         UUID PRIMARY KEY,
    "userID"        UUID NOT NULL,
    "caseID"        UUID,
    "timestamp"     TIMESTAMPTZ DEFAULT NOW(),
    "changeDetails" JSONB,
    "locked"        BOOLEAN DEFAULT FALSE,
    "hash"          TEXT,
    "previousHash"  TEXT,
    CONSTRAINT fk_audit_user
        FOREIGN KEY ("userID") REFERENCES "User"("userID"),
    CONSTRAINT fk_audit_case
        FOREIGN KEY ("caseID") REFERENCES "TriageCase"("caseID")
);

CREATE INDEX idx_triage_patient   ON "TriageCase"("patientID");
CREATE INDEX idx_transcript_case  ON "Transcript"("caseID");
CREATE INDEX idx_aiinference_case ON "AIInference"("caseID");
CREATE INDEX idx_audit_case       ON "AuditLog"("caseID");

ALTER TYPE urgency_level_enum RENAME VALUE 'low' TO 'routine';
ALTER TYPE urgency_level_enum RENAME VALUE 'medium' TO 'semi-urgent';
ALTER TYPE urgency_level_enum RENAME VALUE 'high' TO 'urgent';
