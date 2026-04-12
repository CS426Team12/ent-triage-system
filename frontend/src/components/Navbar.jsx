import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Avatar,
  Popover,
  Stack,
  Divider,
} from "@mui/material";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { NAV_PAGES, roleLabel } from "../utils/consts";

export default function Navbar() {
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path) => location.pathname === path;

  // Account Popover user info
  const userRole = user?.role ?? null;
  const userInitial = user?.first_initial ?? "";
  const userFirstName = user?.firstName ?? "";
  const userLastName = user?.lastName ?? "";
  const username = `${userFirstName} ${userLastName}`;
  const isAdmin = user?.isAdmin ?? false;

  const handleOpenUserMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleCloseUserMenu = () => {
    setAnchorEl(null);
  };
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const accountPopoverOpen = Boolean(anchorEl);

  return (
    <AppBar position="static" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
      <Toolbar sx={{ py: 0.5 }}>
        <Typography
          variant="h6"
          component="div"
          color="text.primary"
          sx={{ flexGrow: 1, fontWeight: 700, letterSpacing: -0.3 }}
        >
          ENT Triage System
        </Typography>
        <Stack direction="row" spacing={0.5} sx={{ mr: 2 }}>
          {NAV_PAGES.filter((p) => !p.roles || p.roles.includes(userRole) || (p.hasAdminPermission && isAdmin)).map(
            ({ label, path, icon: Icon }) => (
              <Button
                key={label}
                startIcon={Icon && <Icon fontSize="small" />}
                onClick={() => navigate(path)}
                sx={{
                  fontWeight: isActive(path) ? 600 : 500,
                  px: 2,
                  py: 0.875,
                  borderRadius: 2,
                  textTransform: "none",
                  color: isActive(path) ? "primary.main" : "text.primary",
                  bgcolor: isActive(path) ? "action.hover" : "transparent",
                  "&:hover": {
                    bgcolor: "action.hover",
                    color: "primary.main",
                  },
                }}
              >
                {label}
              </Button>
            )
          )}
        </Stack>
        <IconButton
          size="large"
          edge="end"
          onClick={handleOpenUserMenu}
          sx={{
            ml: 1,
            "&:hover": {
              bgcolor: "action.hover",
            },
          }}
        >
          <Avatar
            sx={{
              bgcolor: "primary.main",
            }}
          >
            {userInitial}
          </Avatar>
        </IconButton>
        <Popover
          open={accountPopoverOpen}
          anchorEl={anchorEl}
          onClose={handleCloseUserMenu}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          slotProps={{ paper: { sx: { mt: 1, minWidth: 220 } } }}
        >
          <Stack direction="row" spacing={2} alignItems="center" sx={{ px: 2, py: 2 }}>
            <Avatar sx={{ bgcolor: "primary.main", width: 36, height: 36, fontSize: "0.9rem" }}>
              {userInitial}
            </Avatar>
            <Box>
              <Typography variant="subtitle2" fontWeight={600}>{username}</Typography>
              <Typography variant="caption" color="text.secondary">
                {roleLabel(userRole)}
              </Typography>
            </Box>
          </Stack>
          <Divider />
          <Box sx={{ p: 1.5 }}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              disableElevation
              size="small"
              onClick={handleLogout}
            >
              Logout
            </Button>
          </Box>
        </Popover>
      </Toolbar>
    </AppBar>
  );
}
