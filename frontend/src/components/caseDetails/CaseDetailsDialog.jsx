import { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Divider,
  Tabs,
  Tab,
} from "@mui/material";
import { CaseDetailsForm } from "./CaseDetailsForm";
import { CaseHistory } from "./CaseHistory";
import { CaseFiles } from "./files/CaseFiles";
import { ScheduleTab } from "./schedule/ScheduleTab";
import { STATUS_VALUES } from "../../utils/consts";
import { feedbackService } from "../../api/feedbackService";
import { toast } from "../../utils/toast";

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index} style={{ height: "100%" }}>
      {value === index && <Box sx={{ height: "100%" }}>{children}</Box>}
    </div>
  );
}

export const CaseDetailsDialog = ({ open, onClose, caseData, onUpdated }) => {
  const [formData, setFormData] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [feedbackChanged, setFeedbackChanged] = useState(false);

  useEffect(() => {
    if (caseData) {
      setFormData(caseData);
    }
  }, [caseData]);

  // Load existing feedback when case changes or dialog opens
  const loadFeedback = async () => {
    try {
      const existingFeedback = await feedbackService.getFeedbackByCaseId(
        caseData.caseID,
      );
      setFeedback(existingFeedback);
      setFeedbackChanged(false);
    } catch (err) {
      // Feedback may not exist, which is fine
      console.log("No feedback found for this case");
    }
  };

  useEffect(() => {
    if (caseData?.caseID && open) {
      loadFeedback();
    }
  }, [caseData?.caseID, open]);

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
  });

  const saveFeedback = async () => {
    if (!feedbackChanged || !feedback) return;

    try {
      await feedbackService.submitFeedback(caseData.caseID, {
        caseID: caseData.caseID,
        rating: feedback.rating || undefined,
        tags:
          feedback.tags && feedback.tags.length > 0 ? feedback.tags : undefined,
        comment: feedback.comment || undefined,
      });
      setFeedbackChanged(false);
      await loadFeedback();
    } catch (err) {
      toast.error("Failed to save feedback");
      console.error("Error saving feedback:", err);
    }
  };

  const handleClose = async () => {
    if (editMode) {
      return;
    }
    // Save feedback from the Details tab before closing
    if (activeTab === 0) {
      try {
        await saveFeedback();
      } catch (err) {
        toast.error("Failed to save feedback");
        console.error("Error saving feedback on close:", err);
      }
    }
    setActiveTab(0);
    onClose();
  };

  const handleTabChange = async (event, newValue) => {
    // Save feedback from the Details tab before switching tabs
    if (activeTab === 0) {
      try {
        await saveFeedback();
      } catch (err) {
        toast.error("Failed to save feedback");
        console.error("Error saving feedback on tab change:", err);
      }
    }
    if (activeTab !== 0 && editMode) {
      setEditMode(false);
      formik.resetForm();
    }
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
        sx={{ borderBottom: 1, borderColor: "divider", px: 3 }}>
        <Tab label="Details" sx={{ textTransform: "none" }} />
        <Tab label="History" sx={{ textTransform: "none" }} />
        <Tab
          label={isUnreviewed ? "Review" : "Appointment"}
          sx={{ textTransform: "none" }}
        />
        <Tab label="Files" sx={{ textTransform: "none" }} />
      </Tabs>
      <DialogContent>
        <TabPanel value={activeTab} index={0}>
          <CaseDetailsForm
            formik={formik}
            caseData={caseData}
            editMode={editMode}
            setEditMode={setEditMode}
            onUpdated={onUpdated}
            handleClose={handleClose}
            feedback={feedback}
            onFeedbackChange={(updatedFeedback) => {
              setFeedback(updatedFeedback);
              setFeedbackChanged(true);
            }}
          />
        </TabPanel>
        <TabPanel value={activeTab} index={1}>
          <CaseHistory
            caseId={caseData?.caseID}
            patientId={caseData?.patientID}
            handleClose={handleClose}
          />
        </TabPanel>
        <TabPanel value={activeTab} index={2}>
          <ScheduleTab
            caseID={caseData?.caseID}
            caseStatus={formData?.status}
            scheduledDate={formData.scheduledDate}
            activeAppointmentID={formData.activeAppointmentID}
            handleClose={handleClose}
            onUpdated={onUpdated}
          />
        </TabPanel>
        <TabPanel value={activeTab} index={3}>
          <CaseFiles caseId={caseData?.caseID} />
        </TabPanel>
      </DialogContent>
    </Dialog>
  );
};
