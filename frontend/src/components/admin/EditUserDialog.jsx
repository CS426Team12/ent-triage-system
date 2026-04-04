import { useState, useMemo } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Typography,
  Divider,
  Switch,
  FormControlLabel,
  Box,
  Stack,
} from "@mui/material";
import AlertDialog from "../AlertDialog";
import RenderTextField from "../fields/RenderTextField";
import RenderSelectField from "../fields/RenderSelectField";
import { USER_ROLE_OPTIONS, ADMIN_PERMISSION_ROLES } from "../../utils/consts";
import { getChangedFields } from "../../utils/utils";
import { useAuth } from "../../context/AuthContext";
import { CalendarColorPicker } from "../CalendarColorPicker";
import { toast } from "../../utils/toast";
import { calendarManagementService } from "../../api/calendarService";
import dayjs from "dayjs";

export default function EditUserDialog({
  open,
  onClose,
  userData,
  onSave,
  onUpdated,
}) {
  const [editMode, setEditMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const isCurrentUser = user?.userID === userData?.userID;
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      firstName: userData?.firstName || "",
      lastName: userData?.lastName || "",
      email: userData?.email || "",
      role: userData?.role || "",
      isAdmin: userData?.isAdmin || false,
    },
    validationSchema: Yup.object({
      firstName: Yup.string().required("First name is required"),
      lastName: Yup.string().required("Last name is required"),
      email: Yup.string()
        .email("Invalid email address")
        .required("Email is required"),
      role: Yup.string().required("Role is required"),
      isAdmin: Yup.boolean().when("role", {
        is: "admin",
        then: (schema) =>
          schema.oneOf([true], "Role requires admin permissions to be enabled"),
        otherwise: (schema) => schema,
      }),
    }),
    onSubmit: async (values) => {
      const changedValues = getChangedFields(formik.initialValues, values);
      setSubmitting(true);
      await onSave(changedValues);
      setSubmitting(false);
      setEditMode(false);
    },
  });

  const handleRoleChange = (e) => {
    formik.setFieldValue("role", e.target.value);
    if (e.target.value === "admin") {
      formik.setFieldValue("isAdmin", true);
    }
  };

  const handleClose = () => {
    setEditMode(false);
    onClose();
  };

  const handleCreateCalendar = async () => {
    try {
      setSubmitting(true);
      await calendarManagementService.createPhysicianCalendar(userData?.userID);
      onUpdated(); //refresh user grid after update
      toast.success("Calendar created successfully.");
    } catch (error) {
      toast.error("Failed to create calendar. Please try again.");
      console.error(
        "Failed to create calendar: " + (error.message || "Unknown error"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivateUser = async () => {
    setDeactivateDialogOpen(true);
  };

  const handleConfirmDeactivate = async () => {
    // toast messages are handled upstream in onSave
    setSubmitting(true);
    setDeactivateDialogOpen(false);
    await onSave({ isActive: false });
    onUpdated();
    handleClose();
    setSubmitting(false);
  };

  const getRoleRank = (u) => {
    if (u?.role === "superuser") return 3;
    if (u?.role === "admin" || u?.isAdmin) return 2;
    return 1;
  };

  const isUserRankHigher = (selectedUser) => {
    if (!selectedUser?.isActive) return false;
    if (selectedUser?.userID === user?.userID) return false;
    return getRoleRank(user) > getRoleRank(selectedUser);
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Edit User Details</DialogTitle>
        <Divider />
        <DialogContent>
          <Grid container spacing={2}>
            <Grid size={6}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                First Name
              </Typography>
              <RenderTextField
                editMode={editMode}
                formik={formik}
                fieldName="firstName"
                overrides={{ disabled: submitting }}
              />
            </Grid>
            <Grid size={6}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Last Name
              </Typography>
              <RenderTextField
                editMode={editMode}
                formik={formik}
                fieldName="lastName"
                overrides={{ disabled: submitting }}
              />
            </Grid>
            <Grid size={12}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Email
              </Typography>
              <RenderTextField
                editMode={editMode}
                formik={formik}
                fieldName="email"
                type="email"
                overrides={{ disabled: !userData.isActive || submitting }}
              />
            </Grid>
            <Grid size={12}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Role
              </Typography>
              <RenderSelectField
                editMode={editMode}
                formik={formik}
                fieldName="role"
                options={USER_ROLE_OPTIONS}
                overrides={{
                  onChange: handleRoleChange,
                  disabled:
                    isCurrentUser ||
                    submitting ||
                    !isUserRankHigher(userData),
                }}
              />
            </Grid>
            <Grid size={12}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Admin Permissions
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={formik.values.isAdmin}
                    onChange={(e) =>
                      formik.setFieldValue("isAdmin", e.target.checked)
                    }
                    disabled={
                      !editMode ||
                      !isUserRankHigher(userData) ||
                      isCurrentUser ||
                      submitting
                    }
                  />
                }
              />
            </Grid>
            {!userData?.isActive &&
              (userData?.deactivatedAt && userData?.deactivatedByEmail ? (
                <Grid size={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    User was deactivated by {userData.deactivatedByEmail} on{" "}
                    {dayjs(userData.deactivatedAt).format("MM/DD/YYYY, h:mm A")}
                  </Typography>
                </Grid>
              ) : (
                <Grid size={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    User has not been activated yet.
                  </Typography>
                </Grid>
              ))}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between" }}>
          <Grid sx={{ display: "flex", gap: 1 }}>
            {userData?.role === "physician" &&
              !userData?.calendarID &&
              editMode && (
                <Button
                  disabled={submitting}
                  onClick={handleCreateCalendar}
                  variant="contained"
                >
                  Create Calendar
                </Button>
              )}
            {userData?.role === "physician" &&
              userData?.calendarID &&
              editMode && (
                <Button
                  onClick={() => setColorPickerOpen(true)}
                  variant="outlined"
                  startIcon={
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        bgcolor: userData?.calendarColor,
                        flexShrink: 0,
                      }}
                    />
                  }
                >
                  Calendar Color
                </Button>
              )}
            {editMode && isUserRankHigher(userData) && (
              <Button
                onClick={handleDeactivateUser}
                variant="contained"
                disabled={submitting}
              >
                Deactivate User
              </Button>
            )}
          </Grid>
          <Grid>
            {editMode ? (
              <>
                <Button onClick={() => setEditMode(false)}>Cancel</Button>
                <Button
                  disabled={submitting}
                  onClick={formik.handleSubmit}
                  variant="contained"
                >
                  Save
                </Button>
              </>
            ) : (
              <>
                {userData?.isActive && (
                  <Button onClick={() => setEditMode(true)} variant="contained">
                    Edit
                  </Button>
                )}
                <Button onClick={handleClose}>Close</Button>
              </>
            )}
          </Grid>
        </DialogActions>
        <CalendarColorPicker
          open={colorPickerOpen}
          onClose={() => setColorPickerOpen(false)}
          user={userData}
          onUpdated={onUpdated}
        />
      </Dialog>
      <AlertDialog
        open={deactivateDialogOpen}
        title="Confirm User Deactivation"
        description="Are you sure you want to deactivate this user?"
        onClose={() => setDeactivateDialogOpen(false)}
        onConfirm={handleConfirmDeactivate}
      />
    </>
  );
}
