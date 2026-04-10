import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import UrgencyPill from "../common/UrgencyPill";

export default function RenderSelectField({
  editMode,
  formik,
  fieldName,
  label,
  options,
  renderChip = false,
  overrides = {},
}) {
  // Two Types of select fields: with chips (urgencies) or normal text dropdown
  if (!editMode) {
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
        {renderChip ? (
          <Box mt={0.5}>
            <UrgencyPill value={formik.values[fieldName]} />
          </Box>
        ) : (
          <Typography variant="body2" sx={{ mt: 0.25, color: "text.primary" }}>
            {options.find((o) => o.value === formik.values[fieldName])?.label || "—"}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <FormControl fullWidth>
      <InputLabel id={`${fieldName}-label`}>{label}</InputLabel>
      <Select
        labelId={`${fieldName}-label`}
        id={`${fieldName}-select`}
        name={fieldName}
        value={formik.values[fieldName]}
        onChange={formik.handleChange}
        label={label}
        error={formik.touched[fieldName] && Boolean(formik.errors[fieldName])}
        renderValue={(selected) =>
          renderChip ? (
            <UrgencyPill value={selected} />
          ) : (
            options.find((o) => o.value === selected)?.label || selected
          )
        }
        {...overrides}>
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
