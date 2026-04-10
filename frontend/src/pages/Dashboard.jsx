import React from "react";
import { Grid, Typography, Box, Paper, Stack, Tabs, Tab } from "@mui/material";
import { Assessment } from "@mui/icons-material";
import SearchableDataGrid from "../components/grid/SearchableDataGrid";
import { unreviewedColDefs } from "../utils/coldefs/unreviewedTriageCases";
import { reviewedColDefs } from "../utils/coldefs/reviewedTriageCases";
import { CaseDetailsDialog } from "../components/caseDetails/CaseDetailsDialog";
import Navbar from "../components/Navbar";
import { STATUS_VALUES } from "../utils/consts";
import { triageCaseService } from "../api/triageCaseService";
import { toast } from "../utils/toast";

export default function Dashboard() {
  const [activeTab, setActiveTab] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [cases, setCases] = React.useState([]);
  const [selectedCase, setSelectedCase] = React.useState(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

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
                    <Assessment sx={{ fontSize: 24, color: "white" }} />
                  </Box>
                  <Typography
                    variant="h5"
                    color="text.primary"
                    sx={{ fontWeight: 600 }}
                  >
                    Dashboard
                  </Typography>
                </Stack>
              </Box>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                sx={{
                  borderBottom: 1,
                  borderColor: "divider",
                  bgcolor: "background.paper",
                }}
              >
                <Tab
                  label={`Unreviewed Cases (${unreviewedCases?.length || 0})`}
                  sx={{ textTransform: "none", fontWeight: 500 }}
                />
                <Tab
                  label={`Reviewed Cases (${reviewedCases?.length || 0})`}
                  sx={{ textTransform: "none", fontWeight: 500 }}
                />
              </Tabs>
              <Box sx={{ height: "70vh", p: 2 }}>
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
              <CaseDetailsDialog
                open={dialogOpen}
                onClose={handleDialogClose}
                caseData={selectedCase}
                onUpdated={fetchCases}
              />
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </>
  );
}
