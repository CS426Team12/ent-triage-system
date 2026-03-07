import { Box, Typography } from "@mui/material";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const CLINIC_TZ = "America/Los_Angeles";

const InfoField = ({ label, value }) => (
  <Box>
    <Typography variant="subtitle2" color="textSecondary" sx={{ fontWeight: 500 }}>
      {label}
    </Typography>
    <Typography variant="body2">{value}</Typography>
  </Box>
);

export const AppointmentInfo = ({ appointment }) => (
  <Box display="flex" flexDirection="row" gap={4} flexWrap="wrap">
    <InfoField
      label="Physician"
      value={appointment.physicianName}
    />
    <InfoField
      label="Date"
      value={dayjs(appointment.scheduledAt).tz(CLINIC_TZ).format("ddd, MMM D YYYY")}
    />
    <InfoField
      label="Time"
      value={`${dayjs(appointment.scheduledAt).tz(CLINIC_TZ).format("h:mm A")} - ${dayjs(appointment.scheduledEnd).tz(CLINIC_TZ).format("h:mm A")}`}
    />
  </Box>
);