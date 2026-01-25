import { useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import React, { useState } from "react";
import { deepPurple } from "@mui/material/colors";
import {
  Button,
  Box,
  Card,
  CardContent,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  InputAdornment,
  OutlinedInput,
  IconButton,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleClickShowPassword = () => setShowPassword(!showPassword);

  const handleForgotPassword = () => {
    navigate("/forgot-password");
    console.log("Forgot Password clicked");
  };

  const formik = useFormik({
    initialValues: { email: "", password: "" },
    validationSchema: Yup.object({
      email: Yup.string()
        .email("Invalid email address")
        .required("Email is required"),
      password: Yup.string().required("Password is required"),
    }),
    onSubmit: async (values, { setSubmitting }) => {
      setError("");
      try {
        await login(values.email, values.password);
        navigate("/dashboard");
      } catch (err) {
        setError("Invalid email or password");
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
        <CardContent
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            textAlign: "center",
            padding: 2,
          }}>
          <Typography variant="h5" fontWeight="bold" sx={{ padding: 2 }}>
            Login
          </Typography>
          {/* Username */}
          <form onSubmit={formik.handleSubmit}>
            <TextField
              name="email"
              label="Email"
              variant="outlined"
              value={formik.values.email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.email && Boolean(formik.errors.email)}
              helperText={formik.touched.email && formik.errors.email}
              fullWidth
            />
            {/* Password */}
            <FormControl variant="outlined" fullWidth sx={{ mt: 2 }}>
              <InputLabel
                error={
                  formik.touched.password && Boolean(formik.errors.password)
                }>
                Password
              </InputLabel>

              <OutlinedInput
                name="password"
                type={showPassword ? "text" : "password"}
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={
                  formik.touched.password && Boolean(formik.errors.password)
                }
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton onClick={handleClickShowPassword} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                }
                label="Password"
              />

              {formik.touched.password && formik.errors.password && (
                <Typography
                  variant="caption"
                  color="error"
                  sx={{
                    marginTop: "3px",
                    marginLeft: "12px",
                    textAlign: "left",
                  }}>
                  {formik.errors.password}
                </Typography>
              )}
            </FormControl>
            {error && (
              <Typography
                variant="body2"
                color="error"
                sx={{ marginTop: "8px", textAlign: "center" }}>
                {error}
              </Typography>
            )}
            <Button
              type="submit"
              sx={{
                backgroundColor: deepPurple[500],
                "&:hover": { backgroundColor: deepPurple[700] },
                color: "#fff",
                borderRadius: 3,
                mt: 2,
                width: "100%",
                textTransform: "none",
              }}>
              Log In
            </Button>
            <Button
              variant="text"
              disableRipple
              onClick={handleForgotPassword}
              sx={{
                textTransform: "none",
                "&:hover": {
                  backgroundColor: "transparent",
                  color: deepPurple[800],
                },
                color: deepPurple[400],
                mt: 2,
              }}>
              Forgot Password?
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
