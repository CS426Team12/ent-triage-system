import React from "react";
import {
  Grid,
  Typography,
  Box,
  Paper,
  Stack,
  Tabs,
  Tab,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Refresh } from "@mui/icons-material";
import SearchableDataGrid from "../components/grid/SearchableDataGrid";
import { unreviewedColDefs } from "../utils/coldefs/unreviewedTriageCases";
import { reviewedColDefs } from "../utils/coldefs/reviewedTriageCases";
import { CaseDetailsDialog } from "../components/caseDetails/CaseDetailsDialog";
import Navbar from "../components/Navbar";
import { STATUS_VALUES, URGENCY_VALUES } from "../utils/consts";
import { triageCaseService } from "../api/triageCaseService";
import { toast } from "../utils/toast";
import dayjs from "dayjs";

function StatCard({ label, value, color }) {
  return (
    <Paper
      elevation={0}
      sx={{
        flex: 1,
        p: 2,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        borderLeftWidth: 4,
        borderLeftColor: color,
      }}
    >
      <Typography variant="h4" fontWeight={700} color={color} lineHeight={1}>
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {label}
      </Typography>
    </Paper>
  );
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [cases, setCases] = React.useState([]);
  const [selectedCase, setSelectedCase] = React.useState(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [lastUpdated, setLastUpdated] = React.useState(null);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleRowClick = (params) => {
    setSelectedCase(params.data);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const fetchCases = async (refreshCaseId) => {
    try {
      setLoading(true);
      const results = await triageCaseService.getAllCases();
      const newCases = results.cases || [];
      setCases(newCases);
      setLastUpdated(dayjs().format("h:mm A"));
      if (refreshCaseId) {
        const refreshed = newCases.find((c) => c.caseID === refreshCaseId);
        if (refreshed) setSelectedCase(refreshed);
      }
    } catch (err) {
      toast.error("Failed to load cases, please refresh.");
      console.error("Error fetching cases:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchCases();
  }, []);

  const unreviewedCases = React.useMemo(() => {
    if (!cases) return [];
    return cases.filter((c) => c.status !== STATUS_VALUES.REVIEWED);
  }, [cases]);

  const reviewedCases = React.useMemo(() => {
    if (!cases) return [];
    return cases.filter((c) => c.status === STATUS_VALUES.REVIEWED);
  }, [cases]);

  const urgentCount = React.useMemo(
    () =>
      unreviewedCases.filter(
        (c) => (c.overrideUrgency || c.AIUrgency) === URGENCY_VALUES.URGENT
      ).length,
    [unreviewedCases]
  );

  const semiUrgentCount = React.useMemo(
    () =>
      unreviewedCases.filter(
        (c) => (c.overrideUrgency || c.AIUrgency) === URGENCY_VALUES.SEMI_URGENT
      ).length,
    [unreviewedCases]
  );

  return (
    <>
      <Navbar />
      <Box sx={{ bgcolor: "background.default", minHeight: "calc(100vh - 65px)" }}>
        <Box sx={{ p: 3 }}>
          {/* Stat cards */}
          <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
            <StatCard
              label="Total Unreviewed"
              value={unreviewedCases.length}
              color="primary.main"
            />
            <StatCard
              label="Urgent"
              value={urgentCount}
              color="error.main"
            />
            <StatCard
              label="Semi-Urgent"
              value={semiUrgentCount}
              color="warning.main"
            />
            <StatCard
              label="Reviewed"
              value={reviewedCases.length}
              color="success.main"
            />
          </Stack>

          {/* Main table card */}
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
                    Triage Cases
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Review and manage incoming patient triage cases
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  {lastUpdated && (
                    <Typography variant="caption" color="text.secondary">
                      Updated {lastUpdated}
                    </Typography>
                  )}
                  <Tooltip title="Refresh">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => fetchCases()}
                        disabled={loading}
                      >
                        <Refresh fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </Stack>
            </Box>

            {/* Tabs */}
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.paper", px: 1 }}
            >
              <Tab
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <span>Unreviewed</span>
                    <Chip
                      label={unreviewedCases.length}
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
                    <span>Reviewed</span>
                    <Chip
                      label={reviewedCases.length}
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
            <Box sx={{ height: "65vh", p: 2 }}>
              {activeTab === 0 && (
                <SearchableDataGrid
                  rowData={unreviewedCases || []}
                  columnDefs={unreviewedColDefs()}
                  loading={loading}
                  onRowClicked={handleRowClick}
                  noRowsMessage="No unreviewed cases"
                />
              )}
              {activeTab === 1 && (
                <SearchableDataGrid
                  rowData={reviewedCases || []}
                  columnDefs={reviewedColDefs()}
                  loading={loading}
                  onRowClicked={handleRowClick}
                  noRowsMessage="No reviewed cases"
                />
              )}
            </Box>
          </Paper>
        </Box>

        <CaseDetailsDialog
          open={dialogOpen}
          onClose={handleDialogClose}
          caseData={selectedCase}
          onUpdated={fetchCases}
        />
      </Box>
    </>
  );
}
