import Navbar from "../components/Navbar";
import { useEffect, useState, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  Chip,
  Tabs,
  Tab,
} from "@mui/material";
import SearchableDataGrid from "../components/grid/SearchableDataGrid";
import { userColumnDefs } from "../utils/coldefs/users";
import CreateUserDialog from "../components/admin/CreateUserDialog";
import EditUserDialog from "../components/admin/EditUserDialog";
import { userService } from "../api/userService";
import { toast } from "../utils/toast";
import { SupervisorAccount } from "@mui/icons-material";

export default function AdminPortal() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editUserOpen, setEditUserOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const results = await userService.getAllUsers();
      setUsers(results.data || []);
    } catch (err) {
      toast.error("Failed to load users, please refresh.");
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (userData) => {
    try {
      await userService.createUser(userData);
      fetchUsers();
      setCreateUserOpen(false);
      toast.success("Successfully created user.");
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error("Failed to create user: User with this email already exists.");
      } else {
        toast.error("Failed to create user, please try again.");
      }
    }
  };

  const handleSaveUser = async (updatedData) => {
    if (Object.keys(updatedData).length === 0) return;
    try {
      await userService.updateUser(selectedUser.userID, updatedData);
      fetchUsers();
      setEditUserOpen(false);
      toast.success("Successfully updated user.");
    } catch (err) {
      toast.error("Failed to update user.");
      console.error("Failed to update user:", err);
    }
  };

  const handleRowClick = (params) => {
    setSelectedUser(params.data);
    setEditUserOpen(true);
  };

  const activeUsers = useMemo(() => users.filter((u) => u.isActive), [users]);
  const inactiveUsers = useMemo(() => users.filter((u) => !u.isActive), [users]);

  return (
    <>
      <Navbar />
      <Box
        sx={{ bgcolor: "background.default", minHeight: "calc(100vh - 65px)" }}
      >
        <Box sx={{ p: 3 }}>
          <Paper
            elevation={0}
            sx={{
              border: 1,
              borderColor: "divider",
              borderRadius: 2,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box
              sx={{ px: 2.5, py: 2, borderBottom: 1, borderColor: "divider" }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <SupervisorAccount
                      sx={{ fontSize: 24, color: "primary.main" }}
                    />
                    <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                      User Management
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    Create and manage system users
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  disableElevation
                  onClick={() => setCreateUserOpen(true)}
                >
                  Create User
                </Button>
              </Stack>
            </Box>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              sx={{
                borderBottom: 1,
                borderColor: "divider",
                bgcolor: "background.paper",
                px: 1,
              }}
            >
              <Tab
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <span>Active</span>
                    <Chip
                      label={activeUsers.length}
                      size="small"
                      color={activeTab === 0 ? "primary" : "default"}
                      sx={{ height: 20, fontSize: "0.7rem", fontWeight: 600 }}
                    />
                  </Stack>
                }
                sx={{ textTransform: "none", fontWeight: 500 }}
              />
              <Tab
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <span>Inactive</span>
                    <Chip
                      label={inactiveUsers.length}
                      size="small"
                      color={activeTab === 1 ? "primary" : "default"}
                      sx={{ height: 20, fontSize: "0.7rem", fontWeight: 600 }}
                    />
                  </Stack>
                }
                sx={{ textTransform: "none", fontWeight: 500 }}
              />
            </Tabs>

            {/* Grid */}
            <Box sx={{ height: "60vh", p: 2 }}>
              {activeTab === 0 && (
                <SearchableDataGrid
                  loading={loading}
                  rowData={activeUsers}
                  columnDefs={userColumnDefs()}
                  onRowClicked={handleRowClick}
                />
              )}
              {activeTab === 1 && (
                <SearchableDataGrid
                  loading={loading}
                  rowData={inactiveUsers}
                  columnDefs={userColumnDefs()}
                  onRowClicked={handleRowClick}
                />
              )}
            </Box>
          </Paper>
        </Box>
      </Box>

      <CreateUserDialog
        open={createUserOpen}
        onClose={() => setCreateUserOpen(false)}
        onSave={handleCreateUser}
      />
      {selectedUser && (
        <EditUserDialog
          open={editUserOpen}
          onClose={() => {
            setEditUserOpen(false);
            setSelectedUser(null);
          }}
          userData={selectedUser}
          onSave={handleSaveUser}
          onUpdated={fetchUsers}
        />
      )}
    </>
  );
}
