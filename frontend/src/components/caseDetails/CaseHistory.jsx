import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Chip,
  Paper,
  Stack,
  Autocomplete,
  TextField,
  Button,
  Pagination,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
} from "@mui/material";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from "@mui/lab";
import { useTriageCases } from "../../context/TriageCaseContext";
import { usePatients } from "../../context/PatientContext";
import {
  FIELD_LABELS,
  URGENCY_LABELS,
  STATUS_LABELS,
  RETURNING_PATIENT_OPTIONS,
} from "../../utils/consts";
import dayjs from "dayjs";
import { stringToBool } from "../../utils/utils";

const HISTORY_VIEWS = {
  COMBINED: "combined",
  CASE: "case",
  PATIENT: "patient",
};

export const CaseHistory = ({ caseId, patientId }) => {
  const [historyView, setHistoryView] = useState(HISTORY_VIEWS.COMBINED);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  // pagination stuff
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const { fetchCaseChangelog } = useTriageCases();
  const { fetchPatientChangelog } = usePatients();

  useEffect(() => {
    if (caseId && patientId) {
      loadHistory();
    }
  }, [caseId, patientId]);

  // reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [historyView, selectedUsers, selectedFields, startDate, endDate]);

  const handlePageChange = (event, value) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleItemsPerPageChange = (event) => {
    setItemsPerPage(event.target.value);
    setPage(1);
  };

  const loadHistory = async () => {
    if (!caseId || !patientId) return;
    setLoading(true);
    try {
      const [caseHistory, patientHistory] = await Promise.all([
        fetchCaseChangelog(caseId),
        fetchPatientChangelog(patientId),
      ]);

      const caseEntries = (caseHistory || []).map((entry) => ({
        ...entry,
        source: HISTORY_VIEWS.CASE,
        entityType: "Case Details",
      }));

      const patientEntries = (patientHistory || []).map((entry) => ({
        ...entry,
        source: HISTORY_VIEWS.PATIENT,
        entityType: "Patient",
      }));

      const combined = [...caseEntries, ...patientEntries].sort(
        (a, b) => new Date(b.changedAt) - new Date(a.changedAt),
      );

      setHistory(combined);
    } catch (error) {
      console.error("Failed to load history:", error);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleHistoryViewChange = (event, newView) => {
    if (newView !== null) {
      setHistoryView(newView);
    }
  };

  const getDisplayLabel = (fieldName) => {
    return FIELD_LABELS[fieldName] || fieldName;
  };

  const getDisplayValue = (fieldName, value) => {
    if (value === null || value === undefined || value === "") {
      return "(empty)";
    }

    if (fieldName === "overrideUrgency" || fieldName === "AIUrgency") {
      return URGENCY_LABELS[value] || value;
    }

    if (fieldName === "status") {
      return STATUS_LABELS[value] || value;
    }

    if (typeof value === "string" && Date.parse(value)) {
      return dayjs(value).format("MM/DD/YYYY, h:mm A");
    }

    if (fieldName === "returningPatient") {
      const val = stringToBool(value);
      const option = RETURNING_PATIENT_OPTIONS.find((o) => o.value === val);
      return option ? option.label : value;
    }

    return value;
  };

  const groupByTimestamp = (history) => {
    if (history.length === 0) return [];

    const grouped = {};

    history.forEach((entry) => {
      const roundedTimestamp = dayjs(entry.changedAt)
        .startOf("minute")
        .toISOString();

      if (!grouped[roundedTimestamp]) {
        grouped[roundedTimestamp] = {
          periodStart: roundedTimestamp,
          periodEnd: roundedTimestamp,
          changes: [],
        };
      }

      grouped[roundedTimestamp].changes.push(entry);
    });

    return Object.values(grouped).sort(
      (a, b) => new Date(b.periodStart) - new Date(a.periodStart),
    );
  };

  const availableUsers = useMemo(() => {
    const users = new Set(history.map((entry) => entry.changedByEmail));
    return Array.from(users).sort();
  }, [history]);

  const availableFields = useMemo(() => {
    const fields = new Set(history.map((entry) => entry.fieldName));
    return Array.from(fields)
      .map((fieldName) => ({
        value: fieldName,
        label: getDisplayLabel(fieldName),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [history]);

  const filteredHistory = useMemo(() => {
    return history.filter((entry) => {
      if (historyView !== "combined" && entry.source !== historyView) {
        return false;
      }
      if (
        selectedUsers.length > 0 &&
        !selectedUsers.includes(entry.changedByEmail)
      ) {
        return false;
      }
      if (
        selectedFields.length > 0 &&
        !selectedFields.includes(entry.fieldName)
      ) {
        return false;
      }

      const entryDate = dayjs(entry.changedAt);
      if (startDate && entryDate.isBefore(dayjs(startDate))) {
        return false;
      }
      if (endDate && entryDate.isAfter(dayjs(endDate))) {
        return false;
      }

      return true;
    });
  }, [history, historyView, selectedUsers, selectedFields, startDate, endDate]);

  const groupedHistory = useMemo(() => {
    return groupByTimestamp(filteredHistory);
  }, [filteredHistory]);

  const paginatedGroups = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return groupedHistory.slice(startIndex, endIndex);
  }, [groupedHistory, page, itemsPerPage]);

  const totalPages = Math.ceil(groupedHistory.length / itemsPerPage);

  const hasActiveFilters =
    selectedUsers.length > 0 ||
    selectedFields.length > 0 ||
    startDate !== null ||
    endDate !== null;

  const clearAllFilters = () => {
    setSelectedUsers([]);
    setSelectedFields([]);
    setStartDate(null);
    setEndDate(null);
  };

  if (loading) {
    return (
      <Grid
        container
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={400}
      >
        <CircularProgress />
      </Grid>
    );
  }

  return (
    <Grid container direction="column" spacing={2}>
      <Stack spacing={2}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h8" sx={{ fontWeight: 600 }}>
            Change History
          </Typography>
        </Stack>
        <Stack direction="row" spacing={2}>
          <DateTimePicker
            label="Start Date"
            value={startDate}
            onChange={(newValue) => setStartDate(newValue)}
            slotProps={{
              textField: {
                size: "small",
                fullWidth: true,
              },
              actionBar: {
                actions: ["clear", "accept"],
              },
            }}
          />
          <DateTimePicker
            label="End Date"
            value={endDate}
            onChange={(newValue) => setEndDate(newValue)}
            slotProps={{
              textField: {
                size: "small",
                fullWidth: true,
              },
              actionBar: {
                actions: ["clear", "accept"],
              },
            }}
            minDateTime={startDate}
          />
        </Stack>
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          justifyContent="flex-end"
        >
          <Autocomplete
            multiple
            size="small"
            options={availableUsers}
            value={selectedUsers}
            onChange={(event, newValue) => setSelectedUsers(newValue)}
            renderInput={(params) => <TextField {...params} label="User" />}
            slotProps={{
              popper: {
                style: {
                  width: "fit-content",
                },
              },
            }}
          />
          <Autocomplete
            multiple
            size="small"
            options={availableFields.map((f) => f.value)}
            value={selectedFields}
            onChange={(event, newValue) => setSelectedFields(newValue)}
            getOptionLabel={(option) => {
              const field = availableFields.find((f) => f.value === option);
              return field ? field.label : option;
            }}
            renderInput={(params) => <TextField {...params} label="Field" />}
            slotProps={{
              popper: {
                style: {
                  width: "fit-content",
                },
              },
            }}
          />
          <ToggleButtonGroup
            value={historyView}
            exclusive
            onChange={handleHistoryViewChange}
            size="small"
          >
            <ToggleButton value={HISTORY_VIEWS.COMBINED}>
              All Changes
            </ToggleButton>
            <ToggleButton value={HISTORY_VIEWS.CASE}>Case Only</ToggleButton>
            <ToggleButton value={HISTORY_VIEWS.PATIENT}>
              Patient Only
            </ToggleButton>
          </ToggleButtonGroup>
          {hasActiveFilters && (
            <Button onClick={clearAllFilters} size="small" variant="contained">
              Clear Filters
            </Button>
          )}
        </Stack>
      </Stack>
      {paginatedGroups.length === 0 ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight={200}
          py={4}
        >
          <Typography color="text.secondary">
            No change history available
          </Typography>
        </Box>
      ) : (
        <>
          <Timeline position="right" sx={{ mt: 3 }}>
            {paginatedGroups.map((group, groupIndex) => {
              const periodTime = dayjs(group.periodStart);
              const hasMultipleChanges = group.changes.length > 1;
              const uniqueUsers = [
                ...new Set(group.changes.map((c) => c.changedByEmail)),
              ];
              return (
                <TimelineItem key={groupIndex}>
                  <TimelineOppositeContent
                    color="text.secondary"
                    sx={{ flex: 0.15, minWidth: 100 }}
                  >
                    <Typography variant="caption" fontWeight={600}>
                      {periodTime.format("MMM D, YYYY")}
                    </Typography>
                    <Typography variant="caption" display="block">
                      {periodTime.format("h:mm A")}
                    </Typography>
                  </TimelineOppositeContent>
                  <TimelineSeparator>
                    <TimelineDot color="primary" />
                    {groupIndex < paginatedGroups.length - 1 && (
                      <TimelineConnector />
                    )}
                  </TimelineSeparator>
                  <TimelineContent sx={{ flex: 1 }}>
                    <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
                      <Stack spacing={2}>
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          justifyContent="space-between"
                        >
                          <Typography variant="body2" color="text.secondary">
                            {hasMultipleChanges ? (
                              <>
                                {group.changes.length} change
                                {group.changes.length > 1 ? "s" : ""}
                                {uniqueUsers.length > 1 &&
                                  ` by ${uniqueUsers.length} users`}
                              </>
                            ) : (
                              group.changes[0].changedByEmail
                            )}
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={0.5}
                            alignItems="center"
                          >
                            {group.changes
                              .map((c) => c.entityType)
                              .filter((v, i, a) => a.indexOf(v) === i)
                              .map((type) => (
                                <Chip
                                  key={type}
                                  label={type}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                              ))}
                          </Stack>
                        </Stack>
                        <Stack spacing={2}>
                          {group.changes.map((change, changeIndex) => (
                            <Box key={change.id || changeIndex}>
                              <Stack spacing={1}>
                                {hasMultipleChanges && (
                                  <Typography
                                    variant="caption"
                                    fontWeight={600}
                                    color="text.secondary"
                                  >
                                    {change.changedByEmail}
                                  </Typography>
                                )}
                                <Typography variant="body2" fontWeight={600}>
                                  {getDisplayLabel(change.fieldName)}
                                </Typography>
                                <Stack
                                  direction="row"
                                  spacing={1}
                                  alignItems="center"
                                  flexWrap="wrap"
                                >
                                  <Chip
                                    label={getDisplayValue(
                                      change.fieldName,
                                      change.oldValue,
                                    )}
                                    size="small"
                                    sx={{
                                      bgcolor: "grey.100",
                                      fontFamily: "monospace",
                                      fontSize: "0.75rem",
                                    }}
                                  />
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    →
                                  </Typography>
                                  <Chip
                                    label={getDisplayValue(
                                      change.fieldName,
                                      change.newValue,
                                    )}
                                    size="small"
                                    sx={{
                                      bgcolor: "primary.50",
                                      color: "primary.main",
                                      fontFamily: "monospace",
                                      fontSize: "0.75rem",
                                      fontWeight: 600,
                                    }}
                                  />
                                </Stack>
                              </Stack>
                            </Box>
                          ))}
                        </Stack>
                      </Stack>
                    </Paper>
                  </TimelineContent>
                </TimelineItem>
              );
            })}
          </Timeline>
          <Grid
            container
            spacing={2}
            justifyContent="flex-end"
            alignItems="center"
          >
            <Grid item>
              <Typography variant="body2" color="text.secondary">
                Showing {(page - 1) * itemsPerPage + 1}-
                {Math.min(page * itemsPerPage, groupedHistory.length)} of{" "}
                {groupedHistory.length}
              </Typography>
            </Grid>
            <Grid item>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Per Page</InputLabel>
                <Select
                  value={itemsPerPage}
                  label="Per Page"
                  onChange={handleItemsPerPageChange}
                >
                  <MenuItem value={5}>5</MenuItem>
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={20}>20</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item>
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Grid>
          </Grid>
        </>
      )}
    </Grid>
  );
};
