import Navbar from "../components/Navbar";
import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Tooltip as MuiTooltip,
} from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { analyticsService } from "../api/analyticsService";
import {
  ANALYTICS_KPIS,
  getValueFromPath,
  FEEDBACK_RATING_LABELS,
  ANALYTICS_CASE_COUNTS,
} from "../utils/consts";
import { APP_COLORS } from "../theme";
import LoadingSpinner from "../components/LoadingSpinner";

const RATING_COLORS = [APP_COLORS.status.success, APP_COLORS.status.error]; // up / down

function KpiCard({ label, value, tooltip }) {
  return (
    <MuiTooltip title={tooltip} arrow placement="top">
      <Paper
        elevation={0}
        sx={{
          flex: 1,
          p: 2,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          borderLeftWidth: 4,
          borderLeftColor: "primary.main",
          cursor: "default",
        }}>
        <Typography variant="h4" fontWeight={700} color="primary.main" lineHeight={1}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {label}
        </Typography>
      </Paper>
    </MuiTooltip>
  );
}

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await analyticsService.getAIAnalytics();
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  // KPI DATA
  const kpis = ANALYTICS_KPIS.map((kpi) => {
    const rawValue = getValueFromPath(data, kpi.path);

    let value = rawValue;
    if (kpi.format === "percent") {
      value = `${rawValue}%`;
    }

    return {
      label: kpi.label,
      value,
      tooltip: kpi.tooltip,
    };
  });

  // PIE DATA (Ratings)
  const ratingData = Object.entries(data.ratings).map(([key, value]) => ({
    name: FEEDBACK_RATING_LABELS[key] || key,
    value,
  }));

  // BAR DATA (Tags)
  const tagData = data.tags.map((t) => ({
    name: t.tag,
    count: t.count,
  }));

  // OVERRIDE BAR
  const overrideData = ANALYTICS_CASE_COUNTS.map((item) => ({
    name: item.label,
    count: data.cases[item.key],
  }));

  return (
    <>
      <Navbar />
      <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
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
              <Box sx={{ px: 2.5, py: 2, borderBottom: 1, borderColor: "divider" }}>
                <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                  Analytics
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  AI performance metrics and feedback trends
                </Typography>
              </Box>
              <Box sx={{ p: 3 }}>
                <Box display="flex" gap={2} sx={{ mb: 3 }}>
                  {kpis.map((item, i) => (
                    <KpiCard key={i} label={item.label} value={item.value} tooltip={item.tooltip} />
                  ))}
                </Box>

                <Grid container spacing={3}>
                  {/* Case Override/Feedback Bar */}
                  <Grid item xs={12} md={6}>
                    <Card sx={{ height: 350 }}>
                      <CardContent sx={{ height: "100%", minWidth: 380 }}>
                        <Typography variant="h6" gutterBottom>
                          Cases with Overrides/Feedback{" "}
                        </Typography>
                        <ResponsiveContainer width="80%" height="80%">
                          <BarChart
                            data={overrideData || []}
                            margin={{ top: 4, right: 4, left: 4, bottom: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="name"
                              tick={{ fontSize: 12 }}
                              angle={-45}
                              textAnchor="end"
                              interval={0}
                            />{" "}
                            <YAxis />
                            <Tooltip />
                            <Bar
                              dataKey="count"
                              fill={APP_COLORS.purple[400]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Rating Pie */}
                  <Grid item xs={12} md={6}>
                    <Card sx={{ height: 350 }}>
                      <CardContent sx={{ height: "100%", minWidth: 380 }}>
                        <Typography variant="h6" gutterBottom>
                          Feedback Ratings
                        </Typography>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart
                            margin={{ top: 40, right: 4, left: 4, bottom: 40 }}>
                            <Pie
                              data={ratingData || []}
                              dataKey="value"
                              nameKey="name"
                              outerRadius="80%"
                              label>
                              {ratingData?.map((entry, index) => (
                                <Cell
                                  key={index}
                                  fill={
                                    RATING_COLORS[index % RATING_COLORS.length]
                                  }
                                />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  {/* Tag Bar Chart */}
                  <Grid item xs={12}>
                    <Card sx={{ height: 350 }}>
                      <CardContent sx={{ height: "100%", minWidth: 380 }}>
                        <Typography variant="h6" gutterBottom>
                          Negative Feedback Tag Counts{" "}
                        </Typography>
                        <ResponsiveContainer width="80%" height="80%">
                          <BarChart
                            data={tagData}
                            margin={{ top: 4, right: 4, left: 4, bottom: 80 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="name"
                              tick={{ fontSize: 12 }}
                              angle={-45}
                              textAnchor="end"
                              interval={0}
                            />{" "}
                            <YAxis />
                            <Tooltip />
                            <Bar
                              dataKey="count"
                              fill={APP_COLORS.purple[800]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </>
  );
}
