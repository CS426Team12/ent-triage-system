import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from "@mui/material";
import { URGENCY_COLORS } from "../../theme";

export default function RenderSelectField({
  editMode,
  formik,
  fieldName,
  label,
  options,
  renderChip = false,
}) {
  // Two Types of select fields: with chips (urgencies) or normal text dropdown
  if (!editMode) {
    return (
      <Box>
        <Typography variant="subtitle2" color="textSecondary">
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
              backgroundColor: URGENCY_COLORS[formik.values[fieldName]],
              color: "#fff",
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
      <InputLabel>{label}</InputLabel>
      <Select
        name={fieldName}
        value={formik.values[fieldName]}
        onChange={formik.handleChange}
        label={label}
        error={formik.touched[fieldName] && Boolean(formik.errors[fieldName])}
        renderValue={(selected) =>
          renderChip ? (
            <Chip
              label={options.find((o) => o.value === selected)?.label || "---"}
              sx={{ backgroundColor: URGENCY_COLORS[selected], color: "#fff" }}
            />
          ) : (
            options.find((o) => o.value === selected)?.label || selected
          )
        }>
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
