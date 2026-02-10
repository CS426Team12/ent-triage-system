import { Box, Typography, TextField } from "@mui/material";
import dayjs from "dayjs";

export default function RenderTextField({
  editMode,
  formik,
  fieldName,
  label,
  type = "text",
  props = {},
}) {
  const isDateTimeField = type === "datetime-local";

  if (!editMode) {
    let displayValue = formik.values[fieldName];

    if (displayValue && isDateTimeField) {
      displayValue = dayjs(displayValue).format("MM/DD/YYYY, h:mm A");
    }
    return (
      <Box>
        <Typography variant="subtitle2" color="textSecondary">
          {label}
        </Typography>
        <Typography variant="body2">{displayValue || "---"}</Typography>
      </Box>
    );
  }

  const isMultiline =
    fieldName === "aiSummary" ||
    fieldName === "clinicNotes" ||
    fieldName === "overrideSummary" ||
    fieldName === "caseResolutionReason";

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
      {...props}
    />
  );
}