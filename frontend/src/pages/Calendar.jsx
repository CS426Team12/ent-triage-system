import Navbar from "../components/Navbar";
import { useEffect, useState, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  IconButton,
} from "@mui/material";
import { CalendarMonth, Refresh } from "@mui/icons-material";
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
import { useAuth } from "../context/AuthContext";

dayjs.extend(utc);
dayjs.extend(timezone);

const CLINIC_TZ = "America/Los_Angeles";

const VIEW_MODES = [
  { value: "WEEK", label: "Week", fcView: "timeGridWeek" },
  { value: "MONTH", label: "Month", fcView: "dayGridMonth" },
  { value: "AGENDA", label: "Agenda", fcView: "listWeek" },
];

export const Calendar = () => {
  const { user } = useAuth();
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
      <Box sx={{ bgcolor: "background.default", minHeight: "calc(100vh - 65px)" }}>
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
            {/* Header */}
            <Box sx={{ px: 2.5, py: 2, borderBottom: 1, borderColor: "divider" }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                    Schedule
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    View and manage physician appointments
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  {/* Physician filter pills */}
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
                                selectedPhysician === p.userID ? null : p.userID,
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
                              {p.userID === user?.userID ? " (You)" : ""}
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
                  <Tooltip title="Refresh">
                    <span>
                      <IconButton size="small" onClick={fetchData} disabled={loading}>
                        <Refresh fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </Stack>
            </Box>

            {/* Calendar body */}
            <Box sx={{ height: "75vh", p: 2 }}>
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
        </Box>
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
