import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  Stack,
  Divider,
  Switch,
  FormControlLabel,
  Collapse,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  CircularProgress,
  Paper,
  Grid,
} from "@mui/material";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useAuth } from "../../context/AuthContext";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import { toast } from "../../utils/toast";

import { appointmentService } from "../../api/appointmentService";
import { userService } from "../../api/userService";

const fmtTime = (t) => {
  const [h, m] = t.split(":").map(Number);
  return `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

const addThirtyMins = (time) => {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + 30;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

export default function ReviewCaseDialog({
  open,
  onClose,
  onReview,
  caseID,
  patientName,
}) {
  const { user } = useAuth();

  const [submitting, setSubmitting] = React.useState(false);
  const [scheduleAppt, setScheduleAppt] = React.useState(false);
  const [physicians, setPhysicians] = React.useState([]);
  const [slots, setSlots] = React.useState([]);
  const [loadingSlots, setLoadingSlots] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const loadPhysicians = async () => {
      try {
        const results = await userService.getAllUsers();
        const users = results.data;
        setPhysicians(users.filter((u) => u.role === "physician"));
      } catch {
        toast.error("Could not load physicians");
      }
    };
    loadPhysicians();
  }, [open]);

  const loadSlots = React.useCallback(async (physicianID, date) => {
    if (!physicianID || !date) return;
    setLoadingSlots(true);
    setSlots([]);
    try {
      const data = await appointmentService.getAvailability(
        physicianID,
        dayjs(date).format("YYYY-MM-DD"),
      );
      setSlots(data.slots);
    } catch {
      toast.error("Could not load available times");
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  const formik = useFormik({
    validateOnMount: true,
    enableReinitialize: true,
    initialValues: {
      reviewReason: "",
      physicianID: "",
      appointmentDate: null,
      appointmentTime: "",
    },
    validationSchema: Yup.object({
      reviewReason: Yup.string().required("Review reason is required"),
      physicianID: Yup.string().when([], {
        is: () => scheduleAppt,
        then: (s) => s.required("Physician is required"),
        otherwise: (s) => s.notRequired(),
      }),
      appointmentDate: Yup.mixed().when([], {
        is: () => scheduleAppt,
        then: (s) => s.required("Date is required").nullable(),
        otherwise: (s) => s.notRequired().nullable(),
      }),
      appointmentTime: Yup.string().when([], {
        is: () => scheduleAppt,
        then: (s) => s.required("Please select a time slot"),
        otherwise: (s) => s.notRequired(),
      }),
    }),
    onSubmit: async (values) => {
      setSubmitting(true);
      try {
        // if scheduling, create the appointment first
        if (
          scheduleAppt &&
          values.physicianID &&
          values.appointmentDate &&
          values.appointmentTime
        ) {
          const dateStr = dayjs(values.appointmentDate).format("YYYY-MM-DD");
          const endTime = addThirtyMins(values.appointmentTime);
          const scheduledAt = `${dateStr}T${values.appointmentTime}:00`;
          const scheduledEnd = `${dateStr}T${endTime}:00`;
          
          console.log(caseID, values.physicianID, scheduledAt, scheduledEnd);
          await appointmentService.createAppointment({
            caseID: caseID,
            physicianID: values.physicianID,
            scheduledAt,
            scheduledEnd,
          });
        }

        await onReview({
          reviewReason: values.reviewReason,
          ...(scheduleAppt &&
            values.appointmentDate && {
              scheduledDate: dayjs(values.appointmentDate).toDate(),
            }),
        });

        handleClose();
      } catch (err) {
        toast.error("Failed to submit review, please try again.");
      } finally {
        setSubmitting(false);
      }
    },
  });

  const handleToggleSchedule = (e) => {
    setScheduleAppt(e.target.checked);
    if (!e.target.checked) {
      formik.setFieldValue("physicianID", "");
      formik.setFieldValue("appointmentDate", null);
      formik.setFieldValue("appointmentTime", "");
      setSlots([]);
    }
  };

  const handlePhysicianChange = (e) => {
    const id = e.target.value;
    formik.setFieldValue("physicianID", id);
    formik.setFieldValue("appointmentTime", "");
    loadSlots(id, formik.values.appointmentDate);
  };

  const handleDateChange = (newValue) => {
    formik.setFieldValue("appointmentDate", newValue);
    formik.setFieldValue("appointmentTime", "");
    loadSlots(formik.values.physicianID, newValue);
  };

  const handleClose = () => {
    formik.resetForm();
    setScheduleAppt(false);
    setSlots([]);
    onClose();
  };

  const selectedPhysician = physicians.find(
    (p) => p.userID === formik.values.physicianID,
  );

  const submitLabel = () => {
    if (submitting) return "Submitting...";
    if (scheduleAppt && formik.values.appointmentTime)
      return "Submit Review & Schedule";
    return "Submit Review";
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography sx={{ fontWeight: 600 }}>
          Please Enter Review Details
        </Typography>
        {patientName && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {patientName}
          </Typography>
        )}
      </DialogTitle>
      <Divider />
      <DialogContent>
        <form onSubmit={formik.handleSubmit}>
          <Stack spacing={3}>
            <TextField
              fullWidth
              multiline
              rows={4}
              name="reviewReason"
              label="Review Reason *"
              placeholder="Describe the review..."
              value={formik.values.reviewReason}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={Boolean(
                formik.touched.reviewReason && formik.errors.reviewReason,
              )}
              helperText={
                formik.touched.reviewReason && formik.errors.reviewReason
              }
            />
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={scheduleAppt}
                    onChange={handleToggleSchedule}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      Schedule an Appointment (Optional)
                    </Typography>
                  </Box>
                }
              />
            </Box>
            <Collapse in={scheduleAppt} unmountOnExit>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderColor: "primary.light",
                  bgcolor: "primary.50",
                }}
              >
                <Stack spacing={2.5}>
                  <FormControl
                    fullWidth
                    error={Boolean(
                      formik.touched.physicianID && formik.errors.physicianID,
                    )}
                  >
                    <InputLabel>Physician *</InputLabel>
                    <Select
                      name="physicianID"
                      value={formik.values.physicianID}
                      onChange={handlePhysicianChange}
                      onBlur={formik.handleBlur}
                      label="Physician *"
                    >
                      {physicians.map((p) => (
                        <MenuItem key={p.userID} value={p.userID}>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              Dr. {p.firstName} {p.lastName}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {p.role}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                    {formik.touched.physicianID &&
                      formik.errors.physicianID && (
                        <Typography
                          variant="caption"
                          color="error"
                          sx={{ mt: 0.5, ml: 1.5 }}
                        >
                          {formik.errors.physicianID}
                        </Typography>
                      )}
                  </FormControl>
                  <DatePicker
                    label="Appointment Date *"
                    value={formik.values.appointmentDate}
                    onChange={handleDateChange}
                    disablePast
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        onBlur: formik.handleBlur,
                        name: "appointmentDate",
                        error: Boolean(
                          formik.touched.appointmentDate &&
                          formik.errors.appointmentDate,
                        ),
                        helperText:
                          formik.touched.appointmentDate &&
                          formik.errors.appointmentDate,
                      },
                    }}
                  />
                  {(loadingSlots || slots.length > 0) && (
                    <Box>
                      <Typography
                        variant="subtitle2"
                        fontWeight={600}
                        gutterBottom
                      >
                        Available Times
                      </Typography>

                      {loadingSlots && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            py: 1,
                          }}
                        >
                          <CircularProgress size={16} />
                          <Typography variant="caption" color="text.secondary">
                            Checking availability...
                          </Typography>
                        </Box>
                      )}
                      {!loadingSlots && slots.length > 0 && (
                        <>
                          <Grid container spacing={1}>
                            {slots.map((slot) => (
                              <Grid item key={slot.time}>
                                <Chip
                                  label={fmtTime(slot.time)}
                                  onClick={
                                    slot.available
                                      ? () =>
                                          formik.setFieldValue(
                                            "appointmentTime",
                                            slot.time,
                                          )
                                      : undefined
                                  }
                                  color={
                                    formik.values.appointmentTime === slot.time
                                      ? "primary"
                                      : "default"
                                  }
                                  variant={
                                    formik.values.appointmentTime === slot.time
                                      ? "filled"
                                      : "outlined"
                                  }
                                  disabled={!slot.available}
                                  size="small"
                                  sx={{
                                    cursor: slot.available
                                      ? "pointer"
                                      : "not-allowed",
                                    fontWeight: 500,
                                  }}
                                />
                              </Grid>
                            ))}
                          </Grid>
                          {formik.touched.appointmentTime &&
                            formik.errors.appointmentTime && (
                              <Typography
                                variant="caption"
                                color="error"
                                sx={{ mt: 0.5, display: "block" }}
                              >
                                {formik.errors.appointmentTime}
                              </Typography>
                            )}
                        </>
                      )}
                    </Box>
                  )}
                  {selectedPhysician &&
                    formik.values.appointmentDate &&
                    formik.values.appointmentTime && (
                        <Typography variant="body2">
                          <strong>
                            Dr. {selectedPhysician.firstName}{" "}
                            {selectedPhysician.lastName}
                          </strong>
                          {" · "}
                          {dayjs(formik.values.appointmentDate).format(
                            "ddd, MMM D YYYY",
                          )}
                          {" at "}
                          {fmtTime(formik.values.appointmentTime)}
                        </Typography>
                    )}
                </Stack>
              </Paper>
            </Collapse>
            <Box>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ fontWeight: 500 }}
              >
                Reviewed By
              </Typography>
              <Typography variant="body1" color="text.primary">
                {user.email}
              </Typography>
            </Box>
          </Stack>
        </form>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          disabled={submitting || !formik.isValid}
          onClick={formik.handleSubmit}
          variant="contained"
          startIcon={
            submitting ? <CircularProgress size={16} color="inherit" /> : null
          }
        >
          {submitLabel()}
        </Button>
        <Button onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}
