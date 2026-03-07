import React from "react";
import {
  Box,
  Grid,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Divider,
  Switch,
  FormControlLabel,
} from "@mui/material";
import * as Yup from "yup";
import dayjs from "dayjs";
import { toast } from "../../../utils/toast";
import { calendarManagementService } from "../../../api/calendarService";
import { userService } from "../../../api/userService";
import { STATUS_VALUES } from "../../../utils/consts";
import { SchedulingForm } from "./SchedulingForm";
import { AvailabilityCalendar, addMinutes } from "./AvailabilityCalendar";
import { AppointmentInfo } from "./AppointmentInfo";

export const ScheduleTab = ({
  caseID,
  caseStatus,
  activeAppointmentID,
  onSave,
  handleClose,
}) => {
  const [physicians, setPhysicians] = React.useState([]);
  const [appointment, setAppointment] = React.useState(null);
  const [loadingAppointment, setLoadingAppointment] = React.useState(false);
  const [reviewReason, setReviewReason] = React.useState("");
  const [scheduleAppt, setScheduleAppt] = React.useState(false);
  const [physicianID, setPhysicianID] = React.useState("");
  const [appointmentDate, setAppointmentDate] = React.useState(null);
  const [appointmentTime, setAppointmentTime] = React.useState("");
  const [durationMins, setDurationMins] = React.useState(30);
  const [slots, setSlots] = React.useState([]);
  const [loadingSlots, setLoadingSlots] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("");
  const [showCancelForm, setShowCancelForm] = React.useState(false);
  const [showRescheduleForm, setShowRescheduleForm] = React.useState(false);
  const [errors, setErrors] = React.useState({});

  const isUnreviewed = caseStatus !== STATUS_VALUES.REVIEWED;
  const hasAppointment = !!appointment;
  const isAppointmentInPast =
    hasAppointment && dayjs(appointment.scheduledAt).isBefore(dayjs());

  const fetchUsers = async () => {
    try {
      const results = await userService.getAllUsers();
      setPhysicians(results.data.filter((u) => u.role === "physician") || []);
    } catch (err) {
      toast.error("Failed to load physicians");
      console.error("Error fetching users:", err);
    }
  };

  const fetchAppointment = async () => {
    if (!activeAppointmentID) return;
    setLoadingAppointment(true);
    try {
      const appt =
        await calendarManagementService.getAppointmentById(activeAppointmentID);
      setAppointment(appt);
    } catch (err) {
      toast.error("Could not load appointment");
      console.error("Error fetching appointment:", err);
    } finally {
      setLoadingAppointment(false);
    }
  };

  React.useEffect(() => {
    fetchUsers();
  }, []);

  React.useEffect(() => {
    fetchAppointment();
  }, [activeAppointmentID]);

  const schema = React.useMemo(
    () =>
      Yup.object({
        reviewReason: isUnreviewed
          ? Yup.string().trim().required("Review reason is required")
          : Yup.string().notRequired(),

        physicianID:
          scheduleAppt ||
          (!isUnreviewed && !hasAppointment) ||
          showRescheduleForm
            ? Yup.string().required("Physician is required")
            : Yup.string().notRequired(),

        appointmentDate:
          scheduleAppt ||
          (!isUnreviewed && !hasAppointment) ||
          showRescheduleForm
            ? Yup.mixed().required("Appointment date is required").nullable()
            : Yup.mixed().notRequired().nullable(),

        appointmentTime:
          scheduleAppt ||
          (!isUnreviewed && !hasAppointment) ||
          showRescheduleForm
            ? Yup.string().required("Please select a time slot")
            : Yup.string().notRequired(),

        cancelReason: showCancelForm
          ? Yup.string().trim().required("Cancel reason is required")
          : Yup.string().notRequired(),
      }),
    [
      isUnreviewed,
      hasAppointment,
      scheduleAppt,
      showRescheduleForm,
      showCancelForm,
    ],
  );

  const validate = React.useCallback(
    async (values) => {
      try {
        await schema.validate(values, { abortEarly: false });
        setErrors({});
        return true;
      } catch (err) {
        setErrors(
          Object.fromEntries(err.inner.map((e) => [e.path, e.message])),
        );
        return false;
      }
    },
    [schema],
  );

  const loadSlots = React.useCallback(async (pid, date) => {
    if (!pid || !date) return;
    setLoadingSlots(true);
    setSlots([]);
    setAppointmentTime("");
    try {
      const data = await calendarManagementService.getAvailability(
        pid,
        dayjs(date).format("YYYY-MM-DD"),
      );
      setSlots(data.slots);
    } catch (err) {
      toast.error("Could not load available times");
      console.error("Error fetching availability:", err);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  const handlePhysicianChange = (e) => {
    setPhysicianID(e.target.value);
    setAppointmentTime("");
    loadSlots(e.target.value, appointmentDate);
  };

  const handleDateChange = (newValue) => {
    setAppointmentDate(newValue);
    setAppointmentTime("");
    loadSlots(physicianID, newValue);
  };

  const handleDurationChange = (mins) => {
    setDurationMins(mins);
    setAppointmentTime("");
  };

  const handleToggleSchedule = (e) => {
    setScheduleAppt(e.target.checked);
    setPhysicianID("");
    setAppointmentDate(null);
    setAppointmentTime("");
    setDurationMins(30);
    setSlots([]);
    setErrors({});
  };

  const handleToggleReschedule = (e) => {
    setShowRescheduleForm(e.target.checked);
    setPhysicianID("");
    setAppointmentDate(null);
    setAppointmentTime("");
    setDurationMins(30);
    setSlots([]);
    setErrors({});
  };

  const buildTimes = () => {
    const dateStr = dayjs(appointmentDate).format("YYYY-MM-DD");
    const scheduledAt = `${dateStr}T${appointmentTime}:00`;
    const scheduledEnd = `${dateStr}T${addMinutes(appointmentTime, durationMins)}:00`;
    return { scheduledAt, scheduledEnd };
  };

  const currentValues = {
    reviewReason,
    physicianID,
    appointmentDate,
    appointmentTime,
    cancelReason,
  };

  const handleSubmitReview = async () => {
    const valid = await validate(currentValues);
    if (!valid) return;
    setSubmitting(true);
    try {
      if (scheduleAppt && physicianID && appointmentDate && appointmentTime) {
        const { scheduledAt, scheduledEnd } = buildTimes();
        await calendarManagementService.createAppointment({
          caseID,
          physicianID,
          scheduledAt,
          scheduledEnd,
        });
      }
      await onSave({ reviewReason, caseID });
      handleClose();
    } catch (err) {
      toast.error("Failed to submit review");
      console.error("Error submitting review", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitSchedule = async () => {
    if (!(await validate(currentValues))) return;
    setSubmitting(true);
    try {
      const { scheduledAt, scheduledEnd } = buildTimes();
      await calendarManagementService.createAppointment({
        caseID,
        physicianID,
        scheduledAt,
        scheduledEnd,
      });
      toast.success("Appointment scheduled");
      handleClose();
    } catch (err) {
      toast.error("Failed to schedule appointment");
      console.error("Error scheduling appointment", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReschedule = async () => {
    if (!(await validate(currentValues))) return;
    setSubmitting(true);
    try {
      const { scheduledAt, scheduledEnd } = buildTimes();
      await calendarManagementService.rescheduleAppointment(
        activeAppointmentID,
        {
          scheduledAt,
          scheduledEnd,
          ...(physicianID !== appointment?.physicianID && { physicianID }),
        },
      );
      toast.success("Appointment rescheduled");
      handleClose();
    } catch (err) {
      toast.error("Failed to reschedule appointment");
      console.error("Error rescheduling appointment", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitCancel = async () => {
    if (!(await validate(currentValues))) return;
    setSubmitting(true);
    try {
      await calendarManagementService.cancelAppointment(
        activeAppointmentID,
        cancelReason,
      );
      toast.success("Appointment cancelled");
      handleClose();
    } catch (err) {
      toast.error("Failed to cancel appointment");
      console.error("Error cancelling appointment", err);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPhysician = physicians.find((p) => p.userID === physicianID);
  const submitIcon = submitting ? (
    <CircularProgress size={16} color="inherit" />
  ) : null;

  const schedulingFormProps = {
    physicians,
    physicianID,
    appointmentDate,
    durationMins,
    onPhysicianChange: handlePhysicianChange,
    onDateChange: handleDateChange,
    onDurationChange: handleDurationChange,
    errors,
    submitting,
  };

  const availabilityProps = {
    physicianID,
    appointmentDate,
    appointmentTime,
    durationMins,
    slots,
    loadingSlots,
    selectedPhysician,
    onTimeSelect: setAppointmentTime,
    errors,
    submitting,
  };

  // unreviewed
  if (isUnreviewed) {
    return (
      <Box display="flex" flexDirection="column" gap={3}>
        <Typography variant="h8" sx={{ fontWeight: 600 }}>
          Review Details
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={4}
          label="Review Reason *"
          placeholder="Describe the review..."
          value={reviewReason}
          onChange={(e) => setReviewReason(e.target.value)}
          error={!!errors.reviewReason}
          helperText={errors.reviewReason}
          disabled={submitting}
        />
        <FormControlLabel
          control={
            <Switch
              checked={scheduleAppt}
              onChange={handleToggleSchedule}
              disabled={submitting}
            />
          }
          label={
            <Typography variant="body2">Schedule an appointment</Typography>
          }
        />
        {scheduleAppt && (
          <Grid container spacing={4}>
            <Grid>
              <Typography variant="h8" sx={{ fontWeight: 600 }}>
                Appointment Details
              </Typography>
              <Box mt={2}>
                <SchedulingForm {...schedulingFormProps} />
              </Box>
            </Grid>
            <Box
              sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}
            >
              <AvailabilityCalendar {...availabilityProps} />
            </Box>
          </Grid>
        )}
        <Divider />
        <Box display="flex" justifyContent="flex-end" gap={1}>
          <Button
            variant="contained"
            disabled={submitting}
            onClick={handleSubmitReview}
            startIcon={submitIcon}
          >
            {scheduleAppt && physicianID && appointmentDate && appointmentTime
              ? "Submit Review & Schedule"
              : "Submit Review"}
          </Button>
          <Button onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
        </Box>
      </Box>
    );
  }

  // reviewed, has appointment
  if (hasAppointment) {
    return (
      <Box display="flex" flexDirection="column" gap={3}>
        <Typography variant="h8" sx={{ fontWeight: 600 }}>
          Scheduled Appointment
        </Typography>
        {loadingAppointment ? (
          <CircularProgress size={20} />
        ) : (
          <AppointmentInfo appointment={appointment} />
        )}
        {!isAppointmentInPast && (
          <Box display="flex" flexDirection="column" gap={1}>
            <FormControlLabel
              control={
                <Switch
                  checked={showRescheduleForm}
                  onChange={handleToggleReschedule}
                  disabled={showCancelForm}
                />
              }
              label={<Typography variant="body2">Reschedule</Typography>}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={showCancelForm}
                  onChange={(e) => {
                    setShowCancelForm(e.target.checked);
                    setShowRescheduleForm(false);
                  }}
                  disabled={showRescheduleForm}
                />
              }
              label={
                <Typography variant="body2">Cancel appointment</Typography>
              }
            />
          </Box>
        )}
        {showCancelForm && (
          <>
            <Divider />
            <Typography variant="h8" sx={{ fontWeight: 600 }}>
              Cancel Appointment
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Cancellation Reason *"
              value={cancelReason}
              disabled={submitting}
              onChange={(e) => setCancelReason(e.target.value)}
              error={!!errors.cancelReason}
              helperText={errors.cancelReason}
            />
          </>
        )}
        {showRescheduleForm && (
          <>
            <Divider />
            <Typography variant="h8" sx={{ fontWeight: 600 }}>
              Reschedule Appointment
            </Typography>
            <Grid container spacing={4}>
              <Grid>
                <SchedulingForm {...schedulingFormProps} />
              </Grid>
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <AvailabilityCalendar {...availabilityProps} />
              </Box>
            </Grid>
          </>
        )}
        <Divider />
        <Box display="flex" justifyContent="flex-end" gap={1}>
          {showCancelForm && (
            <Button
              variant="contained"
              disabled={submitting}
              onClick={handleSubmitCancel}
              startIcon={submitIcon}
            >
              Cancel Appointment
            </Button>
          )}
          {showRescheduleForm && (
            <Button
              variant="contained"
              disabled={submitting}
              onClick={handleSubmitReschedule}
              startIcon={submitIcon}
            >
              Reschedule Appointment
            </Button>
          )}
          <Button onClick={handleClose} disabled={submitting}>
            Close
          </Button>
        </Box>
      </Box>
    );
  }

  // reviewed, no appointment
  return (
    <Box display="flex" flexDirection="column" gap={3}>
      <Grid container spacing={4}>
        <Grid>
          <Typography variant="h8" sx={{ fontWeight: 600 }}>
            Appointment Details
          </Typography>
          <Box mt={2}>
            <SchedulingForm {...schedulingFormProps} />
          </Box>
        </Grid>
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          <AvailabilityCalendar {...availabilityProps} />
        </Box>
      </Grid>
      <Divider />
      <Box display="flex" justifyContent="flex-end" gap={1}>
        <Button
          variant="contained"
          disabled={submitting}
          onClick={handleSubmitSchedule}
          startIcon={submitIcon}
        >
          Schedule Appointment
        </Button>
        <Button onClick={handleClose} disabled={submitting}>
          Close
        </Button>
      </Box>
    </Box>
  );
};
