import {
  Box,
  FormControl,
  FormHelperText,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from "@mui/material";

export const PhysicianSelect = ({
  physicians,
  value,
  onChange,
  error,
  disabled,
  currentUserID,
}) => (
  <FormControl fullWidth error={!!error}>
    <InputLabel>Physician</InputLabel>
    <Select
      value={value}
      onChange={onChange}
      label={"Physician"}
      disabled={disabled}
    >
      {physicians.filter((p) => p.isActive).map((p) => (
        <MenuItem key={p.userID} value={p.userID} disabled={!p.calendarID}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
            }}
          >
            <Typography variant="body2" fontWeight={600}>
              Dr. {p.firstName} {p.lastName}{p.userID === currentUserID ? " (You)" : ""}
            </Typography>
            {!p.calendarID && (
              <Typography variant="caption" sx={{ ml: 2, fontStyle: "italic" }}>
                Calendar has not been configured.
              </Typography>
            )}
          </Box>
        </MenuItem>
      ))}
    </Select>
    {error && <FormHelperText>{error}</FormHelperText>}
  </FormControl>
);
