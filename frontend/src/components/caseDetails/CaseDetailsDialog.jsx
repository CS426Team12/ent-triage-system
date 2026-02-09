import { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useAuth } from "../../context/AuthContext";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Grid,
  Typography,
  Divider,
} from "@mui/material";
import RenderTextField from "../fields/RenderTextField";
import RenderSelectField from "../fields/RenderSelectField";
import ReviewCaseDialog from "./ReviewCaseDialog";
import {
  URGENCY_VALUES,
  URGENCY_LABELS,
  RETURNING_PATIENT_OPTIONS,
  STATUS_VALUES,
} from "../../utils/consts";
import { getChangedFields } from "../../utils/utils"
import dayjs from "dayjs";
import { UrgencyChangeIndicator } from "../UrgencyChangeIndicator";

export default function CaseDetailsDialog({ open, onClose, caseData, onSave }) {
  const [formData, setFormData] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (caseData) {
      setFormData(caseData);
    }
  }, [caseData]);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      firstName: formData.firstName || "",
      lastName: formData.lastName || "",
      DOB: formData.DOB || "",
      contactInfo: formData.contactInfo || "",
      returningPatient: formData.returningPatient ?? false,
      overrideUrgency: formData.overrideUrgency
        ? formData.overrideUrgency
        : formData.AIUrgency || "",
      insuranceInfo: formData.insuranceInfo || "Not Provided",
      overrideSummary: formData.overrideSummary || "",
      clinicianNotes: formData.clinicianNotes || "",
      reviewReason: formData.reviewReason || "",
      reviewedByEmail: formData.reviewedByEmail || "",
    },
    validationSchema: Yup.object({
      firstName: Yup.string().required("Name is required"),
      lastName: Yup.string().required("Name is required"),
      DOB: Yup.string().required("DOB is required"),
      contactInfo: Yup.string(),
      insuranceInfo: Yup.string(),
      overrideSummary: Yup.string(),
      clinicNotes: Yup.string(),
      overrideUrgency: Yup.string().required("Case urgency is required"),
      reviewReason: Yup.string().when("status", {
        is: STATUS_VALUES.REVIEWED,
        then: (schema) => schema.required("Review reason is required"),
      }),
      reviewedByEmail: Yup.string().when("status", {
        is: STATUS_VALUES.REVIEWED,
        then: (schema) => schema.required("Reviewed by is required"),
      }),
    }),
    onSubmit: async (values) => {
      const changedValues = getChangedFields(formik.initialValues, values);
      setSubmitting(true);
      await onSave(changedValues);
      setSubmitting(false);
      setEditMode(false);
    },
  });

  const handleOpenResolve = () => {
    formik.setFieldValue("resolvedBy", user?.username || "");
    setReviewMode(true);
  };

  const handleClose = () => {
    // prevent closing by clicking background when in edit mode
    if (editMode) {
      return;
    }
    onClose();
  };

  // Fields: Patient Name, DOB, Contact Info, Insurance Info, AiSummary, Override Summary, Clinician Notes
  // Dropdowns: Urgency Level, Returning Patient (Yes/No)

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Typography sx={{ fontWeight: 600 }}>Case Details</Typography>
        </DialogTitle>
        <Divider />
        <DialogContent>
          <Grid container spacing={4}>
            <Grid>
              {/* Left side content */}
              <Typography variant="h8" sx={{ fontWeight: 600 }}>
                Patient Information
              </Typography>
              <Box mt={2} display="flex" flexDirection="column" gap={2}>
                <RenderTextField
                  editMode={editMode}
                  formik={formik}
                  fieldName="firstName"
                  label="First Name"
                />
                <RenderTextField
                  editMode={editMode}
                  formik={formik}
                  fieldName="lastName"
                  label="Last Name"
                />
                <RenderTextField
                  editMode={editMode}
                  formik={formik}
                  fieldName="DOB"
                  label="Date of Birth"
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
              {/* Right side content */}
              <Typography variant="h8" sx={{ fontWeight: 600 }}>
                Case Information
              </Typography>
              <Box>
                <Box mb={2}>
                  <Box
                    display="flex"
                    flexDirection="row"
                    alignItems="center"
                  >
                    <Typography
                      variant="subtitle2"
                      color="textSecondary"
                      sx={{ fontWeight: 500 }}
                    >
                      Case Urgency
                    </Typography>
                    <UrgencyChangeIndicator
                      initialUrgency={caseData.AIUrgency}
                      currentUrgency={
                        caseData.overrideUrgency || caseData.AIUrgency
                      }
                      overrideBy={caseData.overrideUrgencyByEmail}
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
                <Typography variant="body2">
                  {caseData.AISummary || "---"}
                </Typography>
              </Box>
              {editMode || formik.values.overrideSummary ? (
                <RenderTextField
                  editMode={editMode}
                  formik={formik}
                  fieldName="overrideSummary"
                  label={`Override Summary (by ${caseData.overrideSummaryByEmail || "N/A"})`}
                />
              ) : (
                <Button onClick={() => setEditMode(true)}>
                  Override Summary
                </Button>
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
                  />{" "}
                </Box>
              )}
            </Box>
          </Grid>
        </DialogContent>
        <DialogActions>
          {editMode ? (
            <>
              <Button
                disabled={submitting}
                onClick={formik.handleSubmit}
                variant="contained"
              >
                Save
              </Button>
              <Button
                onClick={() => {
                  formik.resetForm();
                  setEditMode(false);
                }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setEditMode(true)} variant="contained">
                Edit
              </Button>
              {formData?.status !== STATUS_VALUES.REVIEWED && (
                <Button onClick={handleOpenResolve}>Review</Button>
              )}
              <Button onClick={onClose}>Close</Button>
            </>
          )}
        </DialogActions>
      </Dialog>
      <ReviewCaseDialog
        open={reviewMode}
        onClose={() => setReviewMode(false)}
        onReview={(data) => {
          onSave({
            reviewReason: data.reviewReason,
            caseID: caseData.caseID,
          });
          setReviewMode(false);
          onClose();
        }}
      />
    </>
  );
}
