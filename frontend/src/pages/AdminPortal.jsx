import Navbar from "../components/Navbar";
import { useEffect, useState } from "react";
import { Grid, Typography, Box, Paper, Stack, Button } from "@mui/material";
import { SupervisorAccount } from "@mui/icons-material";
import SearchableDataGrid from "../components/grid/SearchableDataGrid";
import { userColumnDefs } from "../utils/coldefs/user";
import CreateUserDialog from "../components/admin/CreateUserDialog";
import { userService } from "../api/userService";
import { toast } from "../utils/toast";

export default function AdminPortal() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const results = await userService.getAllUsers();
    setUsers(results.data);
    setLoading(false);
  };

  const handleCreateUser = async (userData) => {
    try {
      await userService.createUser(userData);
      fetchUsers();
      setCreateUserOpen(false);
      toast.success(`Successfully created user.`);
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error(
          `Failed to create user: User with this email already exists.`
        );
      } else {
        toast.error(`Failed to create user, please try again.`);
      }
    }
  };

  return (
    <>
      <Navbar />
      <Box sx={{ bgcolor: "background.default" }}>
        <Grid container spacing={3} sx={{ p: 3 }}>
          <Grid size={12}>
            <Paper
              elevation={0}
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
                overflow: "hidden",
              }}>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: "primary.main",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                    <SupervisorAccount sx={{ fontSize: 24, color: "white" }} />
                  </Box>
                  <Typography
                    variant="h5"
                    color="text.primary"
                    sx={{ fontWeight: 600, flexGrow: 1 }}>
                    Admin
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    disableElevation
                    onClick={() => setCreateUserOpen(true)}>
                    Create User
                  </Button>
                </Stack>
              </Box>
              <Box sx={{ height: "76vh", p: 2 }}>
                <SearchableDataGrid
                  loading={loading}
                  rowData={users}
                  columnDefs={userColumnDefs(fetchUsers)}
                />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
      <CreateUserDialog
        open={createUserOpen}
        onClose={() => {
          setCreateUserOpen(false);
        }}
        onSave={handleCreateUser}
      />
    </>
  );
}
