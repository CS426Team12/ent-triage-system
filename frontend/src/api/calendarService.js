import apiClient from "./axios";

class CalendarManagementService {
  async createPhysicianCalendar(physicianID) {
    const res = await apiClient.post(`/calendar/physicians/${physicianID}/create`);
    return res.data;
  }

  async attachPhysicianCalendar(physicianID, calendarID, color) {
    const res = await apiClient.post(`/calendar/physicians/${physicianID}/attach`, {
      calendarID,
      ...(color && { color }),
    });
    return res.data;
  }

  async updateCalendarColor(physicianID, color) {
    const res = await apiClient.patch(`/calendar/physicians/${physicianID}/color`, { color });
    return res.data;
  }

  async getAvailability(physicianID, date) {
    const res = await apiClient.get("/calendar/availability", {
      params: { physicianID, date },
    });
    return res.data;
  }

  async getAppointments({ caseID, physicianID, status } = {}) {
    const res = await apiClient.get("/calendar/", {
      params: {
        ...(caseID && { caseID }),
        ...(physicianID && { physicianID }),
        ...(status && { status }),
      },
    });
    return res.data;
  }

  async getAppointmentById(appointmentID) {
    const res = await apiClient.get(`/calendar/${appointmentID}`);
    return res.data;
  }

  async createAppointment({ caseID, physicianID, scheduledAt, scheduledEnd }) {
    const res = await apiClient.post("/calendar/", {
      caseID,
      physicianID,
      scheduledAt,
      scheduledEnd,
    });
    return res.data;
  }

  async rescheduleAppointment(appointmentID, { scheduledAt, scheduledEnd, physicianID } = {}) {
    const res = await apiClient.patch(`/calendar/${appointmentID}`, {
      ...(scheduledAt && { scheduledAt }),
      ...(scheduledEnd && { scheduledEnd }),
      ...(physicianID && { physicianID }),
    });
    return res.data;
  }

  async cancelAppointment(appointmentID, cancelReason = null) {
    const res = await apiClient.delete(`/calendar/${appointmentID}`, {
      data: { cancelReason },
    });
    return res.data;
  }
}

export const calendarManagementService = new CalendarManagementService();
export default CalendarManagementService;