import { useState } from "react";
import {
  Box,
  Stack,
  Tooltip,
  CircularProgress,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  Divider,
} from "@mui/material";
import { CheckCircle } from "@mui/icons-material";
import { calendarManagementService } from "../api/calendarService";
import { toast } from "../utils/toast";

const GCAL_COLORS = [
  { hex: "#7986cb", label: "Lavender" },
  { hex: "#33b679", label: "Sage" },
  { hex: "#8e24aa", label: "Grape" },
  { hex: "#e67c73", label: "Flamingo" },
  { hex: "#f6bf26", label: "Banana" },
  { hex: "#f4511e", label: "Tangerine" },
  { hex: "#039be5", label: "Peacock" },
  { hex: "#616161", label: "Graphite" },
  { hex: "#3f51b5", label: "Blueberry" },
  { hex: "#0b8043", label: "Basil" },
  { hex: "#d50000", label: "Tomato" },
];

export const CalendarColorPicker = ({ open, onClose, user, onUpdated, closeModalOnSave }) => {
  const [savingColor, setSavingColor] = useState(null);

  const handleColorSelect = async (hex) => {
    if (hex === user?.calendarColor || savingColor) return;
    setSavingColor(hex);
    try {
      await calendarManagementService.updateCalendarColor(user.userID, hex);
      onUpdated?.();
      onClose();
      closeModalOnSave();
      toast.success("Calendar color updated.");
    } catch (err) {
      toast.error("Failed to update color, please try again.");
      console.error("Error updating calendar color", err);
    } finally {
      setSavingColor(null);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Typography fontWeight={600}>Calendar Color</Typography>
        <Typography variant="body2" color="text.secondary">
          Choose a Calendar Color
        </Typography>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {GCAL_COLORS.map(({ hex, label }) => (
            <Tooltip key={hex} title={label} arrow>
              <Box
                onClick={() => handleColorSelect(hex)}
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  bgcolor: hex,
                  cursor: savingColor ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "3px solid transparent",
                  outline:
                    user?.calendarColor === hex ? `3px solid ${hex}` : "none",
                  outlineOffset: "2px",
                  opacity: savingColor && savingColor !== hex ? 0.5 : 1,
                  transition: "all .15s",
                }}
              >
                {savingColor === hex && (
                  <CircularProgress size={16} sx={{ color: "#fff" }} />
                )}
                {user?.calendarColor === hex && !savingColor && (
                  <CheckCircle sx={{ fontSize: 16, color: "#fff" }} />
                )}
              </Box>
            </Tooltip>
          ))}
        </Stack>
      </DialogContent>
    </Dialog>
  );
};
