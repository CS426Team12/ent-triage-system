import React from "react";
import { Chip, IconButton, Box } from "@mui/material";
import { Edit } from "@mui/icons-material";
import dayjs from "dayjs";
import { URGENCY_PRIORITY, URGENCY_LABELS } from "../utils/consts";
import { URGENCY_COLORS } from "../theme";
import { CaseDetailsDialog } from "../components/caseDetails/CaseDetailsDialog";
import EditUserDialog from "../components/admin/EditUserDialog";
import { userService } from "../api/userService";
import { triageCaseService } from "../api/triageCaseService";
import { patientService } from "../api/patientService";
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
        color: "white",
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

  const handleSave = async (updatedData) => {
    if (Object.keys(updatedData).length === 0) return;
    const isReviewing = Boolean(updatedData.reviewReason);

    try {
      if (isReviewing) {
        // review case (no patient updates during review)
        await triageCaseService.reviewCase(caseData.caseID, {
          reviewReason: updatedData.reviewReason,
          scheduledDate: updatedData.scheduledDate || null,
        });
        toast.success("Successfully reviewed case");
      } else {
        // regular update - split patient and case fields
        const patientFields = [
          "firstName",
          "lastName",
          "DOB",
          "contactInfo",
          "insuranceInfo",
          "returningPatient",
        ];
        const caseFields = [
          "overrideUrgency",
          "overrideSummary",
          "clinicianNotes",
          "scheduledDate",
        ];

        const patientUpdates = {};
        const caseUpdates = {};

        Object.keys(updatedData).forEach((key) => {
          if (patientFields.includes(key)) {
            patientUpdates[key] = updatedData[key];
          } else if (caseFields.includes(key)) {
            caseUpdates[key] = updatedData[key];
          }
        });

        // update patient if there are patient changes
        if (Object.keys(patientUpdates).length > 0) {
          await patientService.updatePatient(caseData.patientID, patientUpdates);
        }

        // update case if there are case changes
        if (Object.keys(caseUpdates).length > 0) {
          await triageCaseService.updateCase(caseData.caseID, caseUpdates);
        }

        toast.success("Successfully updated case");
      }
      params.onCaseUpdated?.(); // refresh grid after update
      handleClose();
    } catch (err) {
      toast.error("Failed to update case.");
      console.error("Failed to update case", err);
    }
  };

  return (
    <>
      <IconButton onClick={handleOpen} size="medium">
        <Edit />
      </IconButton>
      <CaseDetailsDialog
        open={open}
        onClose={handleClose}
        caseData={caseData}
        onSave={handleSave}
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
      <IconButton onClick={handleOpen} size="medium">
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

  return (
    <UrgencyChangeIndicator
      prevUrgency={prev}
      currentUrgency={current}
    />
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

export const urgencyComparator = (a, b) => {
  return URGENCY_PRIORITY[a] - URGENCY_PRIORITY[b];
};
