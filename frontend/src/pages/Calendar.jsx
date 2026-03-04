import Navbar from "../components/Navbar";
import { useEffect, useState, useMemo } from "react";
import {
  Box,
  Grid,
  Typography,
  Paper,
  Stack,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from "@mui/material";
import { CalendarMonth } from "@mui/icons-material";
import { userService } from "../api/userService";
import { toast } from "../utils/toast";

const GCAL_COLORS = ["#0EA5E9", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444"];

const VIEW_MODES = [
  { value: "WEEK", label: "Week" },
  { value: "MONTH", label: "Month" },
  { value: "AGENDA", label: "Agenda" },
];

export default function CalendarPage() {
  const [physicians, setPhysicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("WEEK");
  const [selectedPhysician, setSelectedPhysician] = useState(null);

  useEffect(() => {
    fetchPhysicians();
  }, []);

  const fetchPhysicians = async () => {
    setLoading(true);
    try {
      const results = await userService.getAllUsers();
      const users = results.data;
      const physicians = users.filter((u) => u.role === "physician");
      setPhysicians(physicians);
      if (physicians.every((p) => !p.calendarID)) {
        toast.warn(
          "No physician calendars configured. Run the setup script to create them.",
        );
      }
    } catch {
      toast.error("Could not load physician calendars");
    } finally {
      setLoading(false);
    }
  };

  const embedUrl = useMemo(() => {
    const withCal = physicians.filter((p) => p.calendarID);
    if (!withCal.length) return null;

    const toShow = selectedPhysician
      ? withCal.filter((p) => p.userID === selectedPhysician)
      : withCal;

    const srcs = toShow
      .map((p) => `src=${encodeURIComponent(p.calendarID)}`)
      .join("&");

    return (
      `https://calendar.google.com/calendar/embed?${srcs}` +
      `&ctz=America%2FLos_Angeles` +
      `&mode=${viewMode}` +
      `&showTitle=0` +
      `&showNav=1` +
      `&showDate=1` +
      `&showPrint=0` +
      `&showTabs=0` +
      `&showCalendars=0`
    );
  }, [physicians, viewMode, selectedPhysician]);

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
              }}
            >
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
                    }}
                  >
                    <CalendarMonth sx={{ fontSize: 24, color: "white" }} />
                  </Box>
                  <Typography
                    variant="h5"
                    color="text.primary"
                    sx={{ fontWeight: 600, flexGrow: 1 }}
                  >
                    Schedule
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {physicians
                      .filter((p) => p.calendarID)
                      .map((p, idx) => (
                        <Tooltip
                          key={p.userID}
                          title={`Dr. ${p.firstName} ${p.lastName}`}
                          arrow
                        >
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={0.5}
                            onClick={() =>
                              setSelectedPhysician(
                                selectedPhysician === p.userID
                                  ? null
                                  : p.userID,
                              )
                            }
                            sx={{
                              px: 1.5,
                              py: 0.5,
                              borderRadius: 20,
                              border: `1px solid ${GCAL_COLORS[idx % GCAL_COLORS.length]}40`,
                              bgcolor:
                                selectedPhysician === p.userID
                                  ? `${GCAL_COLORS[idx % GCAL_COLORS.length]}30`
                                  : `${GCAL_COLORS[idx % GCAL_COLORS.length]}12`,
                              cursor: "pointer",
                              transition: "all .15s",
                              outline:
                                selectedPhysician === p.userID
                                  ? `2px solid ${GCAL_COLORS[idx % GCAL_COLORS.length]}80`
                                  : "none",
                            }}
                          >
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                bgcolor: GCAL_COLORS[idx % GCAL_COLORS.length],
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              variant="caption"
                              fontWeight={600}
                              sx={{
                                color: GCAL_COLORS[idx % GCAL_COLORS.length],
                              }}
                            >
                              Dr. {p.lastName}
                            </Typography>
                          </Stack>
                        </Tooltip>
                      ))}
                  </Stack>
                  <ToggleButtonGroup
                    value={viewMode}
                    exclusive
                    onChange={(_, val) => val && setViewMode(val)}
                    size="small"
                  >
                    {VIEW_MODES.map((m) => (
                      <ToggleButton
                        key={m.value}
                        value={m.value}
                        sx={{ px: 2, textTransform: "none" }}
                      >
                        {m.label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Stack>
              </Box>
              <Box sx={{ height: "76vh", p: 2 }}>
                {loading && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                    }}
                  >
                    <CircularProgress />
                  </Box>
                )}

                {!loading && embedUrl && (
                  <iframe
                    src={embedUrl}
                    style={{
                      width: "100%",
                      height: "100%",
                      border: "none",
                      display: "block",
                      borderRadius: 8,
                    }}
                    title="Clinic Schedule"
                  />
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </>
  );
}
