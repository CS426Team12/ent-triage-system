import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  Stack,
  Divider,
} from "@mui/material";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useAuth } from "../../context/AuthContext";
export default function ReviewCaseDialog({ open, onClose, onReview }) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = React.useState(false);
  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      reviewReason: "",
      reviewedBy: user.email,
    },
    validationSchema: Yup.object({
      reviewReason: Yup.string().required("Review reason is required"),
    }),
    onSubmit: async (values) => {
      setSubmitting(true);
      await onReview({
        reviewReason: values.reviewReason, // api will autofill reviewedBy field
      });
      setSubmitting(false);
      formik.resetForm();
      console.log("Review Details: ", values);
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
          Please Enter Review Details
        </Typography>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <form onSubmit={formik.handleSubmit}>
          <Stack spacing={3}>
            <TextField
              fullWidth
              multiline
              rows={4}
              name="reviewReason"
              label="Review Reason"
              placeholder="Describe the review..."
              value={formik.values.reviewReason}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={Boolean(
                formik.touched.reviewReason &&
                  formik.errors.reviewReason
              )}
              helperText={
                formik.touched.reviewReason &&
                formik.errors.reviewReason
              }
            />
            <Box>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ fontWeight: 500 }}
              >
                Reviewed By
              </Typography>
              <Typography variant="body1" color="text.primary">
                {user.email}
              </Typography>
            </Box>
          </Stack>
        </form>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button disabled={submitting} onClick={formik.handleSubmit} variant="contained">
          Review
        </Button>
        <Button onClick={handleClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
