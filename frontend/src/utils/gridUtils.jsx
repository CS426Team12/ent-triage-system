import React from "react";
import { Chip, IconButton, Box } from "@mui/material";
import { Edit } from "@mui/icons-material";
import dayjs from "dayjs";
import { URGENCY_PRIORITY, URGENCY_LABELS } from "../utils/consts";
import theme, { URGENCY_COLORS } from "../theme";
import { CaseDetailsDialog } from "../components/caseDetails/CaseDetailsDialog";
import EditUserDialog from "../components/admin/EditUserDialog";
import { userService } from "../api/userService";
import { toast } from "../utils/toast";
import { UrgencyChangeIndicator } from "../components/UrgencyChangeIndicator";

export const UrgencyCellRenderer = (params) => {
  if (!params.value) return null;

  const label = URGENCY_LABELS[params.value];
  const color = URGENCY_COLORS[params.value];

  return (
    <Chip
      label={label}
      size="medium"
      sx={{
        backgroundColor: color,
        color: theme.palette.getContrastText(color),
        fontWeight: "bold",
        fontSize: "0.75rem",
      }}
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

export const UrgencyChangeCellRenderer = (params) => {
  const { previousUrgency, overrideUrgency, AIUrgency } = params.data;
  const current = overrideUrgency || AIUrgency;
  const prev = previousUrgency || AIUrgency;

  return <UrgencyChangeIndicator prevUrgency={prev} currentUrgency={current} />;
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

export const urgencyComparator = (a, b) => {
  return URGENCY_PRIORITY[a] - URGENCY_PRIORITY[b];
};
