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
} from "@mui/material";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { NAV_PAGES, roleLabel } from "../utils/consts";

export default function Navbar() {
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Account Popover user info
  const userRole = user?.role ?? null;
  const userInitial = user?.first_initial ?? "";
  const userFirstName = user?.firstName ?? "";
  const userLastName = user?.lastName ?? "";
  const username = `${userFirstName} ${userLastName}`;

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
    <AppBar position="static" color="inherit" elevation={0}>
      <Toolbar sx={{ py: 0.5 }}>
        <Typography
          variant="h6"
          component="div"
          color="text.primary"
          sx={{
            flexGrow: 1,
            fontWeight: 600,
          }}
        >
          ENT Triage System
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mr: 2 }}>
          {NAV_PAGES.filter((p) => !p.role || p.role === userRole).map(
            ({ label, path, icon: Icon }) => (
              <Button
                key={label}
                startIcon={Icon && <Icon />}
                color="inherit"
                onClick={() => navigate(path)}
                sx={{
                  fontWeight: 500,
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  textTransform: "none",
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
        >
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            p={2}
          >
            <Avatar
              sx={{
                bgcolor: "primary.main",
              }}
            >
              {userInitial}
            </Avatar>
            <Box>
              <Typography variant="subtitle1">{username}</Typography>
              <Typography variant="body2" color="text.secondary">
                {roleLabel(userRole)}
              </Typography>
            </Box>
          </Stack>
          <Box p={2}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              disableElevation
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
