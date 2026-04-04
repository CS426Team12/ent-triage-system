import React from "react";
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
  FormControlLabel,
  Switch,
} from "@mui/material";
import RenderTextField from "../fields/RenderTextField";
import RenderSelectField from "../fields/RenderSelectField";
import { USER_ROLE_OPTIONS, ADMIN_PERMISSION_ROLES } from "../../utils/consts";
import { useAuth } from "../../context/AuthContext";

export default function CreateUserDialog({ open, onClose, onSave }) {
  const [submitting, setSubmitting] = React.useState(false);
  const { user } = useAuth();

  const roleOptions = React.useMemo(() => {
    if (user?.role === "superuser") {
      return USER_ROLE_OPTIONS;
    } else {
      return USER_ROLE_OPTIONS.filter((option) => option.value !== "superuser");
    }
  }, [user]);

  const formik = useFormik({
    validateOnMount: true,
    initialValues: {
      firstName: "",
      lastName: "",
      email: "",
      role: "",
      isAdmin: false,
    },
    validationSchema: Yup.object({
      firstName: Yup.string().required("First name is required"),
      lastName: Yup.string().required("Last name is required"),
      email: Yup.string()
        .email("Invalid email address")
        .required("Email is required"),
      role: Yup.string().required("Role is required"),
      isAdmin: Yup.boolean().when("role", {
        is: (role) => ADMIN_PERMISSION_ROLES.includes(role),
        then: (schema) => schema.oneOf([true], "Admin role requires admin permissions to be enabled"),
        otherwise: (schema) => schema,
      }),
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

  const handleRoleChange = (e) => {
    formik.setFieldValue("role", e.target.value);
    if (ADMIN_PERMISSION_ROLES.includes(e.target.value)) {
      formik.setFieldValue("isAdmin", true);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography sx={{ fontWeight: 600 }}>Create New User</Typography>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Grid container spacing={2}>
          <RenderTextField
            editMode={true}
            formik={formik}
            fieldName="firstName"
            label="First Name *"
            overrides={{ disabled: submitting }}
          />
          <RenderTextField
            editMode={true}
            formik={formik}
            fieldName="lastName"
            label="Last Name *"
            overrides={{ disabled: submitting }}
          />
          <RenderTextField
            editMode={true}
            formik={formik}
            fieldName="email"
            label="Email *"
            type="email"
            overrides={{ disabled: submitting }}
          />
          <RenderSelectField
            editMode={true}
            formik={formik}
            fieldName="role"
            label="Role *"
            options={roleOptions}
            overrides={{ onChange: handleRoleChange, disabled: submitting }}
          />
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
                  disabled={ADMIN_PERMISSION_ROLES.includes(formik.values.role) || submitting}
                />
              }
            />
          </Grid>
          <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
            An invitation email with login credentials will be sent to the user.
          </Typography>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          disabled={submitting || !formik.isValid}
          onClick={formik.handleSubmit}
          variant="contained"
        >
          Create User
        </Button>
      </DialogActions>
    </Dialog>
  );
}
