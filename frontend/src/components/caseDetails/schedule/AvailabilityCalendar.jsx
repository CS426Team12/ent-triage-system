import React from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import dayjs from "dayjs";
import { DURATIONS } from "./SchedulingForm";

const SELECTED_COLOR = primary.main;
const AVAILABLE_COLOR = secondary.main;
const BUSY_COLOR = error.main;

export const addMinutes = (time, mins) => {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

export const AvailabilityCalendar = ({
  physicianID,
  appointmentDate,
  appointmentTime,
  durationMins,
  slots,
  loadingSlots,
  selectedPhysician,
  onTimeSelect,
  errors = {},
}) => {
  const calendarEvents = React.useMemo(() => {
    if (!appointmentDate || !slots.length) return [];
    const dateStr = dayjs(appointmentDate).format("YYYY-MM-DD");
    return slots.map((slot) => ({
      id: slot.time,
      start: `${dateStr}T${slot.time}:00`,
      end: `${dateStr}T${addMinutes(slot.time, 30)}:00`,
      display: "background",
      backgroundColor:
        slot.time === appointmentTime
          ? SELECTED_COLOR
          : slot.available
            ? AVAILABLE_COLOR
            : BUSY_COLOR,
    }));
  }, [slots, appointmentDate, appointmentTime]);

  const selectedEvent = React.useMemo(() => {
    if (!appointmentTime || !appointmentDate) return [];
    const dateStr = dayjs(appointmentDate).format("YYYY-MM-DD");
    return [
      {
        id: "selected",
        start: `${dateStr}T${appointmentTime}:00`,
        end: `${dateStr}T${addMinutes(appointmentTime, durationMins)}:00`,
        title: "Selected",
        backgroundColor: SELECTED_COLOR,
        borderColor: SELECTED_COLOR,
        textColor: "primary.contrastText",
      },
    ];
  }, [appointmentTime, appointmentDate, durationMins]);

  const handleDateClick = (info) => {
    const clickedTime = dayjs(info.date).format("HH:mm");
    const startIndex = slots.findIndex((s) => s.time === clickedTime);
    if (startIndex === -1) return;
    const blocksNeeded = Math.ceil(durationMins / 30);
    for (let i = 0; i < blocksNeeded; i++) {
      if (!slots[startIndex + i]?.available) return;
    }
    onTimeSelect(clickedTime);
  };

  return (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h8" sx={{ fontWeight: 600 }}>
        Availability
      </Typography>
      {!physicianID || !appointmentDate ? (
        <Typography variant="body2" color="textSecondary">
          Select a physician and date to see availability.
        </Typography>
      ) : loadingSlots ? (
        <Box display="flex" alignItems="center" gap={1}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="textSecondary">
            Checking availability...
          </Typography>
        </Box>
      ) : (
        <>
          <Box display="flex" flexDirection="row" gap={2}>
            {[
              {
                color: AVAILABLE_COLOR,
                border: null,
                label: "Available",
              },
              { color: BUSY_COLOR, border: null, label: "Busy" },
              { color: SELECTED_COLOR, border: null, label: "Selected" },
            ].map(({ color, border, label }) => (
              <Box key={label} display="flex" alignItems="center" gap={0.5}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: 1,
                    bgcolor: color,
                    border,
                  }}
                />
                <Typography variant="caption" color="textSecondary">
                  {label}
                </Typography>
              </Box>
            ))}
          </Box>
          <Box sx={{ height: 400 }}>
            <FullCalendar
              plugins={[timeGridPlugin, interactionPlugin]}
              initialView="timeGridDay"
              initialDate={dayjs(appointmentDate).format("YYYY-MM-DD")}
              key={`${physicianID}-${dayjs(appointmentDate).format("YYYY-MM-DD")}`}
              events={[...calendarEvents, ...selectedEvent]}
              dateClick={handleDateClick}
              height="100%"
              headerToolbar={false}
              slotMinTime="08:00:00"
              slotMaxTime="17:00:00"
              slotDuration="00:30:00"
              allDaySlot={false}
              eventTextColor="primary.contrastText"
            />
          </Box>
          {errors.appointmentTime && (
            <Typography variant="caption" color="error">
              {errors.appointmentTime}
            </Typography>
          )}
          {appointmentTime && (
            <Typography variant="body2">
              <strong>
                Dr. {selectedPhysician?.firstName} {selectedPhysician?.lastName}
              </strong>
              {" · "}
              {dayjs(appointmentDate).format("MM/DD/YYYY")}
              {" at "}
              {dayjs(`2000-01-01T${appointmentTime}`).format("h:mm A")}
              {" · "}
              {DURATIONS.find((d) => d.value === durationMins)?.label}
            </Typography>
          )}
        </>
      )}
    </Box>
  );
};
