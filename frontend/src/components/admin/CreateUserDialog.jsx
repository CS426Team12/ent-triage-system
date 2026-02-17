import React from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider
} from "@mui/material";
import RenderTextField from "../fields/RenderTextField";
import RenderSelectField from "../fields/RenderSelectField";
import { USER_ROLE_OPTIONS } from "../../utils/consts";

export default function CreateUserDialog({ open, onClose, onSave }) {
  const [submitting, setSubmitting] = React.useState(false);

  const formik = useFormik({
    validateOnMount: true,
    initialValues: {
      firstName: "",
      lastName: "",
      email: "",
      role: "",
    },
    validationSchema: Yup.object({
      firstName: Yup.string().required("First name is required"),
      lastName: Yup.string().required("Last name is required"),
      email: Yup.string()
        .email("Invalid email address")
        .required("Email is required"),
      role: Yup.string().required("Role is required"),
    }),
    onSubmit: async (values) => {
      setSubmitting(true);
      await onSave(values);
      setSubmitting(false);
      formik.resetForm();
    },
  });

  const handleClose = () => {
    formik.resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography sx={{ fontWeight: 600 }}>
            Create New User
          </Typography>
        </DialogTitle>
      <Divider />
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2}>
          <RenderTextField
            editMode={true}
            formik={formik}
            fieldName="firstName"
            label="First Name *"
          />
          <RenderTextField
            editMode={true}
            formik={formik}
            fieldName="lastName"
            label="Last Name *"
          />
          <RenderTextField
            editMode={true}
            formik={formik}
            fieldName="email"
            label="Email *"
            type="email"
          />
          <RenderSelectField
            editMode={true}
            formik={formik}
            fieldName="role"
            label="Role *"
            options={USER_ROLE_OPTIONS}
          />
          <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
            An invitation email with login credentials will be sent to the user.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button disabled={submitting || !formik.isValid} onClick={formik.handleSubmit} variant="contained">
          Create User
        </Button>
      </DialogActions>
    </Dialog>
  );
}
