import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  Typography,
  Box,
  Divider,
} from "@mui/material";
import { calendarManagementService } from "../../api/calendarService";
import { toast } from "../../utils/toast";

export default function CalendarSetupDialog({ open, onClose, user, onUpdated }) {
  const [mode, setMode] = useState("create");
  const [calendarID, setCalendarID] = useState("");
  const [calendarIDError, setCalendarIDError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    setMode("create");
    setCalendarID("");
    setCalendarIDError("");
    onClose();
  };

  const handleSubmit = async () => {
    if (mode === "attach" && !calendarID.trim()) {
      setCalendarIDError("Calendar ID is required");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "create") {
        await calendarManagementService.createPhysicianCalendar(user.userID);
        toast.success("Calendar created successfully.");
      } else {
        await calendarManagementService.attachPhysicianCalendar(user.userID, calendarID.trim());
        toast.success("Calendar attached successfully.");
      }
      onUpdated();
      handleClose();
    } catch (err) {
      toast.error(
        mode === "create"
          ? "Failed to create calendar. Please try again."
          : "Failed to attach calendar. Please check the ID and try again.",
      );
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>Set Up Calendar</DialogTitle>
      <Divider />
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} pt={1}>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={(_, val) => val && setMode(val)}
            size="small"
            fullWidth
          >
            <ToggleButton value="create" sx={{ flex: 1, textTransform: "none" }}>
              Create New
            </ToggleButton>
            <ToggleButton value="attach" sx={{ flex: 1, textTransform: "none" }}>
              Attach Existing
            </ToggleButton>
          </ToggleButtonGroup>
          {mode === "create" ? (
            <Typography variant="body2" color="text.secondary">
              A new Google Calendar will be created and linked to Dr.{" "}
              {user?.firstName} {user?.lastName}'s account.
            </Typography>
          ) : (
            <TextField
              label="Google Calendar ID"
              placeholder="e.g. example@group.calendar.google.com"
              value={calendarID}
              onChange={(e) => {
                setCalendarID(e.target.value);
                setCalendarIDError("");
              }}
              error={!!calendarIDError}
              helperText={calendarIDError}
              fullWidth
              disabled={submitting}
              size="small"
              autoFocus
            />
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={submitting}>
          {mode === "create" ? "Create" : "Attach"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
