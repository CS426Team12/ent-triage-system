import { Box, Grid, Typography, Button } from "@mui/material";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import RenderTextField from "../fields/RenderTextField";
import RenderSelectField from "../fields/RenderSelectField";
import { UrgencyChangeIndicator } from "../UrgencyChangeIndicator";
import {
  URGENCY_VALUES,
  URGENCY_LABELS,
  RETURNING_PATIENT_OPTIONS,
  STATUS_VALUES,
} from "../../utils/consts";
import dayjs from "dayjs";

export const CaseDetailsForm = ({
  formik,
  caseData,
  editMode,
  setEditMode,
}) => {
  return (
    <Grid container spacing={4}>
      <Grid>
        <Typography variant="h8" sx={{ fontWeight: 600 }}>
          Patient Information
        </Typography>
        <Box mt={2} display="flex" flexDirection="column" gap={2}>
          <RenderTextField
            editMode={editMode}
            formik={formik}
            fieldName="firstName"
            label="First Name *"
          />
          <RenderTextField
            editMode={editMode}
            formik={formik}
            fieldName="lastName"
            label="Last Name *"
          />
          <RenderTextField
            editMode={editMode}
            formik={formik}
            fieldName="DOB"
            label="Date of Birth *"
            type="date"
          />
          <RenderTextField
            editMode={editMode}
            formik={formik}
            fieldName="contactInfo"
            label="Contact Information"
          />
          <RenderTextField
            editMode={editMode}
            formik={formik}
            fieldName="insuranceInfo"
            label="Insurance Info"
          />
          <RenderSelectField
            editMode={editMode}
            formik={formik}
            fieldName="returningPatient"
            label="Returning Patient"
            options={RETURNING_PATIENT_OPTIONS}
          />
        </Box>
      </Grid>

      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Typography variant="h8" sx={{ fontWeight: 600 }}>
          Case Information
        </Typography>
        <Box>
          <Box mb={2}>
            <Box display="flex" flexDirection="row" alignItems="center">
              <Typography
                variant="subtitle2"
                color="textSecondary"
                sx={{ fontWeight: 500 }}
              >
                Case Urgency
              </Typography>
              <UrgencyChangeIndicator
                prevUrgency={caseData.previousUrgency || caseData.AIUrgency}
                currentUrgency={caseData.overrideUrgency || caseData.AIUrgency}
              />
            </Box>
            <RenderSelectField
              editMode={editMode}
              formik={formik}
              fieldName="overrideUrgency"
              label=""
              options={Object.values(URGENCY_VALUES).map((v) => ({
                value: v,
                label: URGENCY_LABELS[v],
              }))}
              renderChip
            />
          </Box>
          <Box mb={2}>
            <Typography variant="subtitle2" color="textSecondary">
              Date Created
            </Typography>
            <Typography variant="body2">
              {dayjs(caseData.dateCreated).format("h:mm A, MM/DD/YYYY")}
            </Typography>
          </Box>
          <Typography variant="subtitle2" color="textSecondary">
            AI Summary
          </Typography>
          <Typography variant="body2">{caseData.AISummary || "---"}</Typography>
        </Box>
        {editMode || formik.values.overrideSummary ? (
          <RenderTextField
            editMode={editMode}
            formik={formik}
            fieldName="overrideSummary"
            label={`Override Summary`}
          />
        ) : (
          <Button onClick={() => setEditMode(true)}>Override Summary</Button>
        )}
        <RenderTextField
          editMode={editMode}
          formik={formik}
          fieldName="clinicianNotes"
          label="Clinician Notes"
        />
        {caseData?.status === STATUS_VALUES.REVIEWED && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="h8" sx={{ fontWeight: 600 }}>
              Review Information
            </Typography>
            <RenderTextField
              editMode={false}
              formik={formik}
              fieldName="reviewReason"
              label="Review Reason"
            />
            <RenderTextField
              editMode={false}
              formik={formik}
              fieldName="reviewedByEmail"
              label="Reviewed By"
            />
            {editMode ? (
              <DateTimePicker
                label="Scheduled Date"
                value={
                  formik.values.scheduledDate
                    ? dayjs(formik.values.scheduledDate)
                    : null
                }
                onChange={(newValue) => {
                  formik.setFieldValue(
                    "scheduledDate",
                    newValue ? newValue : null,
                  );
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    name: "scheduledDate",
                    onBlur: formik.handleBlur,
                  },
                }}
              />
            ) : (
              <RenderTextField
                editMode={false}
                formik={formik}
                fieldName="scheduledDate"
                label="Scheduled Date"
                type="datetime-local"
              />
            )}
          </Box>
        )}
      </Box>
    </Grid>
  );
}
