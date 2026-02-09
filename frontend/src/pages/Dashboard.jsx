import React from "react";
import { Grid, Typography, Box, Paper, Stack, Tabs, Tab } from "@mui/material";
import { Assessment } from "@mui/icons-material";
import SearchableDataGrid from "../components/grid/SearchableDataGrid";
import mockData from "../../mockData/triageCaseMockData.json";
import { unreviewedColDefs } from "../utils/coldefs/unreviewedTriageCases";
import { reviewedColDefs } from "../utils/coldefs/reviewedTriageCases";
import Navbar from "../components/Navbar";
import { useTriageCases } from "../context/TriageCaseContext";

export default function Dashboard() {
  const { cases, fetchCases, getUnreviewedCases, getReviewedCases } =
    useTriageCases();
  const [activeTab, setActiveTab] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  React.useEffect(() => {
    const getCases = async () => {
      console.log("Fetching cases");
      setLoading(true);
      try {
        await fetchCases();
      } catch (err) {
        console.error("Failed to fetch cases", err);
      } finally {
        setLoading(false);
      }
    };
    if (cases.length === 0) {
      getCases();
    }
  }, [fetchCases]);

  const unreviewedCases = React.useMemo(() => {
    return getUnreviewedCases();
  }, [getUnreviewedCases]);

  const reviewedCases = React.useMemo(() => {
    return getReviewedCases();
  }, [getReviewedCases]);

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
                    <Assessment sx={{ fontSize: 24, color: "white" }} />
                  </Box>
                  <Typography
                    variant="h5"
                    color="text.primary"
                    sx={{ fontWeight: 600 }}>
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
                }}>
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
                    columnDefs={unreviewedColDefs}
                    loading={loading}
                  />
                )}
                {activeTab === 1 && (
                  <SearchableDataGrid
                    rowData={reviewedCases || []}
                    columnDefs={reviewedColDefs}
                    loading={loading}
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
