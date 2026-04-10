import { Chip } from "@mui/material";

export default function Pill({
  label,
  icon,
  bgcolor,
  textColor = "#fff",
  size = "small",
  sx = {},
  ...rest
}) {
  return (
    <Chip
      label={label}
      icon={icon}
      size={size}
      sx={{
        backgroundColor: bgcolor,
        color: textColor,
        fontWeight: "bold",
        fontSize: "0.75rem",
        ...sx,
      }}
      {...rest}
    />
  );
}
