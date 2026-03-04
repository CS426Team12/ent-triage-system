import apiClient from "./axios";

class AppointmentService {
  async getAvailability(physicianID, date) {
    const res = await apiClient.get("/appointments/availability", {
      params: { physicianID, date },
    });
    return res.data; // { physicianID, physicianName, date, slots: [{ time, available }] }
  }

  async getAppointments({ caseID, physicianID, status } = {}) {
    const res = await apiClient.get("/appointments/", {
      params: {
        ...(caseID      && { caseID }),
        ...(physicianID && { physicianID }),
        ...(status      && { status }),
      },
    });
    return res.data;
  }

  async getAppointmentById(appointmentID) {
    const res = await apiClient.get(`/appointments/${appointmentID}`);
    return res.data;
  }

  async createAppointment({ caseID, physicianID, scheduledAt, scheduledEnd }) {
    const res = await apiClient.post("/appointments/", {
      caseID,
      physicianID,
      scheduledAt,
      scheduledEnd,
    });
    return res.data; // { appointmentID, gcalEventId, scheduledAt, scheduledEnd, physicianName }
  }

  async rescheduleAppointment(appointmentID, { scheduledAt, scheduledEnd, physicianID } = {}) {
    const res = await apiClient.patch(`/appointments/${appointmentID}`, {
      ...(scheduledAt  && { scheduledAt }),
      ...(scheduledEnd && { scheduledEnd }),
      ...(physicianID  && { physicianID }),
    });
    return res.data;
  }

  async cancelAppointment(appointmentID, cancelReason = null) {
    const res = await apiClient.delete(`/appointments/${appointmentID}`, {
      data: { cancelReason },
    });
    return res.data;
  }
}

export const appointmentService = new AppointmentService();
export default AppointmentService;