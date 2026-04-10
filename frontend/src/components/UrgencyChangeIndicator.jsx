import { Tooltip } from "@mui/material";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { red, green } from "@mui/material/colors";
import { URGENCY_PRIORITY, URGENCY_LABELS } from "../utils/consts";
import { URGENCY_COLORS } from "../theme";
import { EscalatedBadge, DeescalatedBadge } from "./common/SourceBadge";


export const UrgencyChangeIndicator = ({
  prevUrgency,
  currentUrgency,
  compact = false,
}) => {
  if (!prevUrgency || !currentUrgency || prevUrgency === currentUrgency) {
    return null;
  }

  const increased =
    URGENCY_PRIORITY[currentUrgency] < URGENCY_PRIORITY[prevUrgency];
  const Icon = increased ? ArrowDropUpIcon : ArrowDropDownIcon;
  const title = `Changed from ${URGENCY_LABELS[prevUrgency] ?? prevUrgency} to ${URGENCY_LABELS[currentUrgency] ?? currentUrgency}`;

  if (compact) {
    return (
      <Tooltip title={title} placement="right" arrow>
        <Icon sx={{ fontSize: 40, color: URGENCY_COLORS[currentUrgency] ?? (increased ? red[700] : green[700]) }} />
      </Tooltip>
    );
  }

  return increased
    ? <EscalatedBadge title={title} />
    : <DeescalatedBadge title={title} />;
};
