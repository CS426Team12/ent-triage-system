import { Box, Typography, Chip } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { PhysicianSelect } from "./PhysicianSelect";
import { DURATIONS } from "../../utils/consts";

export const SchedulingForm = ({
  physicians,
  physicianID,
  appointmentDate,
  durationMins,
  onPhysicianChange,
  onDateChange,
  onDurationChange,
  errors = {},
}) => (
  <Box display="flex" flexDirection="column" gap={2}>
    <PhysicianSelect
      physicians={physicians}
      value={physicianID}
      onChange={onPhysicianChange}
      error={errors.physicianID}
    />
    <DatePicker
      label="Appointment Date"
      value={appointmentDate}
      onChange={onDateChange}
      disablePast
      slotProps={{
        textField: {
          fullWidth: true,
          error: !!errors.appointmentDate,
          helperText: errors.appointmentDate,
        },
      }}
    />
    <Box>
      <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
        Duration
      </Typography>
      <Box display="flex" flexDirection="row" gap={1} flexWrap="wrap">
        {DURATIONS.map((d) => (
          <Chip
            key={d.value}
            label={d.label}
            onClick={() => onDurationChange(d.value)}
            color={durationMins === d.value ? "primary" : "default"}
            variant={durationMins === d.value ? "filled" : "outlined"}
            size="small"
            sx={{ fontWeight: 500, cursor: "pointer" }}
          />
        ))}
      </Box>
    </Box>
  </Box>
);
