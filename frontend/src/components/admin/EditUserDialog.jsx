import React, { useState } from "react";
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
} from "@mui/material";
import RenderTextField from "../fields/RenderTextField";
import RenderSelectField from "../fields/RenderSelectField";
import { USER_ROLE_OPTIONS } from "../../utils/consts";
import { getChangedFields } from "../../utils/utils"
import { useAuth } from "../../context/AuthContext";

export default function EditUserDialog({
  open,
  onClose,
  userData,
  onSave,
}) {
  const [editMode, setEditMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const isCurrentUser = user?.userID === userData?.userID;

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
        then: (schema) => schema.oneOf([true], "Admin role requires admin permissions to be enabled"),
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

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography sx={{ fontWeight: 600 }}>Edit User Details</Typography>
      </DialogTitle>
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
              overrides={{ onChange: handleRoleChange, disabled: isCurrentUser }}
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
                  disabled={!editMode || formik.values.role === "admin" || isCurrentUser}
                />
              }
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
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
      </DialogActions>
    </Dialog>
  );
}
