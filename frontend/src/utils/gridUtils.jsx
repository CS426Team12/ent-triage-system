import React from "react";
import { IconButton, Box, Typography } from "@mui/material";
import { Edit } from "@mui/icons-material";
import dayjs from "dayjs";
import { URGENCY_PRIORITY } from "../utils/consts";
import UrgencyPill from "../components/common/UrgencyPill";
import { AIBadge } from "../components/common/SourceBadge";
import { CaseDetailsDialog } from "../components/caseDetails/CaseDetailsDialog";
import EditUserDialog from "../components/admin/EditUserDialog";
import { userService } from "../api/userService";
import { toast } from "../utils/toast";
import { UrgencyChangeIndicator } from "../components/UrgencyChangeIndicator";

export const UrgencyCellRenderer = (params) => {
  if (!params.value) return null;

  const { AIUrgency, overrideUrgency } = params.data;

  return (
    <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
      <UrgencyPill value={params.value} />
      <UrgencyChangeIndicator
        prevUrgency={AIUrgency}
        currentUrgency={overrideUrgency || AIUrgency}
        compact
      />
    </Box>
  );
};

export const SummaryCellRenderer = (params) => {
  const { overrideSummary, AISummary } = params.data;
  const summary = overrideSummary || AISummary;
  const isAI = !overrideSummary;

  return (
    <span>
      {summary}
      {isAI && <AIBadge sx={{ marginLeft: 1 }} />}
    </span>
  );
};

export const UrgencyChangeCellRenderer = (params) => {
  const { AIUrgency, overrideUrgency } = params.data;
  return (
    <UrgencyChangeIndicator
      prevUrgency={AIUrgency}
      currentUrgency={overrideUrgency || AIUrgency}
      compact
    />
  );
};

export const EditCaseButtonCellRenderer = (params) => {
  const [open, setOpen] = React.useState(false);
  const caseData = params.data;

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <IconButton onClick={handleOpen} size="medium" aria-label="Edit case">
        <Edit />
      </IconButton>
      <CaseDetailsDialog
        open={open}
        onClose={handleClose}
        caseData={caseData}
        onUpdated={params.onCaseUpdated}
      />
    </>
  );
};

export const EditUserButtonCellRenderer = (params) => {
  const [open, setOpen] = React.useState(false);
  const userData = params.data;

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSave = async (updatedData) => {
    if (Object.keys(updatedData).length === 0) return;
    console.debug("Saving with data: ", updatedData);
    try {
      await userService.updateUser(userData.userID, updatedData);
      params.onUserUpdated?.(); //refresh user grid after update
      handleClose();
      toast.success(`Successfully updated user.`);
    } catch (err) {
      toast.error(`Failed to update user.`);
      console.error("Failed to update user: " + (err.message || "Unknown error"));
    }
  };

  return (
    <>
      <IconButton onClick={handleOpen} size="medium" aria-label="Edit User">
        <Edit />
      </IconButton>
      <EditUserDialog
        open={open}
        onClose={handleClose}
        userData={userData}
        onSave={handleSave}
        onUpdated={params.onUserUpdated}
      />
    </>
  );
};

export const ageValueGetter = (dob) => {
  if (!dob) return null;
  return dayjs().diff(dayjs(dob), "year");
};

export const concatNameValueGetter = (firstName, lastName) => {
  return `${firstName || ""} ${lastName || ""}`.trim();
};

export const dateTimeFormatter = (params) => {
  if (!params.value) return "";
  return dayjs(params.value).format("MM/DD/YYYY, h:mm A");
};

export const relativeDateFormatter = (params) => {
  if (!params.value) return "";
  const date = dayjs(params.value);
  const now = dayjs();
  if (date.isSame(now, "day")) {
    const diffMins = now.diff(date, "minute");
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = now.diff(date, "hour");
    return `${diffHours}h ago`;
  }
  return date.format("MM/DD/YYYY, h:mm A");
};

export const urgencyComparator = (a, b) => {
  return URGENCY_PRIORITY[a] - URGENCY_PRIORITY[b];
};
