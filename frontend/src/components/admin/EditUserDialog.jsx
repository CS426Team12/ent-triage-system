import { useState } from "react";
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
  Box,
  Stack,
} from "@mui/material";
import RenderTextField from "../fields/RenderTextField";
import RenderSelectField from "../fields/RenderSelectField";
import { USER_ROLE_OPTIONS } from "../../utils/consts";
import { getChangedFields } from "../../utils/utils";
import { useAuth } from "../../context/AuthContext";
import { CalendarColorPicker } from "../CalendarColorPicker";
import CalendarSetupDialog from "./CalendarSetupDialog";

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
  const [calendarSetupOpen, setCalendarSetupOpen] = useState(false);

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
          schema.oneOf(
            [true],
            "Admin role requires admin permissions to be enabled",
          ),
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

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography sx={{ fontWeight: 600 }}>Edit User Details</Typography>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Grid container spacing={2}>
          <Grid item size={6}>
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
          <Grid item size={6}>
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
          <Grid item size={12}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Email
              </Typography>
              {!userData.isActive && editMode && (
                <Typography
                  variant="subtitle2"
                  color="textSecondary"
                  sx={{ fontWeight: 500 }}
                  gutterBottom
                >
                  User has not activated their account yet.
                </Typography>
              )}
            </Stack>
            <RenderTextField
              editMode={editMode}
              formik={formik}
              fieldName="email"
              type="email"
              overrides={{ disabled: !userData.isActive || submitting }}
            />
          </Grid>
          <Grid item size={12}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Role
            </Typography>
            <RenderSelectField
              editMode={editMode}
              formik={formik}
              fieldName="role"
              options={USER_ROLE_OPTIONS}
              overrides={{ disabled: isCurrentUser || submitting }}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ justifyContent: "space-between" }}>
        <Grid sx={{ display: "flex", gap: 1 }}>
          {userData?.role === "physician" &&
            !userData?.calendarID &&
            userData?.isActive &&
            editMode && (
              <Button
                disabled={submitting}
                onClick={() => setCalendarSetupOpen(true)}
                variant="contained"
              >
                Set Up Calendar
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
              <Button onClick={() => setEditMode(true)} variant="contained">
                Edit
              </Button>
              <Button onClick={handleClose}>Close</Button>
            </>
          )}
        </Grid>
      </DialogActions>
      <CalendarSetupDialog
        open={calendarSetupOpen}
        onClose={() => setCalendarSetupOpen(false)}
        user={userData}
        onUpdated={onUpdated}
      />
      <CalendarColorPicker
        open={colorPickerOpen}
        onClose={() => setColorPickerOpen(false)}
        user={userData}
        onUpdated={onUpdated}
      />
    </Dialog>
  );
}
