import React, { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Typography,
  Button,
} from "@mui/material";
import { deepPurple } from "@mui/material/colors";
import apiClient from "../../api/axios";

export default function EmailForm() {
  const [submitted, setSubmitted] = useState(false);

  const formik = useFormik({
    initialValues: { email: "" },
    validationSchema: Yup.object({
      email: Yup.string()
        .email("Invalid email address")
        .required("Email is required"),
    }),
    onSubmit: async (values, { setSubmitting }) => {
      setSubmitted(true);
      try {
        await apiClient.post("/auth/forgot-password", {
          email: values.email,
        });
      } catch {
        console.error(err);
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: deepPurple[50],
      }}>
      <Card sx={{ width: 350, padding: 2 }}>
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {submitted ? (
            <>
              <Typography variant="h5" fontWeight="bold">
                Link Sent!
              </Typography>
              <Typography variant="body2">
                If an account exists for that email, a reset link has been sent.
              </Typography>
            </>
          ) : (
            <form onSubmit={formik.handleSubmit}>
              <Typography variant="h5" fontWeight="bold" marginBottom={2}>
                Forgot Password?
              </Typography>
              <Typography variant="body2" marginBottom={2}>
                Enter your email address associated with your account to receive
                a password reset link.
              </Typography>

              <TextField
                name="email"
                label="Email"
                fullWidth
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.email && Boolean(formik.errors.email)}
                helperText={formik.touched.email && formik.errors.email}
              />

              <Button
                type="submit"
                sx={{
                  mt: 2,
                  backgroundColor: deepPurple[500],
                  "&:hover": { backgroundColor: deepPurple[700] },
                  color: "#fff",
                  borderRadius: 3,
                  textTransform: "none",
                }}
                fullWidth
                disabled={formik.isSubmitting}>
                Send Reset Link
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
