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
  Typography,
  Divider,
  Tabs,
  Tab,
} from "@mui/material";
import { CaseDetailsForm } from "./CaseDetailsForm";
import { CaseHistory } from "./CaseHistory";
import { ScheduleTab } from "./schedule/ScheduleTab";
import { STATUS_VALUES } from "../../utils/consts";
import { getChangedFields } from "../../utils/utils";

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index} style={{ height: "100%" }}>
      {value === index && <Box sx={{ height: "100%" }}>{children}</Box>}
    </div>
  );
}

export const CaseDetailsDialog = ({ open, onClose, caseData, onSave }) => {
  const [formData, setFormData] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const { user } = useAuth();

  useEffect(() => {
    if (caseData) {
      setFormData(caseData);
    }
  }, [caseData]);

  const formik = useFormik({
    validateOnMount: true,
    enableReinitialize: true,
    initialValues: {
      firstName: formData.firstName || "",
      lastName: formData.lastName || "",
      DOB: formData.DOB || "",
      contactInfo: formData.contactInfo || "",
      returningPatient: formData.returningPatient ?? false,
      insuranceInfo: formData.insuranceInfo || "Not Provided",
      overrideUrgency: formData.overrideUrgency
        ? formData.overrideUrgency
        : formData.AIUrgency || "",
      overrideSummary: formData.overrideSummary || "",
      clinicianNotes: formData.clinicianNotes || "",
      reviewReason: formData.reviewReason || "",
      reviewedByEmail: formData.reviewedByEmail || "",
      scheduledDate: formData.scheduledDate || "",
    },
    validationSchema: Yup.object({
      firstName: Yup.string().required("First name is required"),
      lastName: Yup.string().required("Last name is required"),
      DOB: Yup.string().required("DOB is required"),
      contactInfo: Yup.string(),
      insuranceInfo: Yup.string(),
      overrideSummary: Yup.string(),
      clinicianNotes: Yup.string(),
      overrideUrgency: Yup.string().required("Case urgency is required"),
      reviewReason: Yup.string().when("status", {
        is: STATUS_VALUES.REVIEWED,
        then: (schema) => schema.required("Review reason is required"),
      }),
      reviewedByEmail: Yup.string().when("status", {
        is: STATUS_VALUES.REVIEWED,
        then: (schema) => schema.required("Reviewed by is required"),
      }),
      scheduledDate: Yup.date(),
    }),
    onSubmit: async (values) => {
      const changedValues = getChangedFields(formik.initialValues, values);
      setSubmitting(true);
      await onSave(changedValues);
      setSubmitting(false);
      setEditMode(false);
    },
  });

  const handleClose = () => {
    if (editMode) {
      return;
    }
    setActiveTab(0);
    onClose();
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const isUnreviewed = formData?.status !== STATUS_VALUES.REVIEWED;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Typography sx={{ fontWeight: 600 }}>Case View</Typography>
      </DialogTitle>
      <Divider />
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        sx={{ borderBottom: 1, borderColor: "divider", px: 3 }}
      >
        <Tab label="Details" sx={{ textTransform: "none" }} />
        <Tab label="History" sx={{ textTransform: "none" }} />
        <Tab
          label={isUnreviewed ? "Review" : "Schedule"}
          sx={{ textTransform: "none" }}
        />
      </Tabs>
      <DialogContent sx={{ minHeight: "60vh" }}>
        <TabPanel value={activeTab} index={0}>
          <CaseDetailsForm
            formik={formik}
            caseData={caseData}
            editMode={editMode}
            setEditMode={setEditMode}
          />
        </TabPanel>
        <TabPanel value={activeTab} index={1}>
          <CaseHistory
            caseId={caseData?.caseID}
            patientId={caseData?.patientID}
          />
        </TabPanel>
        <TabPanel value={activeTab} index={2}>
          <ScheduleTab
            caseID={caseData?.caseID}
            caseStatus={formData?.status}
            scheduledDate={formData.scheduledDate}
            activeAppointmentID={formData.activeAppointmentID}
            onSave={onSave}
            onClose={handleClose}
          />
        </TabPanel>
      </DialogContent>
      <DialogActions>
        {editMode ? (
          <>
            <Button
              disabled={submitting || !formik.isValid}
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
            {activeTab === 0 && (
                <Button onClick={() => setEditMode(true)} variant="contained">
                  Edit
                </Button>
            )}
            {activeTab !== 2 && (
              <Button onClick={handleClose}>Close</Button>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};