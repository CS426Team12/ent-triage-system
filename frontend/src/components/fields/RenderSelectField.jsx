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
      <Box>
        <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5 }}>
          {label}
        </Typography>
        {renderChip ? (
          <UrgencyPill value={formik.values[fieldName]} />
        ) : (
          <Typography variant="body2">
            {options.find((o) => o.value === formik.values[fieldName])?.label ||
              "---"}
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
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
