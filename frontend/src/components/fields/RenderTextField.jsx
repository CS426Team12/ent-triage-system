import { Box, Typography, TextField } from "@mui/material";
import dayjs from "dayjs";

export default function RenderTextField({
  editMode,
  formik,
  fieldName,
  label,
  type = "text",
  overrides = {},
}) {
  const isDateTimeField = type === "datetime-local";

  if (!editMode) {
    let displayValue = formik.values[fieldName];

    if (displayValue && isDateTimeField) {
      displayValue = dayjs(displayValue).format("MM/DD/YYYY, h:mm A");
    }
    return (
      <Box sx={{ pb: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            fontSize: "0.62rem",
            color: "text.secondary",
          }}
        >
          {label}
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.25, color: "text.primary" }}>
          {displayValue || "—"}
        </Typography>
      </Box>
    );
  }

  const isMultiline =
    fieldName === "aiSummary" ||
    fieldName === "clinicNotes" ||
    fieldName === "overrideSummary" ||
    fieldName === "caseResolutionReason" ||
    fieldName === "clinicianNotes";

  return (
    <TextField
      fullWidth
      label={label}
      name={fieldName}
      type={type}
      value={formik.values[fieldName]}
      onChange={formik.handleChange}
      error={formik.touched[fieldName] && Boolean(formik.errors[fieldName])}
      helperText={formik.touched[fieldName] && formik.errors[fieldName]}
      multiline={isMultiline}
      {...overrides}
    />
  );
}
