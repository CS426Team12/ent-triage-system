import theme, { URGENCY_COLORS } from "../../theme";
import { URGENCY_LABELS } from "../../utils/consts";
import Pill from "./Pill";

export default function UrgencyPill({ value, size = "small", sx = {} }) {
  if (!value) return null;

  const bgcolor = URGENCY_COLORS[value] ?? "#9e9e9e";
  const textColor = theme.palette.getContrastText(bgcolor);

  return (
    <Pill
      label={URGENCY_LABELS[value] ?? value}
      bgcolor={bgcolor}
      textColor={textColor}
      size={size}
      sx={sx}
    />
  );
}
