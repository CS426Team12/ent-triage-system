import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { Tooltip } from "@mui/material";
import { grey, red, green } from "@mui/material/colors";
import { APP_COLORS } from "../../theme";
import Pill from "./Pill";

const badgeSx = {
  height: 18,
  fontSize: "0.6rem",
  fontWeight: 700,
  "& .MuiChip-label": { px: 1 },
  "& .MuiChip-icon": { fontSize: "12px !important", color: "#fff", ml: 0.75 },
};

export function AIBadge({ sx = {} }) {
  return (
    <Pill
      label="AI"
      icon={<AutoAwesomeIcon />}
      bgcolor={APP_COLORS.purple[600]}
      sx={{ ...badgeSx, ...sx }}
    />
  );
}

export function OverrideBadge({ sx = {} }) {
  return (
    <Pill
      label="Override"
      icon={<EditOutlinedIcon />}
      bgcolor={grey[500]}
      sx={{ ...badgeSx, ...sx }}
    />
  );
}

const changeBadgeSx = {
  ...badgeSx,
  "& .MuiChip-icon": { fontSize: "20px !important", color: "#fff", ml: 0.75 },
};

export function EscalatedBadge({ title, sx = {} }) {
  return (
    <Tooltip title={title} placement="right" arrow>
      <Pill
        label="Escalated"
        icon={<ArrowDropUpIcon />}
        bgcolor={red[700]}
        sx={{ ...changeBadgeSx, ...sx }}
      />
    </Tooltip>
  );
}

export function DeescalatedBadge({ title, sx = {} }) {
  return (
    <Tooltip title={title} placement="right" arrow>
      <Pill
        label="De-escalated"
        icon={<ArrowDropDownIcon />}
        bgcolor={green[700]}
        sx={{ ...changeBadgeSx, ...sx }}
      />
    </Tooltip>
  );
}
