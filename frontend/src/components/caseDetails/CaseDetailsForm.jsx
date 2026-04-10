import React from "react";
import { Box, Grid, Typography, Button, Divider } from "@mui/material";
import RenderTextField from "../fields/RenderTextField";
import RenderSelectField from "../fields/RenderSelectField";
import { UrgencyChangeIndicator } from "../UrgencyChangeIndicator";
import UrgencyPill from "../common/UrgencyPill";
import { AIBadge, OverrideBadge } from "../common/SourceBadge";
import { triageCaseService } from "../../api/triageCaseService";
import { patientService } from "../../api/patientService";
import { toast } from "../../utils/toast";
import { getChangedFields } from "../../utils/utils";
import {
  URGENCY_VALUES,
  URGENCY_LABELS,
  RETURNING_PATIENT_OPTIONS,
  STATUS_VALUES,
  FIELD_LABELS,
} from "../../utils/consts";
import dayjs from "dayjs";
import AIAnalysisCard from "./AIAnalysisCard";

export const CaseDetailsForm = ({
  formik,
  caseData,
  editMode,
  setEditMode,
  onUpdated,
  handleClose,
  feedback,
  onFeedbackChange,
}) => {
  const [submitting, setSubmitting] = React.useState(false);

  const handleSave = async () => {
    const updatedData = getChangedFields(formik.initialValues, formik.values);

    if (Object.keys(updatedData).length === 0) return;

    try {
      setSubmitting(true);
      // regular update - split patient and case fields
      const patientFields = [
        "firstName",
        "lastName",
        "DOB",
        "contactInfo",
        "insuranceInfo",
        "returningPatient",
      ];
      const caseFields = [
        "overrideUrgency",
        "overrideSummary",
        "clinicianNotes",
        "scheduledDate",
      ];

      const patientUpdates = {};
      const caseUpdates = {};

      Object.keys(updatedData).forEach((key) => {
        if (patientFields.includes(key)) {
          patientUpdates[key] = updatedData[key];
        } else if (caseFields.includes(key)) {
          caseUpdates[key] = updatedData[key];
        }
      });

      // update patient if there are patient changes
      if (Object.keys(patientUpdates).length > 0) {
        await patientService.updatePatient(caseData.patientID, patientUpdates);
      }

      // update case if there are case changes
      if (Object.keys(caseUpdates).length > 0) {
        await triageCaseService.updateCase(caseData.caseID, caseUpdates);
      }

      toast.success("Successfully updated case");
      onUpdated(caseData.caseID); // pass caseID so Dashboard refreshes selectedCase
      handleClose();
    } catch (err) {
      toast.error("Failed to update case.");
      console.error("Failed to update case", err);
    } finally {
      setSubmitting(false);
      setEditMode(false);
    }
  };

  return (
    <Grid container spacing={4}>
      <Grid size={4}>
        <Typography variant="h8" sx={{ fontWeight: 600 }}>
          Patient Information
        </Typography>
        <Box mt={2} display="flex" flexDirection="column" gap={2}>
          <RenderTextField
            editMode={editMode}
            formik={formik}
            fieldName="firstName"
            label={`${FIELD_LABELS.firstName}`}
            overrides={{ disabled: submitting }}
          />
          <RenderTextField
            editMode={editMode}
            formik={formik}
            fieldName="lastName"
            label={`${FIELD_LABELS.lastName}`}
            overrides={{ disabled: submitting }}
          />
          <RenderTextField
            editMode={editMode}
            formik={formik}
            fieldName="DOB"
            label={`${FIELD_LABELS.DOB}`}
            type="date"
            overrides={{ disabled: submitting }}
          />
          <RenderTextField
            editMode={editMode}
            formik={formik}
            fieldName="contactInfo"
            label={FIELD_LABELS.contactInfo}
            overrides={{ disabled: submitting }}
          />
          <RenderTextField
            editMode={editMode}
            formik={formik}
            fieldName="insuranceInfo"
            label={FIELD_LABELS.insuranceInfo}
            overrides={{ disabled: submitting }}
          />
          <RenderSelectField
            editMode={editMode}
            formik={formik}
            fieldName="returningPatient"
            label={FIELD_LABELS.returningPatient}
            options={RETURNING_PATIENT_OPTIONS}
            overrides={{ disabled: submitting }}
          />
        </Box>
        {caseData?.status === STATUS_VALUES.REVIEWED && (
          <Box mt={3} display="flex" flexDirection="column" gap={2}>
            <Divider />
            <Typography variant="h8" sx={{ fontWeight: 600, mt: 1 }}>
              Review Information
            </Typography>
            <RenderTextField
              editMode={false}
              formik={formik}
              fieldName="reviewReason"
              label={FIELD_LABELS.reviewReason}
            />
            <RenderTextField
              editMode={false}
              formik={formik}
              fieldName="reviewedByEmail"
              label={FIELD_LABELS.reviewedByEmail}
            />
            <RenderTextField
              editMode={false}
              formik={formik}
              fieldName="scheduledDate"
              label={FIELD_LABELS.scheduledDate}
              type="datetime-local"
            />
          </Box>
        )}
      </Grid>
      <Grid size={8}>
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="h8" sx={{ fontWeight: 600 }}>
            Case Information
          </Typography>
          <Box>
            <Box mb={2}>
              {editMode ? (
                <RenderSelectField
                  editMode={editMode}
                  formik={formik}
                  fieldName="overrideUrgency"
                  label="Case Urgency"
                  options={Object.values(URGENCY_VALUES).map((v) => ({
                    value: v,
                    label: URGENCY_LABELS[v],
                  }))}
                  renderChip
                  overrides={{ disabled: submitting }}
                />
              ) : (
                <Box>
                  <Box display="flex" alignItems="center" gap={0.75} sx={{ mb: 0.5 }}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Case Urgency
                    </Typography>
                    {caseData.overrideUrgency ? (
                      <OverrideBadge />
                    ) : (
                      <AIBadge />
                    )}
                    <UrgencyChangeIndicator
                      prevUrgency={caseData.previousUrgency || caseData.AIUrgency}
                      currentUrgency={caseData.overrideUrgency || caseData.AIUrgency}
                    />
                  </Box>
                  <UrgencyPill value={formik.values.overrideUrgency} />
                </Box>
              )}
            </Box>
            <Box mb={2}>
              <Typography variant="subtitle2" color="textSecondary">
                {FIELD_LABELS.dateCreated}
              </Typography>
              <Typography variant="body2">
                {dayjs(caseData.dateCreated).format("MM/DD/YYYY, h:mm A")}
              </Typography>
            </Box>
            <AIAnalysisCard
              caseData={caseData}
              feedback={feedback}
              onFeedbackChange={onFeedbackChange}
            />
          </Box>
          {editMode || formik.values.overrideSummary ? (
            <RenderTextField
              editMode={editMode}
              formik={formik}
              fieldName="overrideSummary"
              label={FIELD_LABELS.overrideSummary}
              overrides={{ disabled: submitting }}
            />
          ) : (
            <Button onClick={() => setEditMode(true)}>
              {FIELD_LABELS.overrideSummary}
            </Button>
          )}
          <RenderTextField
            editMode={editMode}
            formik={formik}
            fieldName="clinicianNotes"
            label={FIELD_LABELS.clinicianNotes}
            overrides={{ disabled: submitting }}
          />
        </Box>
      </Grid>
      <Grid size={12}>
        <Divider />
      </Grid>
      <Grid size={12} display="flex" justifyContent="flex-end" gap={1}>
        {editMode ? (
          <>
            <Button
              disabled={submitting || !formik.isValid}
              onClick={handleSave}
              variant="contained">
              Save
            </Button>
            <Button
              onClick={() => {
                formik.resetForm();
                setEditMode(false);
              }}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => setEditMode(true)} variant="contained">
              Edit
            </Button>
            <Button onClick={handleClose}>Close</Button>
          </>
        )}
      </Grid>
    </Grid>
  );
};
