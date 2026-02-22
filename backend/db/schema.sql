CREATE SCHEMA IF NOT EXISTS ent;
SET search_path TO ent, public;

-- ============================================================
-- ENUMS
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'urgency_level_enum') THEN
        CREATE TYPE urgency_level_enum AS ENUM ('routine', 'semi-urgent', 'urgent');
    END IF;
END$$;

-- ============================================================
-- USER
-- ============================================================
CREATE TABLE "User" (
    "userID"       UUID PRIMARY KEY,
    "firstName"    TEXT NOT NULL,
    "lastName"     TEXT NOT NULL,
    "email"        TEXT UNIQUE,
    "role"         TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "lastLogin"    TIMESTAMPTZ
);

-- ============================================================
-- PATIENT
-- ============================================================
CREATE TABLE "Patient" (
    "patientID"          UUID PRIMARY KEY,
    "firstName"          TEXT NOT NULL,
    "lastName"           TEXT NOT NULL,
    "DOB"                DATE,
    "contactInfo"        TEXT,
    "insuranceInfo"      TEXT,
    "returningPatient"   BOOLEAN DEFAULT FALSE,
    "languagePreference" TEXT,
    "verified"           BOOLEAN DEFAULT FALSE
);

-- ============================================================
-- PATIENT CHANGELOG 
-- ============================================================
CREATE TABLE "PatientChangelog" (
    "id"         UUID PRIMARY KEY,
    "patientID"  UUID NOT NULL,
    "changedAt"  TIMESTAMPTZ DEFAULT NOW(),
    "changedBy"  UUID NOT NULL,
    "fieldName"  TEXT NOT NULL,
    "oldValue"   TEXT,
    "newValue"   TEXT,
    CONSTRAINT fk_patchangelog_patient
        FOREIGN KEY ("patientID") REFERENCES "Patient"("patientID") ON DELETE CASCADE,
    CONSTRAINT fk_patchangelog_user
        FOREIGN KEY ("changedBy") REFERENCES "User"("userID")
);

-- ============================================================
-- TRIAGE CASE
-- ============================================================
CREATE TABLE "TriageCase" (
    "caseID"            UUID PRIMARY KEY,
    "patientID"         UUID NOT NULL,
    "transcript"        TEXT,
    "AIConfidence"      DOUBLE PRECISION,
    "AISummary"         TEXT,
    "status"            TEXT DEFAULT 'unreviewed',
    "dateCreated"       TIMESTAMPTZ DEFAULT NOW(),
    "createdBy"         UUID,
    "reviewReason"      TEXT,
    "reviewTimestamp"   TIMESTAMPTZ,
    "reviewedBy"        UUID,
    "scheduledDate"     TIMESTAMPTZ,
    "overrideSummary"   TEXT,
    "AIUrgency"         urgency_level_enum,
    "overrideUrgency"   urgency_level_enum,
    "clinicianNotes"    TEXT,      
    CONSTRAINT fk_triage_patient
        FOREIGN KEY ("patientID") REFERENCES "Patient"("patientID") ON DELETE CASCADE,
    CONSTRAINT fk_triage_created_by
        FOREIGN KEY ("createdBy") REFERENCES "User"("userID"),
    CONSTRAINT fk_triage_reviewed_by
        FOREIGN KEY ("reviewedBy") REFERENCES "User"("userID")
);

-- ============================================================
-- TRIAGE CASE CHANGELOG
-- ============================================================
CREATE TABLE "TriageCaseChangelog" (
    "id"        UUID PRIMARY KEY,
    "caseID"    UUID NOT NULL,
    "changedAt" TIMESTAMPTZ DEFAULT NOW(),
    "changedBy" UUID NOT NULL,
    "fieldName" TEXT NOT NULL,
    "oldValue"  TEXT,
    "newValue"  TEXT,
    CONSTRAINT fk_casechangelog_case
        FOREIGN KEY ("caseID") REFERENCES "TriageCase"("caseID") ON DELETE CASCADE,
    CONSTRAINT fk_casechangelog_user
        FOREIGN KEY ("changedBy") REFERENCES "User"("userID")
);

-- ============================================================
-- MEDICAL IDENTIFIERS
-- ============================================================
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

-- ============================================================
-- TRANSCRIPT
-- ============================================================
CREATE TABLE "Transcript" (
    "transcriptID"      UUID PRIMARY KEY,
    "caseID"            UUID NOT NULL,
    "rawText"           TEXT,
    "entitiesExtracted" JSONB,
    "savedAt"           TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_transcript_case
        FOREIGN KEY ("caseID") REFERENCES "TriageCase"("caseID") ON DELETE CASCADE
);

-- ============================================================
-- AI INFERENCE
-- ============================================================
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

-- ============================================================
-- AUDIT LOG
-- ============================================================
CREATE TABLE "AuditLog" (
    "logID"         UUID PRIMARY KEY,
    "actorID"        UUID,
    "actorType"      TEXT,
    "resourceID"        UUID,
    "resourceType"      TEXT,
    "action"            TEXT,
    "status"            TEXT,
    "timestamp"     TIMESTAMPTZ DEFAULT NOW(),
    "changeDetails" JSONB,
    "ipAddress"    INET,
    "hash"          TEXT,
    "previousHash"  TEXT,
    "locked"        BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_audit_user
        FOREIGN KEY ("actorID") REFERENCES "User"("userID")
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_triage_patient        ON "TriageCase"("patientID");
CREATE INDEX idx_transcript_case       ON "Transcript"("caseID");
CREATE INDEX idx_aiinference_case      ON "AIInference"("caseID");
CREATE INDEX idx_audit_resource            ON "AuditLog"("resourceID");
CREATE INDEX idx_patchangelog_patient  ON "PatientChangelog"("patientID");
CREATE INDEX idx_casechangelog_case    ON "TriageCaseChangelog"("caseID");
CREATE OR REPLACE FUNCTION ent.validate_audit_resource()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."resourceType" IS NULL OR NEW."resourceID" IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.action IS NOT NULL AND upper(NEW.action) LIKE 'CREATE_%' THEN
    RETURN NEW;
  END IF;

  IF upper(NEW."resourceType") = 'USER' THEN
    IF NOT EXISTS (SELECT 1 FROM ent."User" WHERE "userID" = NEW."resourceID") THEN
      RAISE EXCEPTION 'AuditLog validation failed: resourceType USER but resourceID not found: %', NEW."resourceID";
    END IF;
  ELSIF upper(NEW."resourceType") = 'PATIENT' THEN
    IF NOT EXISTS (SELECT 1 FROM ent."Patient" WHERE "patientID" = NEW."resourceID") THEN
      RAISE EXCEPTION 'AuditLog validation failed: resourceType PATIENT but resourceID not found: %', NEW."resourceID";
    END IF;
  ELSIF upper(NEW."resourceType") = 'TRIAGE_CASE' THEN
    IF NOT EXISTS (SELECT 1 FROM ent."TriageCase" WHERE "caseID" = NEW."resourceID") THEN
      RAISE EXCEPTION 'AuditLog validation failed: resourceType TRIAGE_CASE but resourceID not found: %', NEW."resourceID";
    END IF;
  ELSE
    RAISE EXCEPTION 'AuditLog validation failed: unknown resourceType: %', NEW."resourceType";
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_validate_audit_resource
BEFORE INSERT OR UPDATE ON "AuditLog"
FOR EACH ROW
EXECUTE FUNCTION ent.validate_audit_resource();

CREATE INDEX IF NOT EXISTS idx_audit_resource ON "AuditLog"("resourceType", "resourceID");
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON "AuditLog"(timestamp);