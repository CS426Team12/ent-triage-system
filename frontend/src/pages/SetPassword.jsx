import { useSearchParams } from "react-router-dom";
import { Box, Card, CardContent, Typography } from "@mui/material";
import PasswordForm from "../components/account/PasswordForm";
// import api from "../api";

export default function SetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token");

  const handleSubmit = async (values, { setSubmitting }) => {
    // await api.post("/auth/register", {
    //   token,
    //   password: values.password,
    // });
    console.log(values);
    setSubmitting(false);
  };

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}>
      <Card sx={{ width: 360 }}>
        <CardContent>
          <Typography variant="h5" fontWeight="bold">
            Set Your Password
          </Typography>

          <PasswordForm onSubmit={handleSubmit} submitLabel="Set Password" />
        </CardContent>
      </Card>
    </Box>
  );
}
