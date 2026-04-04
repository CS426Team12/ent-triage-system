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
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import { userService } from "../api/userService";
import { calendarManagementService } from "../api/calendarService";
import { toast } from "../utils/toast";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { CaseDetailsDialog } from "../components/caseDetails/CaseDetailsDialog";
import { triageCaseService } from "../api/triageCaseService";
import { APP_COLORS } from "../theme";

dayjs.extend(utc);
dayjs.extend(timezone);

const CLINIC_TZ = "America/Los_Angeles";

const VIEW_MODES = [
  { value: "WEEK", label: "Week", fcView: "timeGridWeek" },
  { value: "MONTH", label: "Month", fcView: "dayGridMonth" },
  { value: "AGENDA", label: "Agenda", fcView: "listWeek" },
];

export const Calendar = () => {
  const [data, setData] = useState({ physicians: [], appointments: [] });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("WEEK");
  const [selectedPhysician, setSelectedPhysician] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);
  const [caseDialogOpen, setCaseDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, apptRes] = await Promise.all([
        userService.getAllUsers(),
        calendarManagementService.getAppointments({ status: "scheduled" }),
      ]);
      setData({
        physicians: usersRes.data.filter((u) => u.role === "physician"),
        appointments: apptRes,
      });
    } catch (err) {
      toast.error("Could not load calendar data");
      console.error("Error fetching calendar data:", err);
    } finally {
      setLoading(false);
    }
  };

  const physicianColorMap = useMemo(() => {
    return Object.fromEntries(
      data.physicians.map((p) => [p.userID, p.calendarColor || "#0b8043"]),
    );
  }, [data.physicians]);

  const events = useMemo(() => {
    const toShow = selectedPhysician
      ? data.appointments.filter((a) => a.physicianID === selectedPhysician)
      : data.appointments;

    return toShow.map((a) => ({
      id: a.appointmentID,
      title: a.physicianName || "Appointment",
      start: dayjs(a.scheduledAt).tz(CLINIC_TZ).format("YYYY-MM-DDTHH:mm:ss"),
      end: dayjs(a.scheduledEnd).tz(CLINIC_TZ).format("YYYY-MM-DDTHH:mm:ss"),
      backgroundColor: physicianColorMap[a.physicianID] || "#0b8043",
      borderColor: physicianColorMap[a.physicianID] || "#0b8043",
      extendedProps: { caseID: a.caseID },
    }));
  }, [data.appointments, selectedPhysician, physicianColorMap]);

  const fcView =
    VIEW_MODES.find((m) => m.value === viewMode)?.fcView || "timeGridWeek";

  const handleEventClick = async ({ event }) => {
    const caseID = event.extendedProps.caseID;
    if (!caseID) return;
    try {
      const caseData = await triageCaseService.getCaseById(caseID);
      setSelectedCase(caseData);
      setCaseDialogOpen(true);
    } catch (err) {
      toast.error("Could not load case details");
      console.error("Error loading case from calendar event:", err);
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
                    {data.physicians
                      .filter((p) => p.calendarID)
                      .map((p) => (
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
                              border: `1px solid ${p.calendarColor}40`,
                              bgcolor:
                                selectedPhysician === p.userID
                                  ? `${p.calendarColor}30`
                                  : `${p.calendarColor}12`,
                              cursor: "pointer",
                              transition: "all .15s",
                              outline:
                                selectedPhysician === p.userID
                                  ? `2px solid ${p.calendarColor}80`
                                  : "none",
                            }}
                          >
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                bgcolor: p.calendarColor,
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              variant="caption"
                              fontWeight={600}
                              sx={{ color: p.calendarColor }}
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
                {loading ? (
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
                ) : (
                  <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
                    key={fcView}
                    initialView={fcView}
                    events={events}
                    height="100%"
                    headerToolbar={{
                      left: "prev,next today",
                      center: "title",
                      right: "",
                    }}
                    slotMinTime="08:00:00"
                    slotMaxTime="17:00:00"
                    nowIndicator
                    eventTextColor={APP_COLORS.text.contrastText}
                    eventClick={handleEventClick}
                  />
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
      {selectedCase && (
        <CaseDetailsDialog
          open={caseDialogOpen}
          onClose={() => {
            setCaseDialogOpen(false);
            setSelectedCase(null);
          }}
          caseData={selectedCase}
          onUpdated={() => {
            fetchData();
            setCaseDialogOpen(false);
            setSelectedCase(null);
          }}
        />
      )}
    </>
  );
};
