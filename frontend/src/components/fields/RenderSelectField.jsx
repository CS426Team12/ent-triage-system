import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from "@mui/material";
import theme, { URGENCY_COLORS, APP_COLORS } from "../../theme";

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
          <Chip
            key={formik.values[fieldName]}
            label={
              options.find((o) => o.value === formik.values[fieldName])
                ?.label || "---"
            }
            sx={{
              backgroundColor: URGENCY_COLORS[formik.values[fieldName]] ?? APP_COLORS.neutral[500],
              color: theme.palette.getContrastText(
                URGENCY_COLORS[formik.values[fieldName]] ?? APP_COLORS.neutral[500],
              ),
              fontWeight: 500,
            }}
          />
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
            <Chip
              label={options.find((o) => o.value === selected)?.label || "---"}
              sx={{
                backgroundColor: URGENCY_COLORS[selected] ?? APP_COLORS.neutral[500],
                color: theme.palette.getContrastText(URGENCY_COLORS[selected] ?? APP_COLORS.neutral[500]),
                fontWeight: 500,
              }}
            />
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
