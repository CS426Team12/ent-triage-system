import React, { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  TextField,
  Button,
  FormControl,
  InputLabel,
  OutlinedInput,
  InputAdornment,
  IconButton,
  Typography,
} from "@mui/material";
import { deepPurple } from "@mui/material/colors";
import { Visibility, VisibilityOff } from "@mui/icons-material";

export default function PasswordForm({ onSubmit, submitLabel }) {
  const [showPassword, setShowPassword] = useState(false);

  const formik = useFormik({
    initialValues: {
      password: "",
      confirmPassword: "",
    },
    validationSchema: Yup.object({
      password: Yup.string()
        .min(8, "Password must be at least 8 characters")
        .required("Password is required"),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref("password")], "Passwords must match")
        .required("Confirm your password"),
    }),
    onSubmit,
  });

  return (
    <form onSubmit={formik.handleSubmit}>
      <FormControl fullWidth sx={{ mt: 2 }}>
        <InputLabel
          error={formik.touched.password && Boolean(formik.errors.password)}>
          Password
        </InputLabel>
        <OutlinedInput
          name="password"
          type={showPassword ? "text" : "password"}
          value={formik.values.password}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.password && Boolean(formik.errors.password)}
          endAdornment={
            <InputAdornment position="end">
              <IconButton onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          }
          label="Password"
        />
        {formik.touched.password && formik.errors.password && (
          <Typography variant="caption" color="error">
            {formik.errors.password}
          </Typography>
        )}
      </FormControl>

      <TextField
        name="confirmPassword"
        label="Confirm Password"
        type="password"
        fullWidth
        sx={{ mt: 2 }}
        value={formik.values.confirmPassword}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={
          formik.touched.confirmPassword &&
          Boolean(formik.errors.confirmPassword)
        }
        helperText={
          formik.touched.confirmPassword && formik.errors.confirmPassword
        }
      />

      <Button
        type="submit"
        fullWidth
        sx={{
          mt: 3,
          backgroundColor: deepPurple[500],
          "&:hover": { backgroundColor: deepPurple[700] },
          color: "#fff",
          borderRadius: 3,
          textTransform: "none",
        }}
        disabled={formik.isSubmitting}>
        {submitLabel}
      </Button>
    </form>
  );
}
